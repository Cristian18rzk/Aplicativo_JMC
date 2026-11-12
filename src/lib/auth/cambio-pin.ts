import "server-only";
import { randomInt } from "node:crypto";
import { registrarEventoAuth } from "@/lib/airtable/auth-logs";
import { revocarTodosDelUsuario } from "@/lib/airtable/refresh-tokens";
import { actualizarUsuario, getUsuarioPorTokenCambio, type UsuarioAuth } from "@/lib/airtable/usuarios";
import {
  MAX_INTENTOS_CAMBIO_PIN_POR_IP,
  VENTANA_INTENTOS_CAMBIO_PIN_IP_MS,
  VIGENCIA_CAMBIO_PIN_MS,
  VIGENCIA_PIN_TEMPORAL_MS,
} from "./constantes";
import { hashPassword } from "./password";
import { LONGITUD_PIN_TEMPORAL, erroresPin } from "./pin";
import * as rateLimit from "./rate-limit";
import { generarTokenSeguro, hashesIguales, sha256 } from "./tokens";

/**
 * Ciclo de vida del PIN (sin correo):
 *  - Primer ingreso: la cuenta se crea sin PIN. Al ingresar con su cédula (el PIN se deja vacío), el
 *    login no abre sesión sino que emite el token de un solo uso para crearlo.
 *  - Olvidó el PIN: el admin genera un PIN temporal de 6 dígitos desde la ficha y lo entrega en persona;
 *    al entrar con él, el login no abre sesión sino que emite el mismo token de un solo uso.
 *  - Con el token (cookie HttpOnly, 15 min) crea su PIN de 4 dígitos en /auth/crear-pin; se cierran
 *    todas las sesiones y ya puede ingresar.
 */

interface Contexto {
  ip: string;
  userAgent: string;
}

// ─── 1. PIN temporal (admin) ──────────────────────────────────────────

export interface PinTemporal {
  pin: string;
  expira: number;
}

/**
 * Genera un PIN temporal y lo deja como único secreto válido de la cuenta. También levanta cualquier
 * bloqueo por intentos fallidos (es el "desbloqueo manual" del admin) y cierra las sesiones abiertas.
 * El PIN en claro solo se devuelve aquí, una vez, para mostrárselo al admin.
 */
export async function generarPinTemporal(usuario: UsuarioAuth, adminId: string, ctx: Contexto): Promise<PinTemporal> {
  const pin = String(randomInt(0, 10 ** LONGITUD_PIN_TEMPORAL)).padStart(LONGITUD_PIN_TEMPORAL, "0");
  const ahora = Date.now();
  const expira = ahora + VIGENCIA_PIN_TEMPORAL_MS;

  await actualizarUsuario(usuario.id, {
    passwordHash: await hashPassword(pin),
    debeCambiarPin: true,
    pinTemporalExpira: expira,
    tokenCambioHash: "",
    tokenCambioExpira: 0,
    failedLoginAttempts: 0,
    failedWindowStart: 0,
    totalFailedAttempts: 0,
    lockedUntil: 0,
    lockedPermanently: false,
    lastPasswordChange: ahora,
  });
  const revocadas = await revocarTodosDelUsuario(usuario.id, "admin");

  await registrarEventoAuth({
    evento: "pin_temporal_generado",
    cedula: usuario.cedula,
    usuarioId: usuario.id,
    ...ctx,
    exito: true,
    detalle: `PIN temporal generado por el admin ${adminId}. Vence ${new Date(expira).toISOString()}. Sesiones revocadas: ${revocadas}`,
  });
  return { pin, expira };
}

// ─── 2. Token de cambio (login con PIN temporal) ──────────────────────

/** Emite el token de un solo uso; se guarda SOLO su hash. Sobrescribirlo invalida el anterior. */
export async function emitirTokenCambioPin(usuario: UsuarioAuth): Promise<string> {
  const token = generarTokenSeguro(); // crypto.randomBytes(32)
  await actualizarUsuario(usuario.id, {
    tokenCambioHash: sha256(token),
    tokenCambioExpira: Date.now() + VIGENCIA_CAMBIO_PIN_MS,
  });
  return token;
}

/** Formato del token: 32 bytes en base64url = 43 caracteres. */
export const esFormatoTokenCambio = (token: string | undefined): token is string =>
  typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);

/** Devuelve la cuenta si el token es válido, no venció y la cuenta sigue pendiente de crear su PIN. */
export async function validarTokenCambioPin(token: string | undefined): Promise<UsuarioAuth | null> {
  if (!esFormatoTokenCambio(token)) return null;
  const hash = sha256(token);
  const usuario = await getUsuarioPorTokenCambio(hash);
  if (!usuario || !hashesIguales(hash, usuario.tokenCambioHash)) return null;
  if (!usuario.tokenCambioExpira || usuario.tokenCambioExpira <= Date.now()) return null;
  if (!usuario.activo || usuario.lockedPermanently || !usuario.debeCambiarPin) return null;
  return usuario;
}

// ─── 3. PIN propio (colaborador) ──────────────────────────────────────

export type ResultadoCrearPin =
  | { ok: true; cedula: string }
  | { ok: false; estado: 400 | 429; error: string; detalles?: Record<string, string[]> };

export const MENSAJE_TOKEN_INVALIDO = "Pasó demasiado tiempo. Vuelve a empezar desde la pantalla de ingreso.";

export async function crearPinPropio(token: string | undefined, pin: string, ctx: Contexto): Promise<ResultadoCrearPin> {
  const limite = await rateLimit.consumir(
    `cambio-pin:${ctx.ip}`,
    MAX_INTENTOS_CAMBIO_PIN_POR_IP,
    VENTANA_INTENTOS_CAMBIO_PIN_IP_MS,
  );
  if (!limite.permitido) {
    return { ok: false, estado: 429, error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." };
  }

  const usuario = await validarTokenCambioPin(token);
  if (!usuario) return { ok: false, estado: 400, error: MENSAJE_TOKEN_INVALIDO };

  const errores = erroresPin(pin, usuario.cedula);
  if (errores.length) return { ok: false, estado: 400, error: "Elige otro PIN", detalles: { pin: errores } };

  const ahora = Date.now();
  // Una sola escritura: PIN nuevo + token consumido (single-use) + fin del estado temporal
  await actualizarUsuario(usuario.id, {
    passwordHash: await hashPassword(pin),
    debeCambiarPin: false,
    pinTemporalExpira: 0,
    tokenCambioHash: "",
    tokenCambioExpira: 0,
    failedLoginAttempts: 0,
    failedWindowStart: 0,
    totalFailedAttempts: 0,
    lockedUntil: 0,
    lastPasswordChange: ahora,
  });
  const revocadas = await revocarTodosDelUsuario(usuario.id, "password");

  await registrarEventoAuth({
    evento: "pin_creado",
    cedula: usuario.cedula,
    usuarioId: usuario.id,
    ...ctx,
    exito: true,
    detalle: `El colaborador creó su PIN. Sesiones revocadas: ${revocadas}`,
  });
  return { ok: true, cedula: usuario.cedula };
}
