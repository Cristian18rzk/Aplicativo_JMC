import { NextResponse, type NextRequest } from "next/server";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import { ErrorApi, leerJson, manejarErrorApi, soloClavesPresentes, validarIdRegistro } from "@/lib/api";
import { eliminarCuentaColaborador, sincronizarCuentaColaborador, verificarEmailDisponible } from "@/lib/auth/cuentas";
import { requerirAdmin, requerirSesion, verificarAccesoPropio } from "@/lib/auth/middleware";
import { actualizarColaboradorSchema } from "@/lib/validators/colaborador";

interface Contexto {
  params: Promise<{ id: string }>;
}

/** GET /api/colaboradores/[id] — Admin o el propio colaborador. */
export async function GET(request: NextRequest, { params }: Contexto) {
  try {
    const usuario = await requerirSesion(request);
    const id = validarIdRegistro((await params).id);
    verificarAccesoPropio(usuario, id);

    const colaborador = await colaboradoresDb.getById(id);
    if (!colaborador) throw new ErrorApi(404, "Colaborador no encontrado");
    return NextResponse.json(colaborador);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

/** PUT /api/colaboradores/[id] — Actualiza campos enviados (solo admin). */
export async function PUT(request: NextRequest, { params }: Contexto) {
  try {
    const admin = await requerirAdmin(request);
    const id = validarIdRegistro((await params).id);
    const cuerpo = await leerJson(request);
    const datos = soloClavesPresentes(actualizarColaboradorSchema.parse(cuerpo), cuerpo);

    if (id === admin.id && datos.rol && datos.rol !== "admin") {
      throw new ErrorApi(400, "No puede quitarse a sí mismo el rol de administrador");
    }
    if (Object.keys(datos).length === 0) throw new ErrorApi(400, "No hay campos para actualizar");

    const existente = await colaboradoresDb.getById(id);
    if (!existente) throw new ErrorApi(404, "Colaborador no encontrado");
    if (datos.email) await verificarEmailDisponible(datos.email, id);

    const colaborador = await colaboradoresDb.update(id, datos);
    // Email, nombre, rol y estado se reflejan en la cuenta de acceso (y cierran sesiones si cambian)
    await sincronizarCuentaColaborador(colaborador);
    return NextResponse.json(colaborador);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

/** DELETE /api/colaboradores/[id] — Elimina el colaborador (solo admin). */
export async function DELETE(request: NextRequest, { params }: Contexto) {
  try {
    const admin = await requerirAdmin(request);
    const id = validarIdRegistro((await params).id);
    if (id === admin.id) throw new ErrorApi(400, "No puede eliminar su propio usuario");

    const existente = await colaboradoresDb.getById(id);
    if (!existente) throw new ErrorApi(404, "Colaborador no encontrado");

    await colaboradoresDb.delete(id);
    await eliminarCuentaColaborador(id);
    return NextResponse.json({ mensaje: "Colaborador eliminado" });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
