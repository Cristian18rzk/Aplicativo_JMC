import { z } from "zod";
import { LONGITUD_MAXIMA, REQUISITOS } from "@/lib/auth/fortaleza";

export const cedulaSchema = z
  .string({ error: "La cédula es obligatoria" })
  .trim()
  .regex(/^\d{5,12}$/, { error: "La cédula debe tener entre 5 y 12 dígitos, sin puntos ni espacios" });

export const emailSchema = z
  .string({ error: "El correo es obligatorio" })
  .trim()
  .toLowerCase()
  .min(1, { error: "El correo es obligatorio" })
  .max(254, { error: "El correo es demasiado largo" })
  .pipe(z.email({ error: "Ingresa un correo electrónico válido" }));

/**
 * Política de contraseña verificable en cliente y servidor.
 * El servidor además valida datos personales, historial y la lista de contraseñas comunes.
 */
export const nuevaPasswordSchema = z
  .string({ error: "La contraseña es obligatoria" })
  .superRefine((valor, ctx) => {
    for (const requisito of REQUISITOS) {
      if (!requisito.cumple(valor)) {
        ctx.addIssue({ code: "custom", message: `Debe contener: ${requisito.etiqueta.toLowerCase()}` });
      }
    }
  });

/** En el login no se aplica la política (solo límites), para no revelar reglas ni rechazar cuentas antiguas. */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "La contraseña es obligatoria" })
    .min(1, { error: "La contraseña es obligatoria" })
    .max(LONGITUD_MAXIMA, { error: "Credenciales inválidas" }),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/** Token del enlace: 32 bytes en base64url = 43 caracteres. */
export const tokenResetSchema = z
  .string({ error: "Enlace inválido" })
  .regex(/^[A-Za-z0-9_-]{43}$/, { error: "Enlace inválido" });

export const resetPasswordFormSchema = z
  .object({
    password: nuevaPasswordSchema,
    confirmPassword: z.string({ error: "Confirma la contraseña" }).min(1, { error: "Confirma la contraseña" }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export const resetPasswordSchema = z
  .object({
    token: tokenResetSchema,
    password: nuevaPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden",
  });

export type LoginSchema = z.infer<typeof loginSchema>;
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormSchema = z.infer<typeof resetPasswordFormSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
