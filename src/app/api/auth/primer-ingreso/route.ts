import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { leerJson, manejarErrorApi, respuestaError } from "@/lib/api";
import { iniciarPrimerIngreso } from "@/lib/auth/cambio-pin";
import { COOKIE_CAMBIO_PIN, OPCIONES_COOKIE, VIGENCIA_CAMBIO_PIN_MS } from "@/lib/auth/constantes";
import { verificarCsrf } from "@/lib/auth/csrf";
import { obtenerIp, obtenerUserAgent } from "@/lib/auth/request";
import { cedulaSchema } from "@/lib/validators/auth";

const esquema = z.object({ cedula: cedulaSchema });

/**
 * POST /api/auth/primer-ingreso — El colaborador escribe su cédula la primera vez que entra.
 * Si su cuenta aún no tiene PIN, recibe la cookie de un solo uso para crearlo en /auth/crear-pin.
 */
export async function POST(request: NextRequest) {
  try {
    verificarCsrf(request);
    const { cedula } = esquema.parse(await leerJson(request));

    const resultado = await iniciarPrimerIngreso(cedula, {
      ip: obtenerIp(request),
      userAgent: obtenerUserAgent(request),
    });
    if (!resultado.ok) return respuestaError(resultado.estado, resultado.error);

    const respuesta = NextResponse.json({ ok: true });
    respuesta.cookies.set(COOKIE_CAMBIO_PIN, resultado.token, {
      ...OPCIONES_COOKIE,
      maxAge: Math.floor(VIGENCIA_CAMBIO_PIN_MS / 1000),
    });
    return respuesta;
  } catch (error) {
    return manejarErrorApi(error);
  }
}
