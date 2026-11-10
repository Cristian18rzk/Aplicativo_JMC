import type { Rol } from "./colaborador";

export interface LoginRequest {
  cedula: string;
}

export interface LoginResponse {
  mensaje: string;
  /** Correo enmascarado al que se envió el código (si aplica). */
  destino?: string;
  /** Solo en desarrollo sin proveedor de correo: el código generado. */
  codigoDesarrollo?: string;
}

export interface VerifyRequest {
  cedula: string;
  codigo: string;
}

export interface AuthUser {
  id: string; // ID del registro en Airtable
  cedula: string;
  nombre: string;
  rol: Rol;
}

export interface Session {
  usuario: AuthUser;
  /** Fecha de expiración en milisegundos desde epoch. */
  expira: number;
}
