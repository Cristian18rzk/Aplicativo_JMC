import { NextResponse, type NextRequest } from "next/server";
import { getById } from "@/lib/airtable/colaboradores";
import { ErrorApi, manejarErrorApi } from "@/lib/api";
import { requerirSesion } from "@/lib/auth/middleware";
import { NOMBRE_COOKIE_SESION, opcionesCookieSesion } from "@/lib/auth/session";
import type { AuthUser } from "@/types/auth";

/** GET /api/auth/me — Devuelve el usuario actual a partir del JWT, validando que siga activo. */
export async function GET(request: NextRequest) {
  try {
    const usuarioToken = await requerirSesion(request);
    const colaborador = await getById(usuarioToken.id);

    if (!colaborador || colaborador.estado !== "Activo") {
      const respuesta = NextResponse.json({ error: "Usuario inactivo" }, { status: 401 });
      respuesta.cookies.set(NOMBRE_COOKIE_SESION, "", opcionesCookieSesion(0));
      return respuesta;
    }

    if (colaborador.rol !== usuarioToken.rol) {
      // El rol cambió en Airtable: obligar a iniciar sesión de nuevo
      throw new ErrorApi(401, "Sus permisos cambiaron. Inicie sesión nuevamente.");
    }

    const usuario: AuthUser = {
      id: colaborador.id,
      cedula: colaborador.cedula,
      nombre: `${colaborador.nombres} ${colaborador.apellidos}`.trim(),
      rol: colaborador.rol,
    };
    return NextResponse.json({ usuario });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
