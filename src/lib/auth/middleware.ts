import type { NextRequest } from "next/server";
import type { AuthUser } from "@/types/auth";
import type { Rol } from "@/types/colaborador";
import { ErrorApi } from "@/lib/api";
import { NOMBRE_COOKIE_SESION, getSession, verifyToken } from "./session";

/** Extrae el usuario autenticado de la petición (o de la cookie del contexto actual). */
export async function obtenerUsuario(request?: NextRequest): Promise<AuthUser | null> {
  const sesion = request
    ? await verifyToken(request.cookies.get(NOMBRE_COOKIE_SESION)?.value)
    : await getSession();
  return sesion?.usuario ?? null;
}

/**
 * Exige una sesión válida y, opcionalmente, uno de los roles indicados.
 * Lanza ErrorApi 401/403 que manejarErrorApi convierte en respuesta JSON.
 */
export async function requerirSesion(request?: NextRequest, roles?: Rol[]): Promise<AuthUser> {
  const usuario = await obtenerUsuario(request);
  if (!usuario) throw new ErrorApi(401, "Sesión no válida o expirada. Inicie sesión nuevamente.");
  if (roles && !roles.includes(usuario.rol)) {
    throw new ErrorApi(403, "No tiene permisos para realizar esta acción");
  }
  return usuario;
}

/** Atajo: exige rol administrador. */
export function requerirAdmin(request?: NextRequest): Promise<AuthUser> {
  return requerirSesion(request, ["admin"]);
}

export function esAdmin(usuario: AuthUser | null | undefined): boolean {
  return usuario?.rol === "admin";
}

/** Verifica que el usuario sea admin o el dueño del recurso. */
export function verificarAccesoPropio(usuario: AuthUser, colaboradorId: string): void {
  if (!esAdmin(usuario) && usuario.id !== colaboradorId) {
    throw new ErrorApi(403, "No tiene permisos para acceder a este recurso");
  }
}
