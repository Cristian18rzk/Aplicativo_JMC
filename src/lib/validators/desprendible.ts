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
