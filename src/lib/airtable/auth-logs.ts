import { TABLAS_AUTH, crear } from "./rest";

export const EVENTOS_AUTH = [
  "login_exitoso",
  "login_fallido",
  "login_rechazado_bloqueo",
  "cuenta_bloqueada",
  "cuenta_bloqueada_permanente",
  "rate_limit_ip",
  "pin_temporal_generado",
  "pin_temporal_vencido",
  "pin_creado",
  "primer_ingreso",
  "refresh_reutilizado",
  "logout",
] as const;

export type EventoAuth = (typeof EVENTOS_AUTH)[number];

export interface DatosEventoAuth {
  evento: EventoAuth;
  cedula?: string;
  usuarioId?: string;
  ip?: string;
  userAgent?: string;
  exito: boolean;
  /** Texto descriptivo. NUNCA incluir PIN, contraseñas, tokens ni hashes. */
  detalle?: string;
}

/**
 * Registra un evento de auditoría en la tabla "auth_logs".
 * Nunca lanza: un fallo de auditoría no debe impedir el login ni filtrar información al cliente.
 */
export async function registrarEventoAuth(datos: DatosEventoAuth): Promise<void> {
  const fecha = new Date().toISOString();
  try {
    await crear(TABLAS_AUTH.authLogs, {
      registro: `${datos.evento} · ${fecha}`,
      evento: datos.evento,
      fecha,
      cedula: datos.cedula?.slice(0, 20) ?? null,
      user_id: datos.usuarioId ?? null,
      ip: datos.ip ?? null,
      user_agent: datos.userAgent?.slice(0, 500) ?? null,
      exito: datos.exito,
      detalle: datos.detalle?.slice(0, 1000) ?? null,
    });
  } catch (error) {
    console.error("[auth_logs] No fue posible registrar el evento", datos.evento, (error as Error).message);
  }
}
