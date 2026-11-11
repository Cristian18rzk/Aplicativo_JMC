// Tipos de la tabla "Certificados" en Airtable
import type { Colaborador } from "./colaborador";

/** Solo certificados laborales: el de ingresos y retenciones dependía de los cálculos de nómina, que se retiraron. */
export const TIPOS_CERTIFICADO = ["Laboral"] as const;
export type TipoCertificado = (typeof TIPOS_CERTIFICADO)[number];

/** Instantánea de los datos con los que se generó el certificado (se guarda como JSON). */
export interface ContenidoCertificado {
  colaborador: Pick<
    Colaborador,
    | "tipo_documento"
    | "cedula"
    | "nombres"
    | "apellidos"
    | "cargo"
    | "area"
    | "fecha_ingreso"
    | "tipo_contrato"
    | "estado"
  >;
  dirigidoA: string;
  textoAdicional: string;
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
  dirigidoA: string;
  textoAdicional: string;
}

export interface FiltrosCertificados {
  pagina?: number;
  porPagina?: number;
  colaboradorId?: string;
  tipo?: TipoCertificado | "";
}
