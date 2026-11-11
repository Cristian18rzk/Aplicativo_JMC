import { z } from "zod";
import { LONGITUD_MAXIMA_SECRETO, erroresPin } from "@/lib/auth/pin";

export const cedulaSchema = z
  .string({ error: "La cédula es obligatoria" })
  .trim()
  // Se toleran puntos y espacios al escribir ("1.098.765.432"): se guardan solo los dígitos
  .transform((v) => v.replace(/[.\s]/g, ""))
  .pipe(z.string().regex(/^\d{5,12}$/, { error: "La cédula debe tener entre 5 y 12 números" }));

/**
 * Login: cédula + secreto (PIN del colaborador, PIN temporal o contraseña del admin).
 * No se aplica la política del PIN: no se revelan reglas y el admin usa una contraseña.
 */
export const loginSchema = z.object({
  cedula: cedulaSchema,
  password: z
    .string({ error: "Escribe tu PIN" })
    .min(1, { error: "Escribe tu PIN" })
    .max(LONGITUD_MAXIMA_SECRETO, { error: "Credenciales inválidas" }),
});

/** PIN nuevo (sin la verificación contra la cédula, que se hace donde se conoce la cédula). */
export const pinSchema = z.string({ error: "Escribe tu PIN" }).superRefine((valor, ctx) => {
  for (const mensaje of erroresPin(valor)) ctx.addIssue({ code: "custom", message: mensaje });
});

export const crearPinSchema = z
  .object({
    pin: pinSchema,
    confirmPin: z.string({ error: "Repite el PIN" }).min(1, { error: "Repite el PIN" }),
  })
  .refine((d) => d.pin === d.confirmPin, { path: ["confirmPin"], message: "Los PIN no coinciden" });

export type LoginSchema = z.infer<typeof loginSchema>;
export type CrearPinSchema = z.infer<typeof crearPinSchema>;
