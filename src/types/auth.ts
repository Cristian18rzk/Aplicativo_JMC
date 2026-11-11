import type { Rol } from "./colaborador";

/** Identidad mínima extraída del access token (lo que usan las API routes para autorizar). */
export interface SesionUsuario {
  /** ID del registro en "Usuarios". */
  usuarioId: string;
  /** ID del colaborador asociado (vacío para un admin sin ficha). Se usa para el control de acceso propio. */
  id: string;
  rol: Rol;
}

/**
 * Estado del acceso de un colaborador, tal como lo ve el admin en la ficha (sin secretos).
 * - sin_pin: tiene cuenta pero nunca se le generó un PIN temporal (no puede ingresar).
 * - pin_temporal: debe entrar con el PIN temporal y crear el suyo.
 * - pin_temporal_vencido: el PIN temporal ya no sirve; hay que generar otro.
 * - activo: ya creó su PIN.
 * - bloqueado: demasiados intentos fallidos (temporal o hasta generar un PIN temporal).
 */
export type EstadoAcceso = "sin_pin" | "pin_temporal" | "pin_temporal_vencido" | "activo" | "bloqueado";

export interface AccesoColaborador {
  estado: EstadoAcceso;
  /** Bloqueo temporal: hasta cuándo (ms). 0 si no aplica o si el bloqueo es indefinido. */
  bloqueadoHasta: number;
  pinTemporalExpira: number;
  ultimoCambio: number;
}

export interface RespuestaPinTemporal {
  pin: string;
  expira: number;
}

/** Usuario que ve el navegador (GET /api/auth/me). Sin ningún dato de seguridad. */
export interface AuthUser extends SesionUsuario {
  nombre: string;
  email: string;
  cedula: string;
}
