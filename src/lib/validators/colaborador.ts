import { z } from "zod";
import { AREAS, ESTADOS_COLABORADOR, ROLES, TIPOS_CONTRATO } from "@/types/colaborador";
import { cedulaSchema } from "./auth";

const textoObligatorio = (campo: string, max = 100) =>
  z
    .string({ error: `${campo} es obligatorio` })
    .trim()
    .min(1, { error: `${campo} es obligatorio` })
    .max(max, { error: `${campo} no puede superar ${max} caracteres` });

const textoOpcional = (max = 100) => z.string().trim().max(max).default("");

export const colaboradorBaseSchema = z.object({
  // Datos personales
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
  salario_base: z.coerce
    .number({ error: "El salario debe ser un número" })
    .int({ error: "El salario debe ser un valor entero en pesos" })
    .min(0, { error: "El salario no puede ser negativo" })
    .max(1_000_000_000, { error: "Salario fuera de rango" }),
  estado: z.enum(ESTADOS_COLABORADOR, { error: "Seleccione un estado válido" }),
  rol: z.enum(ROLES, { error: "Seleccione un rol válido" }),

  // Datos bancarios
  banco: textoOpcional(60),
  cuenta_bancaria: z
    .string()
    .trim()
    .regex(/^[\d-]{0,30}$/, { error: "La cuenta solo puede contener dígitos y guiones" })
    .default(""),

  // Seguridad social
  eps: textoOpcional(),
  fondo_pensiones: textoOpcional(),
  arl: textoOpcional(),
  caja_compensacion: textoOpcional(),
});

export const crearColaboradorSchema = colaboradorBaseSchema;

export const actualizarColaboradorSchema = colaboradorBaseSchema.partial();

export type CrearColaboradorSchema = z.infer<typeof crearColaboradorSchema>;
export type ActualizarColaboradorSchema = z.infer<typeof actualizarColaboradorSchema>;
