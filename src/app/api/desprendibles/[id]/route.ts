import { NextResponse, type NextRequest } from "next/server";
import * as desprendiblesDb from "@/lib/airtable/desprendibles";
import { ErrorApi, leerJson, manejarErrorApi, soloClavesPresentes, validarIdRegistro } from "@/lib/api";
import { requerirAdmin, requerirSesion, verificarAccesoPropio } from "@/lib/auth/middleware";
import { actualizarDesprendibleSchema } from "@/lib/validators/desprendible";

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

/** PUT /api/desprendibles/[id] — Actualiza un desprendible (solo admin). */
export async function PUT(request: NextRequest, { params }: Contexto) {
  try {
    await requerirAdmin(request);
    const id = validarIdRegistro((await params).id);
    const cuerpo = await leerJson(request);
    const datos = soloClavesPresentes(actualizarDesprendibleSchema.parse(cuerpo), cuerpo);
    if (Object.keys(datos).length === 0) throw new ErrorApi(400, "No hay campos para actualizar");

    const existente = await desprendiblesDb.getById(id);
    if (!existente) throw new ErrorApi(404, "Desprendible no encontrado");

    const colaboradorId = datos.colaboradorId ?? existente.colaboradorId;
    const periodo = datos.periodo ?? existente.periodo;
    const tipo = datos.tipo_periodo ?? existente.tipo_periodo;
    if (await desprendiblesDb.existeDuplicado(colaboradorId, periodo, tipo, id)) {
      throw new ErrorApi(409, `Ya existe otro desprendible ${tipo} del periodo ${periodo} para este colaborador`);
    }

    const desprendible = await desprendiblesDb.update(id, datos);
    return NextResponse.json(desprendible);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

/** DELETE /api/desprendibles/[id] — Elimina un desprendible (solo admin). */
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
