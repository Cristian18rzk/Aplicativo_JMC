import { NextResponse, type NextRequest } from "next/server";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import * as desprendiblesDb from "@/lib/airtable/desprendibles";
import { nombreDelUsuario } from "@/lib/airtable/usuarios";
import { ErrorApi, leerPaginacion, manejarErrorApi } from "@/lib/api";
import { leerFormulario, leerPdf } from "@/lib/archivos";
import { esAdmin, requerirAdmin, requerirSesion } from "@/lib/auth/middleware";
import { desprendibleSchema } from "@/lib/validators/desprendible";

export const runtime = "nodejs";
// La subida a Airtable de un PDF de hasta 4 MB puede tardar varios segundos
export const maxDuration = 60;

/**
 * GET /api/desprendibles?pagina=&porPagina=&periodo=YYYY-MM&busqueda=&colaboradorId=
 * El admin ve todos; el colaborador solo los suyos.
 */
export async function GET(request: NextRequest) {
  try {
    const usuario = await requerirSesion(request);
    const params = request.nextUrl.searchParams;
    const { pagina, porPagina } = leerPaginacion(params);
    const periodo = params.get("periodo") ?? "";

    const resultado = await desprendiblesDb.getAll({
      pagina,
      porPagina,
      periodo: /^\d{4}-\d{2}$/.test(periodo) ? periodo : "",
      busqueda: esAdmin(usuario) ? (params.get("busqueda")?.slice(0, 100) ?? "") : "",
      colaboradorId: esAdmin(usuario) ? (params.get("colaboradorId") ?? "") : usuario.id,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

/**
 * POST /api/desprendibles — Sube el PDF de un desprendible (solo admin).
 * multipart/form-data: colaboradorId, periodo (AAAA-MM), tipo_periodo, archivo (PDF ≤ 4 MB).
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requerirAdmin(request);
    const formulario = await leerFormulario(request);
    const datos = desprendibleSchema.parse({
      colaboradorId: formulario.get("colaboradorId"),
      periodo: formulario.get("periodo"),
      tipo_periodo: formulario.get("tipo_periodo"),
    });
    const archivo = await leerPdf(formulario);

    const colaborador = await colaboradoresDb.getById(datos.colaboradorId);
    if (!colaborador) throw new ErrorApi(404, "El colaborador seleccionado no existe");

    if (await desprendiblesDb.existeDuplicado(datos.colaboradorId, datos.periodo, datos.tipo_periodo)) {
      throw new ErrorApi(
        409,
        `Ya existe un desprendible ${datos.tipo_periodo} del periodo ${datos.periodo} para este colaborador. Edítelo para reemplazar el archivo.`,
      );
    }

    const desprendible = await desprendiblesDb.create(datos, archivo!, await nombreDelUsuario(admin.usuarioId));
    return NextResponse.json(desprendible, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
