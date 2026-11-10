import type Airtable from "airtable";
import type { Colaborador, ListaPaginada } from "@/types/colaborador";
import type {
  Desprendible,
  DesprendibleInput,
  FiltrosDesprendibles,
  TipoPeriodo,
  ValoresDesprendible,
} from "@/types/desprendible";
import { calcularLiquidacion } from "@/lib/nomina";
import { fechaHoyISO, normalizarTexto, paginar } from "@/lib/utils";
import {
  TABLAS,
  dividirEnLotes,
  escaparFormula,
  leerEnlace,
  leerNumero,
  leerTexto,
  tabla,
} from "./client";
import { esNoEncontrado, getMapa, nombreCompleto } from "./colaboradores";

type RegistroAirtable = Airtable.Record<Airtable.FieldSet>;

const CAMPOS_NUMERICOS: (keyof ValoresDesprendible)[] = [
  "salario_base",
  "dias_trabajados",
  "horas_extras_diurnas",
  "horas_extras_nocturnas",
  "recargos_nocturnos",
  "dominicales_festivos",
  "auxilio_transporte",
  "otros_devengados",
  "deduccion_salud",
  "deduccion_pension",
  "retencion_fuente",
  "otros_descuentos",
];

function mapearDesprendible(registro: RegistroAirtable, colaboradores: Map<string, Colaborador>): Desprendible {
  const c = registro.fields;
  const valores = Object.fromEntries(
    CAMPOS_NUMERICOS.map((campo) => [campo, leerNumero(c, campo)]),
  ) as unknown as ValoresDesprendible;

  // Los totales se calculan en la aplicación para garantizar consistencia con el PDF.
  const liquidacion = calcularLiquidacion(valores);
  const colaboradorId = leerEnlace(c, "colaborador");
  const colaborador = colaboradores.get(colaboradorId);

  return {
    id: registro.id,
    colaboradorId,
    colaboradorNombre: colaborador ? nombreCompleto(colaborador) : "(Colaborador no encontrado)",
    colaboradorCedula: colaborador?.cedula ?? "",
    colaboradorCargo: colaborador?.cargo ?? "",
    periodo: leerTexto(c, "periodo"),
    tipo_periodo: (leerTexto(c, "tipo_periodo") || "Mensual") as TipoPeriodo,
    descripcion_otros: leerTexto(c, "descripcion_otros"),
    descripcion_descuentos: leerTexto(c, "descripcion_descuentos"),
    ...valores,
    total_devengado: liquidacion.totalDevengado,
    total_deducciones: liquidacion.totalDeducciones,
    neto_a_pagar: liquidacion.netoAPagar,
    fecha_generacion: leerTexto(c, "fecha_generacion"),
  };
}

function aCampos(datos: Partial<DesprendibleInput>): Partial<Airtable.FieldSet> {
  const campos: Partial<Airtable.FieldSet> = {};
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor === undefined) continue;
    if (clave === "colaboradorId") {
      campos.colaborador = [valor as string];
      continue;
    }
    campos[clave] = valor as string | number;
  }
  return campos;
}

const ORDEN_TIPO: Record<string, number> = { "Quincenal 1": 1, "Quincenal 2": 2, Mensual: 3 };

function ordenar(a: Desprendible, b: Desprendible): number {
  if (a.periodo !== b.periodo) return b.periodo.localeCompare(a.periodo);
  if (a.tipo_periodo !== b.tipo_periodo) return (ORDEN_TIPO[b.tipo_periodo] ?? 0) - (ORDEN_TIPO[a.tipo_periodo] ?? 0);
  return a.colaboradorNombre.localeCompare(b.colaboradorNombre, "es");
}

async function consultar(filtros: FiltrosDesprendibles): Promise<Desprendible[]> {
  const condiciones: string[] = [];
  if (filtros.periodo) condiciones.push(`{periodo} = "${escaparFormula(filtros.periodo)}"`);

  const [registros, colaboradores] = await Promise.all([
    tabla(TABLAS.desprendibles)
      .select({ filterByFormula: condiciones.length ? `AND(${condiciones.join(", ")})` : "" })
      .all(),
    getMapa(),
  ]);

  let desprendibles = registros.map((r) => mapearDesprendible(r, colaboradores));

  if (filtros.colaboradorId) {
    desprendibles = desprendibles.filter((d) => d.colaboradorId === filtros.colaboradorId);
  }
  if (filtros.busqueda) {
    const termino = normalizarTexto(filtros.busqueda);
    desprendibles = desprendibles.filter(
      (d) => d.colaboradorCedula.includes(termino) || normalizarTexto(d.colaboradorNombre).includes(termino),
    );
  }
  return desprendibles.sort(ordenar);
}

export async function getAll(filtros: FiltrosDesprendibles = {}): Promise<ListaPaginada<Desprendible>> {
  const desprendibles = await consultar(filtros);
  return paginar(desprendibles, filtros.pagina ?? 1, filtros.porPagina ?? 10);
}

export async function getByColaborador(
  colaboradorId: string,
  filtros: Omit<FiltrosDesprendibles, "colaboradorId"> = {},
): Promise<ListaPaginada<Desprendible>> {
  return getAll({ ...filtros, colaboradorId });
}

/** Todos los desprendibles de un colaborador en un año (para certificados de ingresos). */
export async function getDelAnio(colaboradorId: string, anio: number): Promise<Desprendible[]> {
  const desprendibles = await consultar({ colaboradorId });
  return desprendibles.filter((d) => d.periodo.startsWith(`${anio}-`));
}

export async function getById(id: string): Promise<Desprendible | null> {
  try {
    const [registro, colaboradores] = await Promise.all([tabla(TABLAS.desprendibles).find(id), getMapa()]);
    return mapearDesprendible(registro, colaboradores);
  } catch (error) {
    if (esNoEncontrado(error)) return null;
    throw error;
  }
}

/** Verifica si ya existe un desprendible para el mismo colaborador, periodo y tipo. */
export async function existeDuplicado(
  colaboradorId: string,
  periodo: string,
  tipoPeriodo: TipoPeriodo,
  excluirId?: string,
): Promise<boolean> {
  const desprendibles = await consultar({ periodo, colaboradorId });
  return desprendibles.some((d) => d.tipo_periodo === tipoPeriodo && d.id !== excluirId);
}

export async function create(datos: DesprendibleInput): Promise<Desprendible> {
  const [registro] = await tabla(TABLAS.desprendibles).create(
    [{ fields: { ...aCampos(datos), fecha_generacion: fechaHoyISO() } }],
    { typecast: true },
  );
  const colaboradores = await getMapa();
  return mapearDesprendible(registro, colaboradores);
}

/** Crea varios desprendibles en lotes de 10 (límite de Airtable). */
export async function createBulk(lista: DesprendibleInput[]): Promise<number> {
  let creados = 0;
  const hoy = fechaHoyISO();
  for (const lote of dividirEnLotes(lista)) {
    const registros = await tabla(TABLAS.desprendibles).create(
      lote.map((datos) => ({ fields: { ...aCampos(datos), fecha_generacion: hoy } })),
      { typecast: true },
    );
    creados += registros.length;
  }
  return creados;
}

export async function update(id: string, datos: Partial<DesprendibleInput>): Promise<Desprendible> {
  const [registro] = await tabla(TABLAS.desprendibles).update([{ id, fields: aCampos(datos) }], {
    typecast: true,
  });
  const colaboradores = await getMapa();
  return mapearDesprendible(registro, colaboradores);
}

async function eliminar(id: string): Promise<void> {
  await tabla(TABLAS.desprendibles).destroy(id);
}
export { eliminar as delete };
