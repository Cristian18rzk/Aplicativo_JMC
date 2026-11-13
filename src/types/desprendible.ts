// Tipos de la tabla "Desprendibles" en Airtable.
// El desprendible es el PDF que genera el software de nómina de la empresa: el aplicativo solo lo
// guarda (campo de adjunto en Airtable), lo organiza por colaborador y periodo, y lo entrega.

import type { Area, TipoDocumento } from "./colaborador";

export const TIPOS_PERIODO = ["Quincenal 1", "Quincenal 2", "Mensual"] as const;
export type TipoPeriodo = (typeof TIPOS_PERIODO)[number];

// ─── Plantillas ───────────────────────────────────────────────────────

/**
 * Administrativos y operadores comparten plantilla (nóminas 220 y 221 del programa de nómina); los
 * colaboradores de campo tienen la suya. La plantilla se decide por el área de la ficha.
 */
export const PLANTILLAS_DESPRENDIBLE = ["administrativo", "colaborador"] as const;
export type PlantillaDesprendible = (typeof PLANTILLAS_DESPRENDIBLE)[number];

export const NOMBRES_PLANTILLA: Record<PlantillaDesprendible, string> = {
  administrativo: "Administrativos y operadores",
  colaborador: "Colaboradores de campo",
};

export const DESCRIPCION_PLANTILLA: Record<PlantillaDesprendible, string> = {
  administrativo: "Personal de las áreas Administrativa y Operativa",
  colaborador: "Personal del área Campo",
};

/** "Administrativa" y "Operativa" → plantilla administrativa; "Campo" → plantilla de colaboradores. */
export function plantillaSegunArea(area: Area | string): PlantillaDesprendible {
  return area === "Administrativa" || area === "Operativa" ? "administrativo" : "colaborador";
}

/** Línea de devengado o deducción, tal como aparece en el desprendible del programa de nómina. */
export interface ConceptoNomina {
  concepto: string;
  /** Días, horas o unidades (opcional): "15 d", "8 h", "120 kg". */
  cantidad?: string;
  /** Valor unitario (columna "V/r. Unitario" del programa de nómina). */
  valorUnitario?: number;
  /** Tercero del concepto: fondo de pensión o EPS ("PORVENIR S.A. AFPC", "NUEVA EPS"). */
  entidad?: string;
  valor: number;
}

/**
 * Una fila del detalle de labores del desprendible de campo. Los valores se guardan como texto, tal
 * como los imprime el programa de nómina ("35,48", "130.197,6"), para mostrarlos sin alterarlos.
 */
export interface LaborCampo {
  labor: string;
  semana: string;
  bloque: string;
  /** Peso promedio del racimo. */
  ppr: string;
  valorUnitario: string;
  cantidad: string;
  jornales: string;
  inasistencia: string;
  valorTotal: string;
  promDominical: string;
  festivo: string;
  unidad: string;
  valorRacimo: string;
  secuencia: string;
  total: string;
}

/**
 * Contenido de un desprendible para dibujarlo con la plantilla JMC. Lo llena el lector del PDF del
 * programa de nómina; ambas plantillas reciben la misma estructura y deciden qué mostrar y cómo.
 */
export interface ContenidoDesprendible {
  periodo: string; // YYYY-MM
  tipo_periodo: TipoPeriodo;
  /** Rango liquidado, si el PDF lo trae: "2026-10-01" a "2026-10-15". */
  fechaInicio?: string;
  fechaFin?: string;
  fechaPago?: string;
  /** Número de la nómina en el programa de nómina ("220"). */
  numeroNomina?: string;
  /** Fecha en que se emitió el desprendible (pie de página). Si falta, se usa la de hoy. */
  fechaEmision?: string;
  colaborador: {
    nombre: string;
    /** Como lo trae la nómina: "CC", "NIT"… */
    tipo_documento: TipoDocumento | string;
    documento: string;
    cargo: string;
    area: Area | string;
    salarioBasico?: number;
    diasTrabajados?: number;
    /** Bloque o zona de la plantación (solo colaboradores de campo). */
    zona?: string;
  };
  devengados: ConceptoNomina[];
  deducciones: ConceptoNomina[];
  /** Detalle de labores (solo el desprendible de campo). */
  labores?: LaborCampo[];
  /** Suma de la columna TOTAL de las labores, tal como la imprime el programa de nómina. */
  totalLabores?: string;
  /** Texto del neto en el desprendible de campo: "NETO A PAGAR 30 OCTUBRE". */
  etiquetaNeto?: string;
  /** Cuenta bancaria como la imprime el programa de nómina ("(en blanco)" si no tiene). */
  cuenta?: string;
  totalDevengado: number;
  totalDeducciones: number;
  neto: number;
  observaciones?: string;
  /** Identificador del documento para el pie de página. */
  codigo?: string;
}

/** Tamaño máximo del PDF: Vercel limita el cuerpo de la petición a 4,5 MB y Airtable a 5 MB. */
export const TAMANO_MAXIMO_PDF = 4 * 1024 * 1024;

export interface Desprendible {
  id: string;
  colaboradorId: string;
  colaboradorNombre: string;
  colaboradorCedula: string;
  colaboradorCargo: string;
  periodo: string; // YYYY-MM
  tipo_periodo: TipoPeriodo;
  /** Plantilla del desprendible (según el área del colaborador al cargarlo). */
  plantilla: PlantillaDesprendible;
  /** Nombre original del archivo subido. */
  nombre_archivo: string;
  tamano_bytes: number;
  /** true si el registro tiene el PDF adjunto. */
  tieneArchivo: boolean;
  fecha_carga: string; // YYYY-MM-DD
  cargado_por: string;
}

/** Datos de un desprendible (sin el archivo, que viaja aparte en el FormData). */
export interface DesprendibleInput {
  colaboradorId: string;
  periodo: string;
  tipo_periodo: TipoPeriodo;
  /** Plantilla que el admin indicó al cargar (PDF de administrativos o de colaboradores). Se valida contra el área. */
  plantilla?: PlantillaDesprendible;
}

export interface FiltrosDesprendibles {
  pagina?: number;
  porPagina?: number;
  periodo?: string;
  busqueda?: string;
  colaboradorId?: string;
  plantilla?: PlantillaDesprendible | "";
}
