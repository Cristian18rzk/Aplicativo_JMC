// Tipos de la tabla "Desprendibles" en Airtable

export const TIPOS_PERIODO = ["Quincenal 1", "Quincenal 2", "Mensual"] as const;
export type TipoPeriodo = (typeof TIPOS_PERIODO)[number];

/** Campos numéricos de entrada (los que el usuario digita o se cargan desde Excel). */
export interface ValoresDesprendible {
  salario_base: number;
  dias_trabajados: number;
  horas_extras_diurnas: number;
  horas_extras_nocturnas: number;
  recargos_nocturnos: number;
  dominicales_festivos: number;
  auxilio_transporte: number;
  otros_devengados: number;
  deduccion_salud: number;
  deduccion_pension: number;
  retencion_fuente: number;
  otros_descuentos: number;
}

export interface Desprendible extends ValoresDesprendible {
  id: string;
  colaboradorId: string;
  colaboradorNombre: string;
  colaboradorCedula: string;
  colaboradorCargo: string;
  periodo: string; // YYYY-MM
  tipo_periodo: TipoPeriodo;
  descripcion_otros: string;
  descripcion_descuentos: string;
  total_devengado: number;
  total_deducciones: number;
  neto_a_pagar: number;
  fecha_generacion: string; // YYYY-MM-DD
}

/** Datos para crear o actualizar un desprendible. */
export interface DesprendibleInput extends ValoresDesprendible {
  colaboradorId: string;
  periodo: string;
  tipo_periodo: TipoPeriodo;
  descripcion_otros: string;
  descripcion_descuentos: string;
}

/** Fila proveniente del cargue masivo (Excel/CSV), identificada por cédula. */
export interface DesprendibleBulkRow extends Partial<ValoresDesprendible> {
  cedula: string;
  periodo: string;
  tipo_periodo: TipoPeriodo;
  dias_trabajados: number;
  descripcion_otros?: string;
  descripcion_descuentos?: string;
  /** Número de fila en el archivo original (para reportar errores). */
  fila?: number;
}

export interface ErrorFilaBulk {
  fila: number;
  cedula: string;
  mensaje: string;
}

export interface ResultadoBulk {
  creados: number;
  errores: ErrorFilaBulk[];
}

export interface FiltrosDesprendibles {
  pagina?: number;
  porPagina?: number;
  periodo?: string;
  busqueda?: string;
  colaboradorId?: string;
}

/** Desglose en pesos de cada concepto de la liquidación. */
export interface DetalleLiquidacion {
  valorHora: number;
  valorSalario: number;
  valorHorasExtrasDiurnas: number;
  valorHorasExtrasNocturnas: number;
  valorRecargosNocturnos: number;
  valorDominicalesFestivos: number;
  auxilioTransporte: number;
  otrosDevengados: number;
  totalDevengado: number;
  deduccionSalud: number;
  deduccionPension: number;
  retencionFuente: number;
  otrosDescuentos: number;
  totalDeducciones: number;
  netoAPagar: number;
}
