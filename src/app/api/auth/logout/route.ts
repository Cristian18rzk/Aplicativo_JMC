import { NextResponse, after, type NextRequest } from "next/server";
import { registrarEventoAuth } from "@/lib/airtable/auth-logs";
import { manejarErrorApi } from "@/lib/api";
import { COOKIE_REFRESH, COOKIE_SESION, OPCIONES_COOKIE } from "@/lib/auth/constantes";
import { verificarCsrf } from "@/lib/auth/csrf";
import { obtenerIp, obtenerUserAgent } from "@/lib/auth/request";
import { revocarSesionActual } from "@/lib/auth/sesiones";

/** POST /api/auth/logout — Revoca el refresh token de este dispositivo y borra las cookies. */
export async function POST(request: NextRequest) {
  try {
    verificarCsrf(request);
    const usuarioId = await revocarSesionActual(request.cookies.get(COOKIE_REFRESH)?.value);
    if (usuarioId) {
      const ctx = { ip: obtenerIp(request), userAgent: obtenerUserAgent(request) };
      after(() => registrarEventoAuth({ evento: "logout", usuarioId, ...ctx, exito: true }));
    }

    const respuesta = NextResponse.json({ mensaje: "Sesión cerrada" });
    respuesta.cookies.set(COOKIE_SESION, "", { ...OPCIONES_COOKIE, maxAge: 0 });
    respuesta.cookies.set(COOKIE_REFRESH, "", { ...OPCIONES_COOKIE, maxAge: 0 });
    return respuesta;
  } catch (error) {
    return manejarErrorApi(error);
  }
}
