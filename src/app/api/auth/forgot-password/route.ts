import { NextResponse, after, type NextRequest } from "next/server";
import { leerJson, manejarErrorApi, respuestaError } from "@/lib/api";
import { verificarCsrf } from "@/lib/auth/csrf";
import { obtenerIp, obtenerUserAgent } from "@/lib/auth/request";
import { procesarSolicitudReset, verificarLimitesReset } from "@/lib/auth/reset";
import { forgotPasswordSchema } from "@/lib/validators/auth";

const MENSAJE = "Si el email existe, recibirás instrucciones para restablecer tu contraseña.";

/**
 * POST /api/auth/forgot-password — Solicita el enlace de restablecimiento.
 * La respuesta es SIEMPRE la misma (y se envía antes de consultar la base) para impedir la
 * enumeración de usuarios por contenido o por tiempo de respuesta.
 */
export async function POST(request: NextRequest) {
  try {
    verificarCsrf(request);
    const { email } = forgotPasswordSchema.parse(await leerJson(request));
    const ip = obtenerIp(request);

    const limite = await verificarLimitesReset(email, ip);
    if (!limite.permitido) {
      const minutos = Math.max(1, Math.ceil(limite.reintentarEnMs / 60_000));
      const respuesta = respuestaError(
        429,
        `Has realizado demasiadas solicitudes. Inténtalo de nuevo en ${minutos} minuto${minutos === 1 ? "" : "s"}.`,
      );
      respuesta.headers.set("Retry-After", String(Math.ceil(limite.reintentarEnMs / 1000)));
      return respuesta;
    }

    after(() => procesarSolicitudReset(email, { ip, userAgent: obtenerUserAgent(request) }));
    return NextResponse.json({ mensaje: MENSAJE });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
