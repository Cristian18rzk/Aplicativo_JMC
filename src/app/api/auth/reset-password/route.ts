import { NextResponse, type NextRequest } from "next/server";
import { leerJson, manejarErrorApi, respuestaError } from "@/lib/api";
import { COOKIE_REFRESH, COOKIE_SESION, OPCIONES_COOKIE } from "@/lib/auth/constantes";
import { verificarCsrf } from "@/lib/auth/csrf";
import { obtenerIp, obtenerUserAgent } from "@/lib/auth/request";
import { restablecerPassword } from "@/lib/auth/reset";
import { resetPasswordSchema } from "@/lib/validators/auth";

/** POST /api/auth/reset-password — Cambia la contraseña con un token de un solo uso. */
export async function POST(request: NextRequest) {
  try {
    verificarCsrf(request);
    const { token, password } = resetPasswordSchema.parse(await leerJson(request));

    const resultado = await restablecerPassword(token, password, {
      ip: obtenerIp(request),
      userAgent: obtenerUserAgent(request),
    });
    if (!resultado.ok) return respuestaError(resultado.estado, resultado.error, resultado.detalles);

    const respuesta = NextResponse.json({ mensaje: "Tu contraseña fue actualizada. Ya puedes iniciar sesión." });
    // Si este navegador tenía una sesión, también se cierra
    respuesta.cookies.set(COOKIE_SESION, "", { ...OPCIONES_COOKIE, maxAge: 0 });
    respuesta.cookies.set(COOKIE_REFRESH, "", { ...OPCIONES_COOKIE, maxAge: 0 });
    return respuesta;
  } catch (error) {
    return manejarErrorApi(error);
  }
}
