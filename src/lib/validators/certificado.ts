import { z } from "zod";
import { TIPOS_CERTIFICADO } from "@/types/certificado";

export const generarCertificadoSchema = z.object({
  colaboradorId: z
    .string({ error: "Seleccione un colaborador" })
    .regex(/^rec[a-zA-Z0-9]{14}$/, { error: "Seleccione un colaborador válido" }),
  tipo: z.enum(TIPOS_CERTIFICADO, { error: "Seleccione un tipo de certificado" }).default("Laboral"),
  dirigidoA: z.string().trim().max(150).default("A QUIEN INTERESE"),
  textoAdicional: z.string().trim().max(1500).default(""),
});

export type GenerarCertificadoSchema = z.infer<typeof generarCertificadoSchema>;
