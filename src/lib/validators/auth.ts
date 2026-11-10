import { z } from "zod";

export const cedulaSchema = z
  .string({ error: "La cédula es obligatoria" })
  .trim()
  .regex(/^\d{5,12}$/, { error: "La cédula debe tener entre 5 y 12 dígitos, sin puntos ni espacios" });

export const loginSchema = z.object({
  cedula: cedulaSchema,
});

export const verifySchema = z.object({
  cedula: cedulaSchema,
  codigo: z
    .string({ error: "El código es obligatorio" })
    .trim()
    .regex(/^\d{6}$/, { error: "El código debe tener exactamente 6 dígitos" }),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type VerifySchema = z.infer<typeof verifySchema>;
