import "server-only";
import { after } from "next/server";
import { registrarEventoAuth } from "@/lib/airtable/auth-logs";
import { actualizarUsuario, getUsuarioPorEmail, type UsuarioAuth } from "@/lib/airtable/usuarios";
import {
  BLOQUEO_TEMPORAL_MS,
  DELAY_MAXIMO_MS,
  MAX_FALLOS_ACUMULADOS,
  MAX_FALLOS_CUENTA,
  MAX_LOGINS_POR_IP,
  VENTANA_FALLOS_CUENTA_MS,
  VENTANA_LOGINS_IP_MS,
} from "./constantes";
import { compararSenuelo, verificarPassword } from "./password";
import * as rateLimit from "./rate-limit";
import { esperar } from "./request";
import { cuentaHabilitada } from "./sesiones";
import { claveEmail } from "./tokens";

export type ResultadoLogin =
  | { ok: true; usuario: UsuarioAuth }
  /** "credenciales" cubre TODOS los fallos de cuenta (inexistente, bloqueada, inactiva, clave errada). */
  | { ok: false; motivo: "credenciales" | "limite_ip" };

interface Contexto {
  ip: string;
  userAgent: string;
}

/** La auditoría se escribe después de responder: así la latencia no depende de si el email existe. */
const auditar = (datos: Parameters<typeof registrarEventoAuth>[0]) => after(() => registrarEventoAuth(datos));

/** Delay progresivo según los fallos recientes: 0, 1s, 2s, 4s, 8s, 16s (tope). */
function calcularDelay(fallosPrevios: number): number {
  if (fallosPrevios <= 0) return 0;
  return Math.min(1000 * 2 ** (fallosPrevios - 1), DELAY_MAXIMO_MS);
}

/**
 * Registra un fallo en la cuenta (persistido en Airtable).
 * - 5 fallos dentro de 15 minutos → bloqueo de 30 minutos.
 * - 10 fallos acumulados desde el último login exitoso → bloqueo permanente (desbloqueo manual por admin).
 */
async function registrarFalloCuenta(usuario: UsuarioAuth, ctx: Contexto): Promise<void> {
  const ahora = Date.now();
  const ventanaVigente = usuario.failedWindowStart > 0 && ahora - usuario.failedWindowStart < VENTANA_FALLOS_CUENTA_MS;
  const fallosVentana = ventanaVigente ? usuario.failedLoginAttempts + 1 : 1;
  const totalFallos = usuario.totalFailedAttempts + 1;

  const cambios: Parameters<typeof actualizarUsuario>[1] = {
    failedLoginAttempts: fallosVentana,
    failedWindowStart: ventanaVigente ? usuario.failedWindowStart : ahora,
    totalFailedAttempts: totalFallos,
  };

  if (totalFallos >= MAX_FALLOS_ACUMULADOS) {
    cambios.lockedPermanently = true;
    cambios.failedLoginAttempts = 0;
    cambios.failedWindowStart = 0;
  } else if (fallosVentana >= MAX_FALLOS_CUENTA) {
    cambios.lockedUntil = ahora + BLOQUEO_TEMPORAL_MS;
    cambios.failedLoginAttempts = 0;
    cambios.failedWindowStart = 0;
  }

  await actualizarUsuario(usuario.id, cambios);

  if (cambios.lockedPermanently) {
    await registrarEventoAuth({
      evento: "cuenta_bloqueada_permanente",
      email: usuario.email,
      usuarioId: usuario.id,
      ...ctx,
      exito: false,
      detalle: `${totalFallos} intentos fallidos acumulados. Requiere desbloqueo manual por un administrador.`,
    });
  } else if (cambios.lockedUntil) {
    await registrarEventoAuth({
      evento: "cuenta_bloqueada",
      email: usuario.email,
      usuarioId: usuario.id,
      ...ctx,
      exito: false,
      detalle: `${MAX_FALLOS_CUENTA} intentos fallidos en 15 minutos. Bloqueada hasta ${new Date(cambios.lockedUntil).toISOString()}`,
    });
  }
}

/**
 * Valida credenciales. Todas las respuestas negativas son indistinguibles para el cliente
 * ("Credenciales inválidas") y tardan lo mismo, exista o no el email.
 */
export async function autenticar(emailEntrada: string, password: string, ctx: Contexto): Promise<ResultadoLogin> {
  const email = emailEntrada.trim().toLowerCase();

  // 1) Límite por IP: 20 intentos cada 15 minutos (exitosos o no)
  const limiteIp = await rateLimit.consumir(`login-ip:${ctx.ip}`, MAX_LOGINS_POR_IP, VENTANA_LOGINS_IP_MS);
  if (!limiteIp.permitido) {
    // Solo se registra al cruzar el umbral, para no inundar la auditoría durante un ataque
    if (limiteIp.conteo === MAX_LOGINS_POR_IP + 1) {
      auditar({ evento: "rate_limit_ip", email, ...ctx, exito: false, detalle: "Límite de logins por IP" });
    }
    return { ok: false, motivo: "limite_ip" };
  }

  // 2) Delay progresivo por email (se aplica también a emails inexistentes, para no delatarlos)
  const claveFallos = `login-fail:${claveEmail(email)}`;
  await esperar(calcularDelay(await rateLimit.contar(claveFallos)));

  const usuario = await getUsuarioPorEmail(email);

  // 3) Email inexistente o cuenta que aún no ha creado su contraseña
  if (!usuario || !usuario.passwordHash) {
    await compararSenuelo(password);
    await rateLimit.incrementar(claveFallos, VENTANA_FALLOS_CUENTA_MS);
    auditar({
      evento: "login_fallido",
      email,
      usuarioId: usuario?.id,
      ...ctx,
      exito: false,
      detalle: usuario ? "Cuenta sin contraseña establecida" : "Email no registrado",
    });
    return { ok: false, motivo: "credenciales" };
  }

  // 4) Cuenta bloqueada: se compara igualmente la contraseña (mismo tiempo de respuesta) pero se rechaza
  const ahora = Date.now();
  if (usuario.lockedPermanently || usuario.lockedUntil > ahora) {
    await verificarPassword(password, usuario.passwordHash);
    await rateLimit.incrementar(claveFallos, VENTANA_FALLOS_CUENTA_MS);
    auditar({
      evento: "login_rechazado_bloqueo",
      email,
      usuarioId: usuario.id,
      ...ctx,
      exito: false,
      detalle: usuario.lockedPermanently
        ? "Cuenta bloqueada permanentemente"
        : `Cuenta bloqueada hasta ${new Date(usuario.lockedUntil).toISOString()}`,
    });
    return { ok: false, motivo: "credenciales" };
  }

  // 5) Contraseña incorrecta
  const valida = await verificarPassword(password, usuario.passwordHash);
  if (!valida) {
    await rateLimit.incrementar(claveFallos, VENTANA_FALLOS_CUENTA_MS);
    after(() => registrarFalloCuenta(usuario, ctx));
    auditar({ evento: "login_fallido", email, usuarioId: usuario.id, ...ctx, exito: false, detalle: "Contraseña incorrecta" });
    return { ok: false, motivo: "credenciales" };
  }

  // 6) Contraseña correcta pero la cuenta o la ficha del colaborador está inactiva
  if (!(await cuentaHabilitada(usuario, ahora))) {
    auditar({ evento: "login_fallido", email, usuarioId: usuario.id, ...ctx, exito: false, detalle: "Cuenta o colaborador inactivo" });
    return { ok: false, motivo: "credenciales" };
  }

  // 7) Éxito: se reinician los contadores
  await rateLimit.reiniciar(claveFallos);
  if (usuario.failedLoginAttempts || usuario.totalFailedAttempts || usuario.lockedUntil) {
    await actualizarUsuario(usuario.id, {
      failedLoginAttempts: 0,
      failedWindowStart: 0,
      totalFailedAttempts: 0,
      lockedUntil: 0,
    });
  }
  auditar({ evento: "login_exitoso", email, usuarioId: usuario.id, ...ctx, exito: true });
  return { ok: true, usuario };
}
