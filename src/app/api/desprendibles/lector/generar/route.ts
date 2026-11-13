import { NextResponse, type NextRequest } from "next/server";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import * as desprendiblesDb from "@/lib/airtable/desprendibles";
import { nombreDelUsuario } from "@/lib/airtable/usuarios";
import { ErrorApi, manejarErrorApi } from "@/lib/api";
import { requerirAdmin } from "@/lib/auth/middleware";
import { obtenerDatosEmpresa } from "@/lib/empresa";
import { diferenciaConTotales } from "@/lib/lector/clasificar";
import { PLANTILLA_DEL_FORMATO } from "@/lib/lector/tipos";
import { renderizarDesprendiblePdf } from "@/lib/pdf/desprendibles";
import { generarDesprendibleSchema } from "@/lib/validators/desprendible";
import { NOMBRES_PLANTILLA, plantillaSegunArea, type ContenidoDesprendible } from "@/types/desprendible";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/desprendibles/lector/generar — Genera con la plantilla JMC el desprendible de una página
 * leída por el lector y lo guarda en la ficha del colaborador (solo admin).
 * JSON: { colaboradorId, formato: "campo" | "nomina", contenido }.
 *
 * Se vuelve a validar todo en el servidor: el documento leído debe ser el de la ficha, el formato debe
 * corresponder a su área y no puede existir ya un desprendible de ese periodo.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requerirAdmin(request);
    const cuerpo = await request.json().catch(() => {
      throw new ErrorApi(400, "La solicitud debe enviarse en formato JSON");
    });
    const { colaboradorId, formato, contenido } = generarDesprendibleSchema.parse(cuerpo);

    const colaborador = await colaboradoresDb.getById(colaboradorId);
    if (!colaborador) throw new ErrorApi(404, "El colaborador no existe");
    if (colaborador.cedula.replace(/\D/g, "") !== contenido.colaborador.documento) {
      throw new ErrorApi(400, "El documento del desprendible no corresponde a la ficha del colaborador");
    }

    const plantilla = plantillaSegunArea(colaborador.area);
    if (plantilla !== PLANTILLA_DEL_FORMATO[formato]) {
      throw new ErrorApi(
        400,
        `${colaborador.nombres} ${colaborador.apellidos} es del área ${colaborador.area}: su desprendible va con la plantilla de ${NOMBRES_PLANTILLA[plantilla]}.`,
      );
    }
    const descuadre = diferenciaConTotales(contenido as ContenidoDesprendible);
    if (descuadre) throw new ErrorApi(400, descuadre);

    if (await desprendiblesDb.existeDuplicado(colaboradorId, contenido.periodo, contenido.tipo_periodo)) {
      throw new ErrorApi(409, `Ya existe un desprendible del periodo ${contenido.periodo} para este colaborador.`);
    }

    const buffer = await renderizarDesprendiblePdf(
      plantilla,
      { ...contenido, colaborador: { ...contenido.colaborador, area: colaborador.area } } as ContenidoDesprendible,
      obtenerDatosEmpresa(),
    );
    const desprendible = await desprendiblesDb.create(
      { colaboradorId, periodo: contenido.periodo, tipo_periodo: contenido.tipo_periodo, plantilla },
      { nombre: `desprendible_${contenido.colaborador.documento}_${contenido.periodo}.pdf`, bytes: new Uint8Array(buffer) },
      await nombreDelUsuario(admin.usuarioId),
    );
    return NextResponse.json(desprendible, { status: 201 });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
