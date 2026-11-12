// Tipos de la tabla "Desprendibles" en Airtable.
// El desprendible es el PDF que genera el software de nómina de la empresa: el aplicativo solo lo
// guarda (campo de adjunto en Airtable), lo organiza por colaborador y periodo, y lo entrega.

import type { Area, TipoDocumento } from "./colaborador";

export const TIPOS_PERIODO = ["Quincenal 1", "Quincenal 2", "Mensual"] as const;
export type TipoPeriodo = (typeof TIPOS_PERIODO)[number];

// ─── Plantillas ───────────────────────────────────────────────────────

/**
 * Los desprendibles del personal administrativo y los de los colaboradores de campo son distintos:
 * cada grupo tiene su propia plantilla. La plantilla se decide por el área de la ficha.
 */
export const PLANTILLAS_DESPRENDIBLE = ["administrativo", "colaborador"] as const;
export type PlantillaDesprendible = (typeof PLANTILLAS_DESPRENDIBLE)[number];

export const NOMBRES_PLANTILLA: Record<PlantillaDesprendible, string> = {
  administrativo: "Administrativos",
  colaborador: "Colaboradores",
};

export const DESCRIPCION_PLANTILLA: Record<PlantillaDesprendible, string> = {
  administrativo: "Personal del área Administrativa",
  colaborador: "Personal de las áreas Campo y Operativa",
};

/** Área "Administrativa" → plantilla administrativa; "Campo" y "Operativa" → plantilla de colaboradores. */
export function plantillaSegunArea(area: Area | string): PlantillaDesprendible {
  return area === "Administrativa" ? "administrativo" : "colaborador";
}

/** Línea de devengado o deducción, tal como aparece en el desprendible del programa de nómina. */
export interface ConceptoNomina {
  concepto: string;
  /** Días, horas o unidades (opcional): "15 d", "8 h", "120 kg". */
  cantidad?: string;
  valor: number;
}

/**
 * Contenido de un desprendible para dibujarlo con la plantilla JMC. Lo llenará el lector del PDF del
 * programa de nómina; ambas plantillas reciben la misma estructura y deciden qué mostrar y cómo.
 */
export interface ContenidoDesprendible {
  periodo: string; // YYYY-MM
  tipo_periodo: TipoPeriodo;
  /** Rango liquidado, si el PDF lo trae: "2026-10-01" a "2026-10-15". */
  fechaInicio?: string;
  fechaFin?: string;
  fechaPago?: string;
  colaborador: {
    nombre: string;
    tipo_documento: TipoDocumento;
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
