import { z } from "zod";
import { AREAS, ESTADOS_COLABORADOR, ROLES, TIPOS_CONTRATO, TIPOS_DOCUMENTO } from "@/types/colaborador";
import { cedulaSchema } from "./auth";

const textoObligatorio = (campo: string, max = 100) =>
  z
    .string({ error: `${campo} es obligatorio` })
    .trim()
    .min(1, { error: `${campo} es obligatorio` })
    .max(max, { error: `${campo} no puede superar ${max} caracteres` });

export const colaboradorBaseSchema = z.object({
  // Datos personales
  tipo_documento: z.enum(TIPOS_DOCUMENTO, { error: "Seleccione un tipo de documento válido" }),
  cedula: cedulaSchema,
  nombres: textoObligatorio("Nombres"),
  apellidos: textoObligatorio("Apellidos"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.union([z.literal(""), z.email({ error: "Correo electrónico inválido" })]))
    .default(""),
  telefono: z
    .string()
    .trim()
    .regex(/^[\d\s+()-]{0,20}$/, { error: "Teléfono inválido" })
    .default(""),

  // Datos laborales
  cargo: textoObligatorio("Cargo"),
  area: z.enum(AREAS, { error: "Seleccione un área válida" }),
  fecha_ingreso: z.iso.date({ error: "Fecha de ingreso inválida (AAAA-MM-DD)" }),
  tipo_contrato: z.enum(TIPOS_CONTRATO, { error: "Seleccione un tipo de contrato válido" }),
  estado: z.enum(ESTADOS_COLABORADOR, { error: "Seleccione un estado válido" }),
  rol: z.enum(ROLES, { error: "Seleccione un rol válido" }),
});

export const crearColaboradorSchema = colaboradorBaseSchema;

export const actualizarColaboradorSchema = colaboradorBaseSchema.partial();

export type CrearColaboradorSchema = z.infer<typeof crearColaboradorSchema>;
export type ActualizarColaboradorSchema = z.infer<typeof actualizarColaboradorSchema>;
