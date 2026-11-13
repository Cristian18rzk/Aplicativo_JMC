import { NextResponse, type NextRequest } from "next/server";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import * as desprendiblesDb from "@/lib/airtable/desprendibles";
import { ErrorApi, manejarErrorApi } from "@/lib/api";
import { leerFormulario, leerPdf } from "@/lib/archivos";
import { requerirAdmin } from "@/lib/auth/middleware";
import { claveExistente, clasificarPaginas } from "@/lib/lector/clasificar";
import { leerPagina } from "@/lib/lector/leer-pagina";
import { extraerPaginas } from "@/lib/lector/texto-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Un PDF de nómina trae una página por persona: más de esto no es un archivo del programa de nómina. */
const MAXIMO_PAGINAS = 400;

/**
 * POST /api/desprendibles/lector — Lee el PDF del programa de nómina (solo admin) y devuelve, página
 * por página, a quién corresponde y si se puede cargar. No guarda nada: la carga se confirma después
 * con POST /api/desprendibles/lector/generar por cada página lista.
 * multipart/form-data: archivo (PDF ≤ 4 MB).
 */
export async function POST(request: NextRequest) {
  try {
    await requerirAdmin(request);
    const archivo = await leerPdf(await leerFormulario(request));

    let paginas;
    try {
      paginas = await extraerPaginas(archivo!.bytes);
    } catch {
      throw new ErrorApi(400, "No fue posible leer el PDF. Verifique que sea el archivo generado por el programa de nómina.");
    }
    if (paginas.length > MAXIMO_PAGINAS) throw new ErrorApi(400, `El PDF tiene más de ${MAXIMO_PAGINAS} páginas`);

    const leidas = paginas.map(leerPagina);
    const periodos = [...new Set(leidas.flatMap((l) => (l.ok ? [l.contenido.periodo] : [])))];

    const [fichas, ...existentesPorPeriodo] = await Promise.all([
      colaboradoresDb.getMapa(),
      ...periodos.map((periodo) => desprendiblesDb.getAll({ periodo, porPagina: 100_000 })),
    ]);
    const existentes = new Set(
      existentesPorPeriodo.flatMap((lista) =>
        lista.datos.filter((d) => d.tipo_periodo === "Mensual").map((d) => claveExistente(d.colaboradorId, d.periodo)),
      ),
    );

    return NextResponse.json({
      archivo: archivo!.nombre,
      periodos,
      paginas: clasificarPaginas(leidas, [...fichas.values()], existentes),
    });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
