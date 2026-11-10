import { z } from "zod";
import { TIPOS_CERTIFICADO } from "@/types/certificado";

export const generarCertificadoSchema = z.object({
  colaboradorId: z
    .string({ error: "Seleccione un colaborador" })
    .regex(/^rec[a-zA-Z0-9]{14}$/, { error: "Seleccione un colaborador válido" }),
  tipo: z.enum(TIPOS_CERTIFICADO, { error: "Seleccione un tipo de certificado" }),
  incluirSalario: z.boolean().default(true),
  dirigidoA: z.string().trim().max(150).default("A QUIEN INTERESE"),
  textoAdicional: z.string().trim().max(1500).default(""),
  anio: z.coerce.number().int().min(2000).max(2100).optional(),
});

export type GenerarCertificadoSchema = z.infer<typeof generarCertificadoSchema>;
