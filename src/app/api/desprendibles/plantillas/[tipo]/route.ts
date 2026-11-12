import type { NextRequest } from "next/server";
import { ErrorApi, manejarErrorApi } from "@/lib/api";
import { requerirAdmin } from "@/lib/auth/middleware";
import { obtenerDatosEmpresa } from "@/lib/empresa";
import { CONTENIDO_EJEMPLO, renderizarDesprendiblePdf } from "@/lib/pdf/desprendibles";
import { respuestaPdf } from "@/lib/pdf/respuesta";
import { PLANTILLAS_DESPRENDIBLE, type PlantillaDesprendible } from "@/types/desprendible";

export const runtime = "nodejs";

interface Contexto {
  params: Promise<{ tipo: string }>;
}

/**
 * GET /api/desprendibles/plantillas/[administrativo|colaborador] — Vista previa de la plantilla con
 * datos de ejemplo (solo admin). Sirve para revisar el diseño de cada desprendible.
 */
export async function GET(request: NextRequest, { params }: Contexto) {
  try {
    await requerirAdmin(request);
    const { tipo } = await params;
    if (!(PLANTILLAS_DESPRENDIBLE as readonly string[]).includes(tipo)) {
      throw new ErrorApi(404, "Plantilla no encontrada");
    }
    const plantilla = tipo as PlantillaDesprendible;
    const buffer = await renderizarDesprendiblePdf(plantilla, CONTENIDO_EJEMPLO[plantilla], obtenerDatosEmpresa());
    return respuestaPdf(buffer, `plantilla_desprendible_${plantilla}.pdf`, false);
  } catch (error) {
    return manejarErrorApi(error);
  }
}
