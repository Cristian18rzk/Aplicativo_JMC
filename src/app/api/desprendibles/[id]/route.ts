import { NextResponse, type NextRequest } from "next/server";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import * as desprendiblesDb from "@/lib/airtable/desprendibles";
import { nombreDelUsuario } from "@/lib/airtable/usuarios";
import { ErrorApi, manejarErrorApi, validarIdRegistro } from "@/lib/api";
import { leerFormulario, leerPdf } from "@/lib/archivos";
import { requerirAdmin, requerirSesion, verificarAccesoPropio } from "@/lib/auth/middleware";
import { actualizarDesprendibleSchema } from "@/lib/validators/desprendible";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Contexto {
  params: Promise<{ id: string }>;
}

/** GET /api/desprendibles/[id] — Admin o el colaborador dueño. */
export async function GET(request: NextRequest, { params }: Contexto) {
  try {
    const usuario = await requerirSesion(request);
    const id = validarIdRegistro((await params).id);
    const desprendible = await desprendiblesDb.getById(id);
    if (!desprendible) throw new ErrorApi(404, "Desprendible no encontrado");
    verificarAccesoPropio(usuario, desprendible.colaboradorId);
    return NextResponse.json(desprendible);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

/**
 * PUT /api/desprendibles/[id] — Cambia colaborador, periodo o tipo y, opcionalmente, reemplaza el PDF
 * (solo admin). multipart/form-data con los campos a cambiar y `archivo` opcional.
 */
export async function PUT(request: NextRequest, { params }: Contexto) {
  try {
    const admin = await requerirAdmin(request);
    const id = validarIdRegistro((await params).id);
    const formulario = await leerFormulario(request);

    const presentes = Object.fromEntries(
      ["colaboradorId", "periodo", "tipo_periodo"]
        .filter((campo) => formulario.has(campo))
        .map((campo) => [campo, formulario.get(campo)]),
    );
    const datos = actualizarDesprendibleSchema.parse(presentes);
    const archivo = await leerPdf(formulario, "archivo", false);
    if (Object.keys(datos).length === 0 && !archivo) throw new ErrorApi(400, "No hay cambios para guardar");

    const existente = await desprendiblesDb.getById(id);
    if (!existente) throw new ErrorApi(404, "Desprendible no encontrado");

    if (datos.colaboradorId && datos.colaboradorId !== existente.colaboradorId) {
      if (!(await colaboradoresDb.getById(datos.colaboradorId))) {
        throw new ErrorApi(404, "El colaborador seleccionado no existe");
      }
    }

    const colaboradorId = datos.colaboradorId ?? existente.colaboradorId;
    const periodo = datos.periodo ?? existente.periodo;
    const tipo = datos.tipo_periodo ?? existente.tipo_periodo;
    if (await desprendiblesDb.existeDuplicado(colaboradorId, periodo, tipo, id)) {
      throw new ErrorApi(409, `Ya existe otro desprendible ${tipo} del periodo ${periodo} para este colaborador`);
    }

    const cargadoPor = archivo ? await nombreDelUsuario(admin.usuarioId) : undefined;
    const desprendible = await desprendiblesDb.update(id, datos, archivo, cargadoPor);
    return NextResponse.json(desprendible);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

/** DELETE /api/desprendibles/[id] — Elimina el desprendible y su archivo (solo admin). */
export async function DELETE(request: NextRequest, { params }: Contexto) {
  try {
    await requerirAdmin(request);
    const id = validarIdRegistro((await params).id);
    const existente = await desprendiblesDb.getById(id);
    if (!existente) throw new ErrorApi(404, "Desprendible no encontrado");
    await desprendiblesDb.delete(id);
    return NextResponse.json({ mensaje: "Desprendible eliminado" });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
