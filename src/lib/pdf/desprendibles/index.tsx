// Punto único para dibujar un desprendible: elige la plantilla y la renderiza a PDF (solo servidor).
import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ComponentType } from "react";
import type { DatosEmpresa } from "@/lib/empresa";
import type { ContenidoDesprendible, PlantillaDesprendible } from "@/types/desprendible";
import type { PlantillaDesprendibleProps } from "./comun";
import { PlantillaAdministrativa } from "./plantilla-administrativa";
import { PlantillaColaborador } from "./plantilla-colaborador";

const PLANTILLAS: Record<PlantillaDesprendible, ComponentType<PlantillaDesprendibleProps>> = {
  administrativo: PlantillaAdministrativa,
  colaborador: PlantillaColaborador,
};

export async function renderizarDesprendiblePdf(
  plantilla: PlantillaDesprendible,
  contenido: ContenidoDesprendible,
  empresa: DatosEmpresa,
): Promise<Buffer> {
  const Plantilla = PLANTILLAS[plantilla];
  return renderToBuffer(<Plantilla contenido={contenido} empresa={empresa} />);
}

/**
 * Datos ficticios para ver cada plantilla mientras se define su diseño
 * (no corresponden a ningún trabajador real).
 */
export const CONTENIDO_EJEMPLO: Record<PlantillaDesprendible, ContenidoDesprendible> = {
  administrativo: {
    periodo: "2026-10",
    tipo_periodo: "Mensual",
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-31",
    colaborador: {
      nombre: "Laura Ejemplo Martínez",
      tipo_documento: "CC",
      documento: "1000000001",
      cargo: "Auxiliar administrativa",
      area: "Administrativa",
      salarioBasico: 2_100_000,
      diasTrabajados: 30,
    },
    devengados: [
      { concepto: "Salario básico", cantidad: "30 d", valor: 2_100_000 },
      { concepto: "Auxilio de transporte", cantidad: "30 d", valor: 200_000 },
      { concepto: "Horas extras diurnas", cantidad: "4 h", valor: 43_750 },
    ],
    deducciones: [
      { concepto: "Aporte salud 4%", valor: 85_750 },
      { concepto: "Aporte pensión 4%", valor: 85_750 },
    ],
    totalDevengado: 2_343_750,
    totalDeducciones: 171_500,
    neto: 2_172_250,
    observaciones: "Vista previa con datos de ejemplo.",
    codigo: "EJEMPLO-ADM",
  },
  colaborador: {
    periodo: "2026-10",
    tipo_periodo: "Quincenal 1",
    fechaInicio: "2026-10-01",
    fechaFin: "2026-10-15",
    colaborador: {
      nombre: "José Ejemplo Pérez",
      tipo_documento: "CC",
      documento: "1000000002",
      cargo: "Cortero",
      area: "Campo",
      diasTrabajados: 13,
      zona: "Guaicaramo",
    },
    devengados: [
      { concepto: "Jornales", cantidad: "13 d", valor: 761_800 },
      { concepto: "Corte de fruto (bonificación)", cantidad: "9.200 kg", valor: 184_000 },
      { concepto: "Auxilio de transporte", cantidad: "13 d", valor: 86_700 },
    ],
    deducciones: [
      { concepto: "Aporte salud 4%", valor: 37_832 },
      { concepto: "Aporte pensión 4%", valor: 37_832 },
      { concepto: "Anticipo", valor: 100_000 },
    ],
    totalDevengado: 1_032_500,
    totalDeducciones: 175_664,
    neto: 856_836,
    observaciones: "Vista previa con datos de ejemplo.",
    codigo: "EJEMPLO-COL",
  },
};
