import { NextResponse, type NextRequest } from "next/server";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import * as desprendiblesDb from "@/lib/airtable/desprendibles";
import { ErrorApi, leerJson, leerPaginacion, manejarErrorApi } from "@/lib/api";
import { esAdmin, requerirAdmin, requerirSesion } from "@/lib/auth/middleware";
import { desprendibleSchema } from "@/lib/validators/desprendible";

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

/** POST /api/desprendibles — Crea un desprendible individual (solo admin). */
export async function POST(request: NextRequest) {
  try {
    await requerirAdmin(request);
    const datos = desprendibleSchema.parse(await leerJson(request));

    const colaborador = await colaboradoresDb.getById(datos.colaboradorId);
    if (!colaborador) throw new ErrorApi(404, "El colaborador seleccionado no existe");

    if (await desprendiblesDb.existeDuplicado(datos.colaboradorId, datos.periodo, datos.tipo_periodo)) {
      throw new ErrorApi(
        409,
        `Ya existe un desprendible ${datos.tipo_periodo} del periodo ${datos.periodo} para este colaborador`,
      );
    }

    const desprendible = await desprendiblesDb.create(datos);
    return NextResponse.json(desprendible, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
