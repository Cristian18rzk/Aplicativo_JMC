import "server-only";
import type { NextRequest } from "next/server";
import { ErrorApi } from "@/lib/api";
import type { SesionUsuario } from "@/types/auth";
import type { Rol } from "@/types/colaborador";
import { getSession } from "./session";

/**
 * Usuario autenticado de la petición. proxy.ts ya rechaza las peticiones sin sesión a /api/*,
 * pero cada API route vuelve a verificar el JWT (defensa en profundidad).
 * El parámetro request se conserva por compatibilidad: la cookie se lee del contexto de la petición.
 */
export async function obtenerUsuario(): Promise<SesionUsuario | null> {
  return getSession();
}

/** Exige una sesión válida y, opcionalmente, uno de los roles indicados (401/403). */
export async function requerirSesion(request?: NextRequest, roles?: Rol[]): Promise<SesionUsuario> {
  const usuario = await obtenerUsuario();
  // Un colaborador sin ficha asociada no debe llegar nunca aquí; si llegara, un id vacío podría
  // interpretarse como "sin filtro" en los listados, así que se rechaza explícitamente
  if (!usuario || (usuario.rol === "colaborador" && !usuario.id)) {
    throw new ErrorApi(401, "Sesión no válida o expirada. Inicia sesión nuevamente.");
  }
  if (roles && !roles.includes(usuario.rol)) {
    throw new ErrorApi(403, "No tiene permisos para realizar esta acción");
  }
  return usuario;
}

/** Atajo: exige rol administrador. */
export function requerirAdmin(request?: NextRequest): Promise<SesionUsuario> {
  return requerirSesion(request, ["admin"]);
}

export function esAdmin(usuario: SesionUsuario | null | undefined): boolean {
  return usuario?.rol === "admin";
}

/** Verifica que el usuario sea admin o el dueño del recurso. */
export function verificarAccesoPropio(usuario: SesionUsuario, colaboradorId: string): void {
  if (!esAdmin(usuario) && (!usuario.id || usuario.id !== colaboradorId)) {
    throw new ErrorApi(403, "No tiene permisos para acceder a este recurso");
  }
}
