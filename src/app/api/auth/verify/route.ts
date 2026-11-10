import { NextResponse, type NextRequest } from "next/server";
import { getByCedula, guardarCodigo } from "@/lib/airtable/colaboradores";
import { ErrorApi, leerJson, manejarErrorApi } from "@/lib/api";
import { codigoCoincide } from "@/lib/auth/codigo";
import { NOMBRE_COOKIE_SESION, createToken, opcionesCookieSesion } from "@/lib/auth/session";
import { verifySchema } from "@/lib/validators/auth";
import type { AuthUser } from "@/types/auth";

const MAX_INTENTOS = 5;
const ERROR_CODIGO = "Código inválido o expirado";

/** POST /api/auth/verify — Valida el código, crea el JWT y lo guarda en una cookie httpOnly. */
export async function POST(request: NextRequest) {
  try {
    const { cedula, codigo } = verifySchema.parse(await leerJson(request));
    const colaborador = await getByCedula(cedula);

    if (!colaborador || colaborador.estado !== "Activo" || !colaborador.codigo_verificacion) {
      throw new ErrorApi(401, ERROR_CODIGO);
    }

    const [hash, intentosTexto] = colaborador.codigo_verificacion.split(":");
    const intentos = Number(intentosTexto) || 0;
    const expira = new Date(colaborador.codigo_expira).getTime();

    if (!Number.isFinite(expira) || Date.now() > expira) {
      await guardarCodigo(colaborador.id, null, null);
      throw new ErrorApi(401, "El código expiró. Solicite uno nuevo.");
    }

    if (!codigoCoincide(cedula, codigo, hash)) {
      const nuevosIntentos = intentos + 1;
      if (nuevosIntentos >= MAX_INTENTOS) {
        await guardarCodigo(colaborador.id, null, null);
        throw new ErrorApi(429, "Demasiados intentos fallidos. Solicite un nuevo código.");
      }
      await guardarCodigo(colaborador.id, `${hash}:${nuevosIntentos}`, colaborador.codigo_expira);
      throw new ErrorApi(401, `${ERROR_CODIGO}. Le quedan ${MAX_INTENTOS - nuevosIntentos} intentos.`);
    }

    // Código correcto: se invalida para que no pueda reutilizarse
    await guardarCodigo(colaborador.id, null, null);

    const usuario: AuthUser = {
      id: colaborador.id,
      cedula: colaborador.cedula,
      nombre: `${colaborador.nombres} ${colaborador.apellidos}`.trim(),
      rol: colaborador.rol,
    };
    const token = await createToken(usuario);

    const respuesta = NextResponse.json({ usuario });
    respuesta.cookies.set(NOMBRE_COOKIE_SESION, token, opcionesCookieSesion());
    return respuesta;
  } catch (error) {
    return manejarErrorApi(error);
  }
}
