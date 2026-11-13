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
    fechaFin: "2026-10-30",
    numeroNomina: "000",
    fechaEmision: "2026-11-06",
    colaborador: {
      nombre: "Ejemplo Pérez Laura",
      tipo_documento: "CC",
      documento: "1000000001",
      cargo: "Operador de maquinaria",
      area: "Operativa",
      salarioBasico: 1_750_905,
      diasTrabajados: 30,
    },
    devengados: [
      { concepto: "Sueldo", cantidad: "30", valorUnitario: 58_363, valor: 1_750_905 },
      { concepto: "Auxilio Alimentación", cantidad: "1", valorUnitario: 300_000, valor: 300_000 },
      { concepto: "Auxilio de Transporte", cantidad: "30", valorUnitario: 8_303, valor: 249_095 },
      { concepto: "Hora Festiva", cantidad: "8", valorUnitario: 15_842, valor: 126_736 },
    ],
    deducciones: [
      { concepto: "Anticipo Nómina", valor: 500_000 },
      { concepto: "Aportes Pension Trabajador", entidad: "FONDO DE EJEMPLO", valor: 70_036 },
      { concepto: "Aportes Salud Trabajador", entidad: "EPS DE EJEMPLO", valor: 70_036 },
      { concepto: "Fondo de Solidaridad", entidad: "FONDO DE EJEMPLO", valor: 0 },
    ],
    totalDevengado: 2_426_736,
    totalDeducciones: 640_072,
    neto: 1_786_664,
    codigo: "EJEMPLO-ADM",
  },
  colaborador: {
    periodo: "2026-10",
    tipo_periodo: "Mensual",
    colaborador: {
      nombre: "EJEMPLO PÉREZ JOSÉ",
      tipo_documento: "CC",
      documento: "1000000002",
      cargo: "AUXILIAR CAMPO",
      area: "Campo",
    },
    devengados: [
      { concepto: "SALARIO PAGADO EL 15 OCTUBRE", valor: 400_000 },
      { concepto: "AUTORIZACIÓN PAGO A TERCEROS", valor: 0 },
      { concepto: "SALARIO PAGADO EL 30 OCTUBRE", valor: 600_000 },
      { concepto: "AUXILIO MEDIO TRANSPORTE", valor: 50_000 },
    ],
    deducciones: [
      { concepto: "APORTE PENSIÓN", valor: 42_000 },
      { concepto: "APORTE SALUD E.P.S", valor: 42_000 },
    ],
    labores: [
      {
        labor: "Cosecha Completa", semana: "40", bloque: "B.1 2018", ppr: "9,50", valorUnitario: "35,00", cantidad: "1.500,00",
        jornales: "6,0", inasistencia: "0,0", valorTotal: "498.750,0", promDominical: "", festivo: "", unidad: "RAC.",
        valorRacimo: "332,5", secuencia: "0,0", total: "498.750",
      },
      {
        labor: "Recogida manual fruta", semana: "41", bloque: "B.1 2018", ppr: "9,50", valorUnitario: "2,87", cantidad: "1.500,00",
        jornales: "6,0", inasistencia: "0,0", valorTotal: "40.897,5", promDominical: "", festivo: "", unidad: "RAC.",
        valorRacimo: "27,3", secuencia: "", total: "40.898",
      },
      {
        labor: "Labores Varias Generales", semana: "42", bloque: "280", ppr: "0,00", valorUnitario: "7958,66", cantidad: "57,77",
        jornales: "8,0", inasistencia: "0,0", valorTotal: "460.352,0", promDominical: "", festivo: "", unidad: "UND.",
        valorRacimo: "0,0", secuencia: "", total: "460.352",
      },
    ],
    totalLabores: "1.000.000",
    etiquetaNeto: "NETO A PAGAR 30 OCTUBRE",
    cuenta: "(en blanco)",
    totalDevengado: 1_050_000,
    totalDeducciones: 84_000,
    neto: 566_000,
    codigo: "EJEMPLO-COL",
  },
};
