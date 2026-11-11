import "server-only";
import { registrarEventoAuth } from "@/lib/airtable/auth-logs";
import { revocarTodosDelUsuario } from "@/lib/airtable/refresh-tokens";
import {
  actualizarUsuario,
  getUsuarioPorEmail,
  getUsuarioPorResetHash,
  type UsuarioAuth,
} from "@/lib/airtable/usuarios";
import { enviarCorreo, plantillaRestablecer } from "@/lib/email";
import {
  MAX_INTENTOS_RESET_POR_IP,
  MAX_RESETS_POR_EMAIL,
  MAX_RESETS_POR_IP,
  VENTANA_INTENTOS_RESET_IP_MS,
  VENTANA_RESETS_EMAIL_MS,
  VENTANA_RESETS_IP_MS,
  VIGENCIA_RESET_MS,
  urlAplicacion,
} from "./constantes";
import { estaEnHistorial, hashPassword, nuevoHistorial, validarPoliticaPassword } from "./password";
import * as rateLimit from "./rate-limit";
import { claveEmail, generarTokenSeguro, hashesIguales, sha256 } from "./tokens";

interface Contexto {
  ip: string;
  userAgent: string;
}

/** Genera un token de un solo uso, guarda SOLO su hash y devuelve el enlace con el token en claro. */
async function generarEnlace(usuario: UsuarioAuth, vigenciaMs: number): Promise<string> {
  const token = generarTokenSeguro(); // crypto.randomBytes(32)
  // Sobrescribir el hash invalida cualquier enlace anterior del mismo usuario
  await actualizarUsuario(usuario.id, {
    resetTokenHash: sha256(token),
    resetTokenExpires: Date.now() + vigenciaMs,
  });
  return `${urlAplicacion()}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

// ─── Solicitud ────────────────────────────────────────────────────────

export type ResultadoLimiteReset = { permitido: true } | { permitido: false; reintentarEnMs: number };

/**
 * Comprueba los límites ANTES de buscar el email: el conteo es igual exista o no la cuenta,
 * así que un 429 no revela nada sobre su existencia.
 */
export async function verificarLimitesReset(email: string, ip: string): Promise<ResultadoLimiteReset> {
  const porIp = await rateLimit.consumir(`reset-ip:${ip}`, MAX_RESETS_POR_IP, VENTANA_RESETS_IP_MS);
  if (!porIp.permitido) return { permitido: false, reintentarEnMs: porIp.reintentarEnMs };
  const porEmail = await rateLimit.consumir(`reset-email:${claveEmail(email)}`, MAX_RESETS_POR_EMAIL, VENTANA_RESETS_EMAIL_MS);
  if (!porEmail.permitido) return { permitido: false, reintentarEnMs: porEmail.reintentarEnMs };
  return { permitido: true };
}

/**
 * Procesa la solicitud de restablecimiento. Se ejecuta con after(), es decir, DESPUÉS de responder
 * al cliente: la respuesta y su latencia son idénticas exista o no el email.
 */
export async function procesarSolicitudReset(email: string, ctx: Contexto): Promise<void> {
  try {
    const usuario = await getUsuarioPorEmail(email);
    if (!usuario || !usuario.activo) {
      await registrarEventoAuth({ evento: "reset_rechazado", email, ...ctx, exito: false, detalle: "Email no registrado o cuenta inactiva" });
      return;
    }
    if (usuario.lockedPermanently) {
      // Un bloqueo permanente solo lo levanta un administrador: restablecer la clave no lo eludiría
      await registrarEventoAuth({ evento: "reset_rechazado", email, usuarioId: usuario.id, ...ctx, exito: false, detalle: "Cuenta con bloqueo permanente" });
      return;
    }

    const url = await generarEnlace(usuario, VIGENCIA_RESET_MS);
    const enviado = await enviarCorreo({
      para: usuario.email,
      ...plantillaRestablecer({ nombre: usuario.nombre, url, vigenciaMinutos: VIGENCIA_RESET_MS / 60_000 }),
    });
    await registrarEventoAuth({
      evento: "reset_solicitado",
      email,
      usuarioId: usuario.id,
      ...ctx,
      exito: enviado,
      detalle: enviado ? "Correo de restablecimiento enviado" : "No fue posible enviar el correo",
    });
  } catch (error) {
    console.error("[reset] Error procesando la solicitud:", (error as Error).message);
  }
}


// ─── Validación del token ─────────────────────────────────────────────

/** Devuelve la cuenta si el token es válido y no ha vencido (no modifica nada). */
export async function validarTokenReset(token: string): Promise<UsuarioAuth | null> {
  const hash = sha256(token);
  const usuario = await getUsuarioPorResetHash(hash);
  if (!usuario || !hashesIguales(hash, usuario.resetTokenHash)) return null;
  if (!usuario.resetTokenExpires || usuario.resetTokenExpires <= Date.now()) return null;
  if (!usuario.activo || usuario.lockedPermanently) return null;
  return usuario;
}

// ─── Cambio de contraseña ─────────────────────────────────────────────

export type ResultadoReset =
  | { ok: true }
  | { ok: false; estado: 400 | 429; error: string; detalles?: Record<string, string[]> };

const ENLACE_INVALIDO = "El enlace no es válido o ya expiró. Solicita uno nuevo.";

export async function restablecerPassword(token: string, password: string, ctx: Contexto): Promise<ResultadoReset> {
  const limite = await rateLimit.consumir(`reset-try:${ctx.ip}`, MAX_INTENTOS_RESET_POR_IP, VENTANA_INTENTOS_RESET_IP_MS);
  if (!limite.permitido) {
    return { ok: false, estado: 429, error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }

  const usuario = await validarTokenReset(token);
  if (!usuario) return { ok: false, estado: 400, error: ENLACE_INVALIDO };

  // Política completa: reglas + datos personales + lista de contraseñas comunes
  const errores = validarPoliticaPassword(password, { email: usuario.email, nombre: usuario.nombre });
  if (errores.length) {
    return { ok: false, estado: 400, error: "La contraseña no cumple la política", detalles: { password: errores } };
  }
  if (await estaEnHistorial(password, usuario.passwordHash, usuario.previousPasswordHashes)) {
    return {
      ok: false,
      estado: 400,
      error: "La contraseña no cumple la política",
      detalles: { password: ["No puedes reutilizar ninguna de tus últimas 3 contraseñas"] },
    };
  }

  const nuevoHash = await hashPassword(password);
  const ahora = Date.now();

  // Una sola escritura: nueva clave + historial + token consumido (single-use) + contadores en cero
  await actualizarUsuario(usuario.id, {
    passwordHash: nuevoHash,
    previousPasswordHashes: nuevoHistorial(usuario.passwordHash, usuario.previousPasswordHashes),
    resetTokenHash: "",
    resetTokenExpires: 0,
    failedLoginAttempts: 0,
    failedWindowStart: 0,
    totalFailedAttempts: 0,
    lockedUntil: 0,
    lastPasswordChange: ahora,
  });

  // Cierra todas las sesiones: se revocan los refresh tokens y los access tokens emitidos antes de
  // last_password_change dejan de aceptarse en /api/auth/me y en la rotación
  const revocadas = await revocarTodosDelUsuario(usuario.id, "password");

  await registrarEventoAuth({
    evento: "password_cambiado",
    email: usuario.email,
    usuarioId: usuario.id,
    ...ctx,
    exito: true,
    detalle: `Contraseña restablecida. Sesiones revocadas: ${revocadas}`,
  });

  return { ok: true };
}
