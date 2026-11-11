import type { Rol } from "./colaborador";

/** Identidad mínima extraída del access token (lo que usan las API routes para autorizar). */
export interface SesionUsuario {
  /** ID del registro en "Usuarios". */
  usuarioId: string;
  /** ID del colaborador asociado (vacío para un admin sin ficha). Se usa para el control de acceso propio. */
  id: string;
  rol: Rol;
}

/** Usuario que ve el navegador (GET /api/auth/me). Sin ningún dato de seguridad. */
export interface AuthUser extends SesionUsuario {
  nombre: string;
  email: string;
  cedula: string;
}
