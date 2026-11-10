import { NextResponse, type NextRequest } from "next/server";
import { getByCedula, guardarCodigo } from "@/lib/airtable/colaboradores";
import { leerJson, manejarErrorApi } from "@/lib/api";
import { VIGENCIA_CODIGO_MS, enviarCodigoPorCorreo, generarCodigo, hashCodigo } from "@/lib/auth/codigo";
import { enmascararEmail } from "@/lib/utils";
import { loginSchema } from "@/lib/validators/auth";
import type { LoginResponse } from "@/types/auth";

const MENSAJE_GENERICO =
  "Si la cédula está registrada y activa, recibirá un código de verificación de 6 dígitos.";

/** POST /api/auth/login — Busca la cédula y genera un código de verificación de 6 dígitos. */
export async function POST(request: NextRequest) {
  try {
    const { cedula } = loginSchema.parse(await leerJson(request));
    const colaborador = await getByCedula(cedula);

    // Respuesta genérica para no revelar qué cédulas existen
    if (!colaborador || colaborador.estado !== "Activo") {
      return NextResponse.json<LoginResponse>({ mensaje: MENSAJE_GENERICO });
    }

    const codigo = generarCodigo();
    const expira = new Date(Date.now() + VIGENCIA_CODIGO_MS).toISOString();
    // Se guarda "hash:intentosFallidos"
    await guardarCodigo(colaborador.id, `${hashCodigo(cedula, codigo)}:0`, expira);

    const nombre = `${colaborador.nombres} ${colaborador.apellidos}`.trim();
    const enviado = await enviarCodigoPorCorreo(colaborador.email, nombre, codigo);

    const respuesta: LoginResponse = { mensaje: MENSAJE_GENERICO };
    if (enviado) {
      respuesta.mensaje = "Enviamos un código de verificación a su correo registrado.";
      respuesta.destino = enmascararEmail(colaborador.email);
    } else if (process.env.NODE_ENV !== "production") {
      // Solo en desarrollo y sin proveedor de correo configurado
      respuesta.mensaje = "Modo desarrollo: no hay proveedor de correo configurado.";
      respuesta.codigoDesarrollo = codigo;
    } else {
      console.error(
        `[Auth] No fue posible enviar el código a la cédula ${cedula}. Configure RESEND_API_KEY y verifique el email del colaborador.`,
      );
    }

    return NextResponse.json(respuesta);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
