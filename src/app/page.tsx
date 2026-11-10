import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

/** Página raíz: redirige según el estado de la sesión y el rol. */
export default async function Inicio() {
  const sesion = await getSession();
  if (!sesion) redirect("/login");
  redirect(sesion.usuario.rol === "admin" ? "/admin" : "/colaborador");
}
