import type { NextRequest } from "next/server";
import { nombreArchivoCertificado, renderizarCertificadoPdf } from "@/components/certificados/certificado-pdf";
import * as certificadosDb from "@/lib/airtable/certificados";
import { ErrorApi, manejarErrorApi, validarIdRegistro } from "@/lib/api";
import { requerirSesion, verificarAccesoPropio } from "@/lib/auth/middleware";
import { obtenerDatosEmpresa } from "@/lib/empresa";
import { respuestaPdf } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";

interface Contexto {
  params: Promise<{ id: string }>;
}

/** GET /api/certificados/[id]/pdf?descargar=1 — Genera el PDF del certificado. */
export async function GET(request: NextRequest, { params }: Contexto) {
  try {
    const usuario = await requerirSesion(request);
    const id = validarIdRegistro((await params).id);

    const certificado = await certificadosDb.getById(id);
    if (!certificado) throw new ErrorApi(404, "Certificado no encontrado");
    verificarAccesoPropio(usuario, certificado.colaboradorId);

    const buffer = await renderizarCertificadoPdf({ certificado, empresa: obtenerDatosEmpresa() });
    const nombre = nombreArchivoCertificado(
      certificado.tipo,
      certificado.colaboradorCedula,
      certificado.fecha_generacion,
    );
    return respuestaPdf(buffer, nombre, request.nextUrl.searchParams.get("descargar") === "1");
  } catch (error) {
    return manejarErrorApi(error);
  }
}
