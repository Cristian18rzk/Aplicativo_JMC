import { NextResponse } from "next/server";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import { getUsuarioPorId } from "@/lib/airtable/usuarios";
import { manejarErrorApi } from "@/lib/api";
import { auth } from "@/lib/auth/config";
import { COOKIE_REFRESH, COOKIE_SESION, OPCIONES_COOKIE } from "@/lib/auth/constantes";
import { cuentaHabilitada } from "@/lib/auth/sesiones";
import type { AuthUser } from "@/types/auth";

function sinSesion(mensaje: string) {
  const respuesta = NextResponse.json({ error: mensaje }, { status: 401 });
  respuesta.cookies.set(COOKIE_SESION, "", { ...OPCIONES_COOKIE, maxAge: 0 });
  respuesta.cookies.set(COOKIE_REFRESH, "", { ...OPCIONES_COOKIE, maxAge: 0 });
  return respuesta;
}

/**
 * GET /api/auth/me — Usuario actual. Además de validar el JWT, confirma contra Airtable que la cuenta
 * siga activa, que el rol no haya cambiado y que la contraseña no se haya cambiado después del login.
 */
export async function GET() {
  try {
    const sesion = await auth();
    if (!sesion?.user?.id) return sinSesion("Sesión no válida o expirada");

    const usuario = await getUsuarioPorId(sesion.user.id);
    if (!usuario || !(await cuentaHabilitada(usuario, sesion.authTime))) {
      return sinSesion("Tu sesión ya no es válida. Inicia sesión nuevamente.");
    }
    if (usuario.role !== sesion.user.role) {
      return sinSesion("Tus permisos cambiaron. Inicia sesión nuevamente.");
    }

    const colaborador = usuario.colaboradorId ? await colaboradoresDb.getById(usuario.colaboradorId) : null;
    const respuesta: AuthUser = {
      usuarioId: usuario.id,
      id: usuario.colaboradorId,
      rol: usuario.role,
      email: usuario.email,
      nombre: colaborador ? `${colaborador.nombres} ${colaborador.apellidos}`.trim() : usuario.nombre || usuario.email,
      cedula: colaborador?.cedula ?? "",
    };
    return NextResponse.json({ usuario: respuesta }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
