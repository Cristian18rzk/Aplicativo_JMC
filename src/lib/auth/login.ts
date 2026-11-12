import "server-only";
import { after } from "next/server";
import { registrarEventoAuth } from "@/lib/airtable/auth-logs";
import { actualizarUsuario, getUsuarioPorCedula, type UsuarioAuth } from "@/lib/airtable/usuarios";
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
import { cuentaHabilitada, fichaActiva } from "./sesiones";
import { claveIdentificador } from "./tokens";

export type ResultadoLogin =
  | { ok: true; usuario: UsuarioAuth }
  /** PIN temporal correcto y vigente: debe crear su PIN propio antes de tener sesión. */
  | { ok: false; motivo: "cambiar_pin"; usuario: UsuarioAuth }
  /** "credenciales" cubre TODOS los fallos de cuenta (inexistente, bloqueada, inactiva, PIN errado). */
  | { ok: false; motivo: "credenciales" | "limite_ip" | "pin_vencido" };

interface Contexto {
  ip: string;
  userAgent: string;
}

/** La auditoría se escribe después de responder: así la latencia no depende de si la cédula existe. */
const auditar = (datos: Parameters<typeof registrarEventoAuth>[0]) => after(() => registrarEventoAuth(datos));

/** Delay progresivo según los fallos recientes: 0, 1s, 2s, 4s, 8s, 16s (tope). */
function calcularDelay(fallosPrevios: number): number {
  if (fallosPrevios <= 0) return 0;
  return Math.min(1000 * 2 ** (fallosPrevios - 1), DELAY_MAXIMO_MS);
}

/**
 * Registra un fallo en la cuenta (persistido en Airtable).
 * - 5 fallos dentro de 15 minutos → bloqueo de 30 minutos.
 * - 10 fallos acumulados desde el último ingreso exitoso → bloqueo hasta que el admin genere un PIN temporal.
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
      cedula: usuario.cedula,
      usuarioId: usuario.id,
      ...ctx,
      exito: false,
      detalle: `${totalFallos} intentos fallidos acumulados. Se desbloquea cuando el admin genere un PIN temporal.`,
    });
  } else if (cambios.lockedUntil) {
    await registrarEventoAuth({
      evento: "cuenta_bloqueada",
      cedula: usuario.cedula,
      usuarioId: usuario.id,
      ...ctx,
      exito: false,
      detalle: `${MAX_FALLOS_CUENTA} intentos fallidos en 15 minutos. Bloqueada hasta ${new Date(cambios.lockedUntil).toISOString()}`,
    });
  }
}

/**
 * Valida cédula + secreto (PIN, PIN temporal o contraseña del admin). Todas las respuestas negativas
 * de cuenta son indistinguibles para el cliente ("Credenciales inválidas") y tardan lo mismo, exista
 * o no la cédula. Solo quien acierta el PIN temporal recibe una respuesta distinta.
 */
export async function autenticar(cedula: string, password: string, ctx: Contexto): Promise<ResultadoLogin> {
  // 1) Límite por IP: 20 intentos cada 15 minutos (exitosos o no)
  const limiteIp = await rateLimit.consumir(`login-ip:${ctx.ip}`, MAX_LOGINS_POR_IP, VENTANA_LOGINS_IP_MS);
  if (!limiteIp.permitido) {
    // Solo se registra al cruzar el umbral, para no inundar la auditoría durante un ataque
    if (limiteIp.conteo === MAX_LOGINS_POR_IP + 1) {
      auditar({ evento: "rate_limit_ip", cedula, ...ctx, exito: false, detalle: "Límite de logins por IP" });
    }
    return { ok: false, motivo: "limite_ip" };
  }

  // 2) Delay progresivo por cédula (se aplica también a cédulas inexistentes, para no delatarlas)
  const claveFallos = `login-fail:${claveIdentificador(cedula)}`;
  await esperar(calcularDelay(await rateLimit.contar(claveFallos)));

  const usuario = await getUsuarioPorCedula(cedula);

  // 3a) Primer ingreso: la cuenta existe, está habilitada y nunca ha tenido PIN → a crearlo.
  //     Este camino se cierra en cuanto crea su PIN; después solo un PIN temporal del admin lo cambia.
  if (
    usuario &&
    !usuario.passwordHash &&
    usuario.activo &&
    !usuario.lockedPermanently &&
    usuario.lockedUntil <= Date.now() &&
    (await fichaActiva(usuario))
  ) {
    await actualizarUsuario(usuario.id, { debeCambiarPin: true, pinTemporalExpira: 0 });
    auditar({ evento: "primer_ingreso", cedula, usuarioId: usuario.id, ...ctx, exito: true, detalle: "Primer ingreso: va a crear su PIN" });
    return { ok: false, motivo: "cambiar_pin", usuario: { ...usuario, debeCambiarPin: true } };
  }

  // 3b) Cédula inexistente o cuenta sin PIN que no está habilitada
  if (!usuario || !usuario.passwordHash) {
    await compararSenuelo(password);
    await rateLimit.incrementar(claveFallos, VENTANA_FALLOS_CUENTA_MS);
    auditar({
      evento: "login_fallido",
      cedula,
      usuarioId: usuario?.id,
      ...ctx,
      exito: false,
      detalle: usuario ? "Cuenta sin PIN, inactiva o bloqueada" : "Cédula no registrada",
    });
    return { ok: false, motivo: "credenciales" };
  }

  // 4) Cuenta bloqueada: se compara igualmente el secreto (mismo tiempo de respuesta) pero se rechaza
  const ahora = Date.now();
  if (usuario.lockedPermanently || usuario.lockedUntil > ahora) {
    await verificarPassword(password, usuario.passwordHash);
    await rateLimit.incrementar(claveFallos, VENTANA_FALLOS_CUENTA_MS);
    auditar({
      evento: "login_rechazado_bloqueo",
      cedula,
      usuarioId: usuario.id,
      ...ctx,
      exito: false,
      detalle: usuario.lockedPermanently
        ? "Cuenta bloqueada por intentos fallidos acumulados"
        : `Cuenta bloqueada hasta ${new Date(usuario.lockedUntil).toISOString()}`,
    });
    return { ok: false, motivo: "credenciales" };
  }

  // 5) Secreto incorrecto
  const valida = await verificarPassword(password, usuario.passwordHash);
  if (!valida) {
    await rateLimit.incrementar(claveFallos, VENTANA_FALLOS_CUENTA_MS);
    after(() => registrarFalloCuenta(usuario, ctx));
    auditar({ evento: "login_fallido", cedula, usuarioId: usuario.id, ...ctx, exito: false, detalle: "PIN o contraseña incorrecta" });
    return { ok: false, motivo: "credenciales" };
  }

  // 6) Secreto correcto pero la cuenta o la ficha del colaborador está inactiva
  if (!(await cuentaHabilitada(usuario, ahora, { permitirCambioPendiente: true }))) {
    auditar({ evento: "login_fallido", cedula, usuarioId: usuario.id, ...ctx, exito: false, detalle: "Cuenta o colaborador inactivo" });
    return { ok: false, motivo: "credenciales" };
  }

  // 7) Acierto: se reinician los contadores
  await rateLimit.reiniciar(claveFallos);
  if (usuario.failedLoginAttempts || usuario.totalFailedAttempts || usuario.lockedUntil) {
    await actualizarUsuario(usuario.id, {
      failedLoginAttempts: 0,
      failedWindowStart: 0,
      totalFailedAttempts: 0,
      lockedUntil: 0,
    });
  }

  // 8) PIN temporal: vencido → pedir otro al admin; vigente → crear el PIN propio
  if (usuario.debeCambiarPin) {
    if (!usuario.pinTemporalExpira || usuario.pinTemporalExpira <= ahora) {
      auditar({ evento: "pin_temporal_vencido", cedula, usuarioId: usuario.id, ...ctx, exito: false, detalle: "PIN temporal correcto pero vencido" });
      return { ok: false, motivo: "pin_vencido" };
    }
    return { ok: false, motivo: "cambiar_pin", usuario };
  }

  auditar({ evento: "login_exitoso", cedula, usuarioId: usuario.id, ...ctx, exito: true });
  return { ok: true, usuario };
}
