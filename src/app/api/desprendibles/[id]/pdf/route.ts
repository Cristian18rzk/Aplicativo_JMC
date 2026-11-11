import type { NextRequest } from "next/server";
import * as desprendiblesDb from "@/lib/airtable/desprendibles";
import { ErrorApi, manejarErrorApi, validarIdRegistro } from "@/lib/api";
import { respuestaArchivoPdf } from "@/lib/archivos";
import { requerirSesion, verificarAccesoPropio } from "@/lib/auth/middleware";

export const runtime = "nodejs";

interface Contexto {
  params: Promise<{ id: string }>;
}

/** Nombre de descarga uniforme: desprendible_2026-10_Quincenal-2_1098765432.pdf */
function nombreDescarga(periodo: string, tipo: string, cedula: string): string {
  const limpio = (s: string) => s.replace(/[^a-zA-Z0-9-]+/g, "-");
  return `desprendible_${limpio(periodo)}_${limpio(tipo)}_${limpio(cedula)}.pdf`;
}

/**
 * GET /api/desprendibles/[id]/pdf?descargar=1 — Entrega el PDF subido (admin o el colaborador dueño).
 * El archivo se lee de Airtable en el servidor: el navegador nunca recibe la URL del adjunto.
 */
export async function GET(request: NextRequest, { params }: Contexto) {
  try {
    const usuario = await requerirSesion(request);
    const id = validarIdRegistro((await params).id);

    const desprendible = await desprendiblesDb.getById(id);
    if (!desprendible) throw new ErrorApi(404, "Desprendible no encontrado");
    verificarAccesoPropio(usuario, desprendible.colaboradorId);

    const archivo = await desprendiblesDb.descargarArchivo(id);
    if (!archivo) throw new ErrorApi(404, "Este desprendible no tiene un archivo PDF cargado");

    return respuestaArchivoPdf(
      archivo.bytes,
      nombreDescarga(desprendible.periodo, desprendible.tipo_periodo, desprendible.colaboradorCedula),
      request.nextUrl.searchParams.get("descargar") === "1",
    );
  } catch (error) {
    return manejarErrorApi(error);
  }
}
