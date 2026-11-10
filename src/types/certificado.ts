// Tipos de la tabla "Certificados" en Airtable
import type { Colaborador } from "./colaborador";

export const TIPOS_CERTIFICADO = ["Laboral", "Ingresos y retenciones"] as const;
export type TipoCertificado = (typeof TIPOS_CERTIFICADO)[number];

/** Totales anuales usados en el certificado de ingresos y retenciones. */
export interface TotalesIngresos {
  anio: number;
  totalDevengado: number;
  deduccionSalud: number;
  deduccionPension: number;
  retencionFuente: number;
  cantidadDesprendibles: number;
}

/** Instantánea de los datos con los que se generó el certificado (se guarda como JSON). */
export interface ContenidoCertificado {
  colaborador: Pick<
    Colaborador,
    | "cedula"
    | "nombres"
    | "apellidos"
    | "cargo"
    | "area"
    | "fecha_ingreso"
    | "tipo_contrato"
    | "salario_base"
    | "estado"
  >;
  incluirSalario: boolean;
  dirigidoA: string;
  textoAdicional: string;
  ingresos?: TotalesIngresos;
}

export interface Certificado {
  id: string;
  colaboradorId: string;
  colaboradorNombre: string;
  colaboradorCedula: string;
  tipo: TipoCertificado;
  fecha_generacion: string; // YYYY-MM-DD
  contenido: ContenidoCertificado | null;
  generado_por: string;
}

export interface GenerarCertificadoInput {
  colaboradorId: string;
  tipo: TipoCertificado;
  incluirSalario: boolean;
  dirigidoA: string;
  textoAdicional: string;
  anio?: number;
}

export interface FiltrosCertificados {
  pagina?: number;
  porPagina?: number;
  colaboradorId?: string;
  tipo?: TipoCertificado | "";
}
