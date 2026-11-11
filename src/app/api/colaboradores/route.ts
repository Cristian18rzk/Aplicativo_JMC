import { NextResponse, after, type NextRequest } from "next/server";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import { leerJson, leerPaginacion, manejarErrorApi } from "@/lib/api";
import { sincronizarCuentaColaborador, verificarCedulaDisponible } from "@/lib/auth/cuentas";
import { requerirAdmin } from "@/lib/auth/middleware";
import { crearColaboradorSchema } from "@/lib/validators/colaborador";
import { AREAS, ESTADOS_COLABORADOR, type Area, type EstadoColaborador } from "@/types/colaborador";

/** GET /api/colaboradores?pagina=1&porPagina=10&busqueda=&area=&estado= — Lista paginada (solo admin). */
export async function GET(request: NextRequest) {
  try {
    await requerirAdmin(request);
    const params = request.nextUrl.searchParams;
    const { pagina, porPagina } = leerPaginacion(params);
    const area = params.get("area") ?? "";
    const estado = params.get("estado") ?? "";

    const resultado = await colaboradoresDb.getAll({
      pagina,
      porPagina,
      busqueda: params.get("busqueda")?.slice(0, 100) ?? "",
      area: (AREAS as readonly string[]).includes(area) ? (area as Area) : "",
      estado: (ESTADOS_COLABORADOR as readonly string[]).includes(estado) ? (estado as EstadoColaborador) : "",
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return manejarErrorApi(error);
  }
}

/** POST /api/colaboradores — Crea un colaborador (solo admin). */
export async function POST(request: NextRequest) {
  try {
    await requerirAdmin(request);
    const datos = crearColaboradorSchema.parse(await leerJson(request));
    await verificarCedulaDisponible(datos.cedula);
    const colaborador = await colaboradoresDb.create(datos);

    // Cuenta de acceso sin PIN: el admin genera un PIN temporal desde la ficha
    after(() =>
      sincronizarCuentaColaborador(colaborador).catch((e: Error) =>
        console.error("[cuentas] No fue posible crear la cuenta del colaborador:", e.message),
      ),
    );
    return NextResponse.json(colaborador, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
