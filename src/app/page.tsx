import { redirect } from "next/navigation";
import { inicioSegunRol } from "@/lib/auth/rutas";
import { getSession } from "@/lib/auth/session";

/** Página raíz: redirige según el estado de la sesión y el rol (proxy.ts normalmente lo resuelve antes). */
export default async function Inicio() {
  const sesion = await getSession();
  if (!sesion) redirect("/auth/login");
  redirect(inicioSegunRol(sesion.rol));
}
