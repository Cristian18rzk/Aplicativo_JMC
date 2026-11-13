import { z } from "zod";
import { PLANTILLAS_DESPRENDIBLE, TAMANO_MAXIMO_PDF, TIPOS_PERIODO } from "@/types/desprendible";

export const periodoSchema = z
  .string({ error: "El periodo es obligatorio" })
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "El periodo debe tener el formato AAAA-MM" });

export const desprendibleSchema = z.object({
  colaboradorId: z
    .string({ error: "Seleccione un colaborador" })
    .regex(/^rec[a-zA-Z0-9]{14}$/, { error: "Seleccione un colaborador válido" }),
  periodo: periodoSchema,
  tipo_periodo: z.enum(TIPOS_PERIODO, { error: "Seleccione un tipo de periodo válido" }),
  plantilla: z.enum(PLANTILLAS_DESPRENDIBLE, { error: "Seleccione el tipo de desprendible" }).optional(),
});

export const actualizarDesprendibleSchema = desprendibleSchema.partial();

// ─── Contenido leído del PDF del programa de nómina ───────────────────

const texto = (max: number) => z.string().trim().max(max);
const valor = z.number().finite().min(0).max(1_000_000_000);
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

const conceptoSchema = z.object({
  concepto: texto(120).min(1),
  cantidad: texto(20).optional(),
  valorUnitario: valor.optional(),
  entidad: texto(80).optional(),
  valor,
});

const laborSchema = z.object({
  labor: texto(120),
  semana: texto(20),
  bloque: texto(40),
  ppr: texto(20),
  valorUnitario: texto(20),
  cantidad: texto(20),
  jornales: texto(20),
  inasistencia: texto(20),
  valorTotal: texto(20),
  promDominical: texto(20),
  festivo: texto(20),
  unidad: texto(20),
  valorRacimo: texto(20),
  secuencia: texto(20),
  total: texto(20),
});

export const contenidoDesprendibleSchema = z.object({
  periodo: periodoSchema,
  tipo_periodo: z.enum(TIPOS_PERIODO),
  fechaInicio: fecha,
  fechaFin: fecha,
  fechaPago: fecha,
  numeroNomina: texto(20).optional(),
  fechaEmision: fecha,
  colaborador: z.object({
    nombre: texto(150).min(1),
    tipo_documento: texto(10),
    documento: z.string().regex(/^\d{5,12}$/),
    cargo: texto(120),
    area: texto(40),
    salarioBasico: valor.optional(),
    diasTrabajados: z.number().min(0).max(31).optional(),
    zona: texto(80).optional(),
  }),
  devengados: z.array(conceptoSchema).max(60),
  deducciones: z.array(conceptoSchema).max(60),
  labores: z.array(laborSchema).max(120).optional(),
  totalLabores: texto(20).optional(),
  etiquetaNeto: texto(60).optional(),
  cuenta: texto(40).optional(),
  totalDevengado: valor,
  totalDeducciones: valor,
  neto: valor,
  observaciones: texto(1500).optional(),
  codigo: texto(60).optional(),
});

/** Generar el desprendible de una página leída por el lector. */
export const generarDesprendibleSchema = z.object({
  colaboradorId: desprendibleSchema.shape.colaboradorId,
  formato: z.enum(["campo", "nomina"]),
  contenido: contenidoDesprendibleSchema,
});

export type DesprendibleSchema = z.infer<typeof desprendibleSchema>;

/** Error de validación del archivo, o null si es un PDF aceptable. Se usa en cliente y servidor. */
export function validarArchivoPdf(archivo: { name: string; size: number; type: string }): string | null {
  if (archivo.size === 0) return "El archivo está vacío";
  if (archivo.size > TAMANO_MAXIMO_PDF) {
    return `El archivo supera el máximo de ${TAMANO_MAXIMO_PDF / 1024 / 1024} MB`;
  }
  const esPdf = archivo.type === "application/pdf" || archivo.name.toLowerCase().endsWith(".pdf");
  if (!esPdf) return "Solo se permiten archivos PDF";
  return null;
}

/** Firma de los PDF: los primeros bytes deben ser "%PDF-" (no se confía en la extensión ni en el MIME). */
export function esContenidoPdf(bytes: Uint8Array): boolean {
  return bytes.length > 5 && String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-";
}
