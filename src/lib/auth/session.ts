import "server-only";
import type { SesionUsuario } from "@/types/auth";
import { auth } from "./config";

/**
 * Sesión de la petición actual (Server Components y Route Handlers).
 * El JWT ya fue validado por Auth.js (firma/cifrado) y por el callback jwt (accessExpires).
 */
export async function getSession(): Promise<SesionUsuario | null> {
  const sesion = await auth();
  const usuario = sesion?.user;
  if (!usuario?.id || (usuario.role !== "admin" && usuario.role !== "colaborador")) return null;
  return { usuarioId: usuario.id, id: usuario.colaboradorId ?? "", rol: usuario.role };
}
