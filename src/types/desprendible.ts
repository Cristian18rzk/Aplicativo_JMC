// Tipos de la tabla "Desprendibles" en Airtable.
// El desprendible es el PDF que genera el software de nómina de la empresa: el aplicativo solo lo
// guarda (campo de adjunto en Airtable), lo organiza por colaborador y periodo, y lo entrega.

export const TIPOS_PERIODO = ["Quincenal 1", "Quincenal 2", "Mensual"] as const;
export type TipoPeriodo = (typeof TIPOS_PERIODO)[number];

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
}

export interface FiltrosDesprendibles {
  pagina?: number;
  porPagina?: number;
  periodo?: string;
  busqueda?: string;
  colaboradorId?: string;
}
