import { z } from "zod";
import { TIPOS_PERIODO } from "@/types/desprendible";
import { cedulaSchema } from "./auth";

/** Número no negativo; acepta strings con separadores ("1.234.567", "$ 1.234.567"). */
const numeroNoNegativo = (campo: string) =>
  z.preprocess(
    (valor) => {
      if (valor === null || valor === undefined || valor === "") return 0;
      if (typeof valor === "number") return valor;
      if (typeof valor === "string") {
        const limpio = valor.replace(/[$\s]/g, "");
        // Formato colombiano: puntos de miles y coma decimal
        const normalizado = /,\d{1,2}$/.test(limpio)
          ? limpio.replace(/\./g, "").replace(",", ".")
          : limpio.replace(/[.,](?=\d{3}(\D|$))/g, "");
        return Number(normalizado);
      }
      return valor;
    },
    z
      .number({ error: `${campo} debe ser un número` })
      .min(0, { error: `${campo} no puede ser negativo` })
      .max(10_000_000_000, { error: `${campo} fuera de rango` }),
  );

export const periodoSchema = z
  .string({ error: "El periodo es obligatorio" })
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "El periodo debe tener el formato AAAA-MM" });

const valoresSchema = {
  salario_base: numeroNoNegativo("Salario base"),
  dias_trabajados: numeroNoNegativo("Días trabajados").pipe(
    z.number().max(31, { error: "Los días trabajados no pueden superar 31" }),
  ),
  horas_extras_diurnas: numeroNoNegativo("Horas extras diurnas"),
  horas_extras_nocturnas: numeroNoNegativo("Horas extras nocturnas"),
  recargos_nocturnos: numeroNoNegativo("Recargos nocturnos"),
  dominicales_festivos: numeroNoNegativo("Dominicales y festivos"),
  auxilio_transporte: numeroNoNegativo("Auxilio de transporte"),
  otros_devengados: numeroNoNegativo("Otros devengados"),
  deduccion_salud: numeroNoNegativo("Deducción salud"),
  deduccion_pension: numeroNoNegativo("Deducción pensión"),
  retencion_fuente: numeroNoNegativo("Retención en la fuente"),
  otros_descuentos: numeroNoNegativo("Otros descuentos"),
};

export const desprendibleSchema = z.object({
  colaboradorId: z
    .string({ error: "Seleccione un colaborador" })
    .regex(/^rec[a-zA-Z0-9]{14}$/, { error: "Seleccione un colaborador válido" }),
  periodo: periodoSchema,
  tipo_periodo: z.enum(TIPOS_PERIODO, { error: "Seleccione un tipo de periodo válido" }),
  descripcion_otros: z.string().trim().max(1000).default(""),
  descripcion_descuentos: z.string().trim().max(1000).default(""),
  ...valoresSchema,
});

export const actualizarDesprendibleSchema = desprendibleSchema.partial();

/** Fila del cargue masivo: el colaborador se identifica por cédula. */
export const desprendibleBulkRowSchema = z.object({
  cedula: z.preprocess((v) => (typeof v === "number" ? String(v) : v), cedulaSchema),
  periodo: periodoSchema,
  tipo_periodo: z.enum(TIPOS_PERIODO, {
    error: `Tipo de periodo inválido. Valores permitidos: ${TIPOS_PERIODO.join(", ")}`,
  }),
  descripcion_otros: z.string().trim().max(1000).optional(),
  descripcion_descuentos: z.string().trim().max(1000).optional(),
  ...valoresSchema,
  // En el cargue masivo, salario y aportes pueden omitirse: se toman del colaborador / se calculan
  salario_base: numeroNoNegativo("Salario base").optional(),
  deduccion_salud: numeroNoNegativo("Deducción salud").optional(),
  deduccion_pension: numeroNoNegativo("Deducción pensión").optional(),
});

export const desprendibleBulkSchema = z.object({
  filas: z
    .array(z.unknown())
    .min(1, { error: "No hay filas para cargar" })
    .max(1000, { error: "Máximo 1.000 filas por cargue" }),
  /** Si es true, calcula salud y pensión (4%) cuando la fila no los trae. */
  calcularAportes: z.boolean().default(true),
});

export type DesprendibleSchema = z.infer<typeof desprendibleSchema>;
export type DesprendibleBulkRowSchema = z.infer<typeof desprendibleBulkRowSchema>;
