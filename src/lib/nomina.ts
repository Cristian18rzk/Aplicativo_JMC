import type { DetalleLiquidacion, ValoresDesprendible } from "@/types/desprendible";

/**
 * Parámetros de liquidación de nómina (Colombia).
 * Ajuste estos valores cuando cambie la normativa.
 *
 * - HORAS_MES: jornada máxima de 42 horas semanales (Ley 2101 de 2021, vigente desde 15/07/2026)
 *   → 42 h × 30 días / 6 días = 210 horas mensuales.
 * - Hora extra diurna: 125% del valor hora (CST art. 168).
 * - Hora extra nocturna: 175% del valor hora.
 * - Recargo nocturno: 35% adicional sobre el valor hora.
 * - Recargo dominical/festivo: 90% adicional desde 01/07/2026 (Ley 2466 de 2025).
 * - Aportes del trabajador: 4% salud y 4% pensión sobre el IBC (sin auxilio de transporte).
 */
export const PARAMETROS_NOMINA = {
  HORAS_MES: 210,
  FACTOR_EXTRA_DIURNA: 1.25,
  FACTOR_EXTRA_NOCTURNA: 1.75,
  FACTOR_RECARGO_NOCTURNO: 0.35,
  FACTOR_DOMINICAL_FESTIVO: 0.9,
  PORCENTAJE_SALUD: 0.04,
  PORCENTAJE_PENSION: 0.04,
} as const;

const redondear = (n: number) => Math.round(Number.isFinite(n) ? n : 0);

/** Calcula el desglose completo de un desprendible a partir de sus valores de entrada. */
export function calcularLiquidacion(v: ValoresDesprendible): DetalleLiquidacion {
  const p = PARAMETROS_NOMINA;
  const valorHora = v.salario_base / p.HORAS_MES;

  const valorSalario = redondear((v.salario_base / 30) * v.dias_trabajados);
  const valorHorasExtrasDiurnas = redondear(v.horas_extras_diurnas * valorHora * p.FACTOR_EXTRA_DIURNA);
  const valorHorasExtrasNocturnas = redondear(v.horas_extras_nocturnas * valorHora * p.FACTOR_EXTRA_NOCTURNA);
  const valorRecargosNocturnos = redondear(v.recargos_nocturnos * valorHora * p.FACTOR_RECARGO_NOCTURNO);
  const valorDominicalesFestivos = redondear(v.dominicales_festivos * valorHora * p.FACTOR_DOMINICAL_FESTIVO);
  const auxilioTransporte = redondear(v.auxilio_transporte);
  const otrosDevengados = redondear(v.otros_devengados);

  const totalDevengado =
    valorSalario +
    valorHorasExtrasDiurnas +
    valorHorasExtrasNocturnas +
    valorRecargosNocturnos +
    valorDominicalesFestivos +
    auxilioTransporte +
    otrosDevengados;

  const deduccionSalud = redondear(v.deduccion_salud);
  const deduccionPension = redondear(v.deduccion_pension);
  const retencionFuente = redondear(v.retencion_fuente);
  const otrosDescuentos = redondear(v.otros_descuentos);
  const totalDeducciones = deduccionSalud + deduccionPension + retencionFuente + otrosDescuentos;

  return {
    valorHora: redondear(valorHora),
    valorSalario,
    valorHorasExtrasDiurnas,
    valorHorasExtrasNocturnas,
    valorRecargosNocturnos,
    valorDominicalesFestivos,
    auxilioTransporte,
    otrosDevengados,
    totalDevengado,
    deduccionSalud,
    deduccionPension,
    retencionFuente,
    otrosDescuentos,
    totalDeducciones,
    netoAPagar: totalDevengado - totalDeducciones,
  };
}

/**
 * Calcula los aportes de ley del trabajador (salud y pensión) sobre el IBC:
 * todo lo devengado salarial, excluyendo el auxilio de transporte y otros devengados no salariales.
 */
export function calcularAportesLey(v: ValoresDesprendible): { salud: number; pension: number } {
  const d = calcularLiquidacion(v);
  const ibc =
    d.valorSalario +
    d.valorHorasExtrasDiurnas +
    d.valorHorasExtrasNocturnas +
    d.valorRecargosNocturnos +
    d.valorDominicalesFestivos;
  return {
    salud: redondear(ibc * PARAMETROS_NOMINA.PORCENTAJE_SALUD),
    pension: redondear(ibc * PARAMETROS_NOMINA.PORCENTAJE_PENSION),
  };
}

/** Valores en cero, útiles como punto de partida en formularios. */
export const VALORES_DESPRENDIBLE_VACIOS: ValoresDesprendible = {
  salario_base: 0,
  dias_trabajados: 30,
  horas_extras_diurnas: 0,
  horas_extras_nocturnas: 0,
  recargos_nocturnos: 0,
  dominicales_festivos: 0,
  auxilio_transporte: 0,
  otros_devengados: 0,
  deduccion_salud: 0,
  deduccion_pension: 0,
  retencion_fuente: 0,
  otros_descuentos: 0,
};
