import { NextResponse } from "next/server";
import { NOMBRE_COOKIE_SESION, opcionesCookieSesion } from "@/lib/auth/session";

/** POST /api/auth/logout — Elimina la cookie de sesión. */
export async function POST() {
  const respuesta = NextResponse.json({ mensaje: "Sesión cerrada" });
  respuesta.cookies.set(NOMBRE_COOKIE_SESION, "", opcionesCookieSesion(0));
  return respuesta;
}
