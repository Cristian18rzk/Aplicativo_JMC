import type { NextRequest } from "next/server";
import {
  nombreArchivoDesprendible,
  renderizarDesprendiblePdf,
} from "@/components/desprendibles/desprendible-pdf";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import * as desprendiblesDb from "@/lib/airtable/desprendibles";
import { ErrorApi, manejarErrorApi, validarIdRegistro } from "@/lib/api";
import { requerirSesion, verificarAccesoPropio } from "@/lib/auth/middleware";
import { obtenerDatosEmpresa } from "@/lib/empresa";
import { respuestaPdf } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";

interface Contexto {
  params: Promise<{ id: string }>;
}

/** GET /api/desprendibles/[id]/pdf?descargar=1 — Genera el PDF del desprendible. */
export async function GET(request: NextRequest, { params }: Contexto) {
  try {
    const usuario = await requerirSesion(request);
    const id = validarIdRegistro((await params).id);

    const desprendible = await desprendiblesDb.getById(id);
    if (!desprendible) throw new ErrorApi(404, "Desprendible no encontrado");
    verificarAccesoPropio(usuario, desprendible.colaboradorId);

    const colaborador = desprendible.colaboradorId
      ? await colaboradoresDb.getById(desprendible.colaboradorId)
      : null;

    const buffer = await renderizarDesprendiblePdf({
      desprendible,
      colaborador,
      empresa: obtenerDatosEmpresa(),
    });

    const nombre = nombreArchivoDesprendible(
      desprendible.periodo,
      desprendible.tipo_periodo,
      desprendible.colaboradorCedula,
    );
    return respuestaPdf(buffer, nombre, request.nextUrl.searchParams.get("descargar") === "1");
  } catch (error) {
    return manejarErrorApi(error);
  }
}
