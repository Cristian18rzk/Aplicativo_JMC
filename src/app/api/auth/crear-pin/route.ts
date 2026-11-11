import { NextResponse, type NextRequest } from "next/server";
import { leerJson, manejarErrorApi, respuestaError } from "@/lib/api";
import { crearPinPropio } from "@/lib/auth/cambio-pin";
import { COOKIE_CAMBIO_PIN, COOKIE_REFRESH, COOKIE_SESION, OPCIONES_COOKIE } from "@/lib/auth/constantes";
import { verificarCsrf } from "@/lib/auth/csrf";
import { obtenerIp, obtenerUserAgent } from "@/lib/auth/request";
import { crearPinSchema } from "@/lib/validators/auth";

/**
 * POST /api/auth/crear-pin — El colaborador crea su PIN propio. Requiere la cookie de un solo uso que
 * emite el login al entrar con un PIN temporal vigente.
 */
export async function POST(request: NextRequest) {
  try {
    verificarCsrf(request);
    const { pin } = crearPinSchema.parse(await leerJson(request));

    const resultado = await crearPinPropio(request.cookies.get(COOKIE_CAMBIO_PIN)?.value, pin, {
      ip: obtenerIp(request),
      userAgent: obtenerUserAgent(request),
    });
    if (!resultado.ok) return respuestaError(resultado.estado, resultado.error, resultado.detalles);

    const respuesta = NextResponse.json({ mensaje: "Tu PIN quedó guardado." });
    respuesta.cookies.set(COOKIE_CAMBIO_PIN, "", { ...OPCIONES_COOKIE, maxAge: 0 });
    // Si este navegador tenía una sesión, también se cierra
    respuesta.cookies.set(COOKIE_SESION, "", { ...OPCIONES_COOKIE, maxAge: 0 });
    respuesta.cookies.set(COOKIE_REFRESH, "", { ...OPCIONES_COOKIE, maxAge: 0 });
    return respuesta;
  } catch (error) {
    return manejarErrorApi(error);
  }
}
