import type { ContenidoDesprendible, PlantillaDesprendible } from "@/types/desprendible";

/** Fragmento de texto de una página con su posición (pt, y medido desde arriba). */
export interface ItemTexto {
  texto: string;
  x: number;
  xFin: number;
  y: number;
}

export interface PaginaTexto {
  numero: number;
  ancho: number;
  alto: number;
  items: ItemTexto[];
}

/**
 * Formatos del programa de nómina:
 * - "campo": desprendible de campo (hoja horizontal, "NOMINA CORRESPONDIENTE MES …" y detalle de labores).
 * - "nomina": comprobante de las nóminas de administrativos y operadores ("Nómina # 220 …").
 */
export type FormatoNomina = "campo" | "nomina";

/** Plantilla que corresponde a cada formato. */
export const PLANTILLA_DEL_FORMATO: Record<FormatoNomina, PlantillaDesprendible> = {
  campo: "colaborador",
  nomina: "administrativo",
};

export type PaginaLeida =
  | { ok: true; numero: number; formato: FormatoNomina; contenido: ContenidoDesprendible }
  | { ok: false; numero: number; motivo: string };

/** Qué pasa con cada página al cruzarla con las fichas. */
export type EstadoPagina = "listo" | "sin_ficha" | "omitido" | "revisar" | "ya_cargado" | "ilegible";

export interface PaginaClasificada {
  pagina: number;
  estado: EstadoPagina;
  /** Explicación para el administrador (vacía cuando está lista). */
  mensaje: string;
  formato?: FormatoNomina;
  nombre: string;
  documento: string;
  neto?: number;
  periodo?: string;
  colaboradorId?: string;
  colaboradorNombre?: string;
  plantilla?: PlantillaDesprendible;
  /** Solo en las páginas listas: lo que se enviará para generar el desprendible. */
  contenido?: ContenidoDesprendible;
}
