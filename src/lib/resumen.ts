import "server-only";
import * as certificadosDb from "@/lib/airtable/certificados";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import * as desprendiblesDb from "@/lib/airtable/desprendibles";
import { situacionesDeAcceso } from "@/lib/airtable/usuarios";
import { AREAS, type Colaborador } from "@/types/colaborador";
import { PLANTILLAS_DESPRENDIBLE, plantillaSegunArea } from "@/types/desprendible";
import type { ListaPendientes, ResumenAdmin } from "@/types/resumen";

const TODOS = 100_000;
const MAXIMO_EN_LISTA = 6;

/** Fecha de hoy en Colombia (el servidor de Vercel está en UTC): "2026-11-11". */
function hoyEnColombia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

/** Los últimos `n` periodos AAAA-MM terminando en `periodo`, del más antiguo al más reciente. */
function periodosAnteriores(periodo: string, n: number): string[] {
  const [anio, mes] = periodo.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const fecha = new Date(Date.UTC(anio, mes - 1 - (n - 1 - i), 1));
    return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function lista(colaboradores: Colaborador[]): ListaPendientes {
  const ordenados = [...colaboradores].sort((a, b) =>
    `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, "es"),
  );
  return {
    total: ordenados.length,
    personas: ordenados.slice(0, MAXIMO_EN_LISTA).map((c) => ({
      id: c.id,
      nombre: `${c.nombres} ${c.apellidos}`.trim(),
      documento: `${c.tipo_documento} ${c.cedula}`,
      cargo: c.cargo,
    })),
  };
}

/**
 * Periodo de nómina que sigue el panel. La nómina de un mes se carga en el mes siguiente (la de
 * octubre llega en noviembre), así que no sirve el mes calendario: se toma el periodo más reciente
 * que ya tiene desprendibles, pero nunca uno anterior al mes pasado. Así, si se deja de cargar,
 * el panel muestra como pendiente la nómina del mes pasado en lugar de un mes viejo ya completo.
 */
function periodoDeNomina(mesActual: string, periodosCargados: string[]): string {
  const mesPasado = periodosAnteriores(mesActual, 2)[0];
  return periodosCargados.reduce((mayor, p) => (p > mayor ? p : mayor), mesPasado);
}

/** Indicadores del panel del administrador, calculados en una sola pasada sobre Airtable. */
export async function calcularResumenAdmin(): Promise<ResumenAdmin> {
  const mesActual = hoyEnColombia().slice(0, 7);

  const [mapa, desprendibles, certificados, situaciones] = await Promise.all([
    colaboradoresDb.getMapa(),
    desprendiblesDb.getAll({ porPagina: TODOS }),
    certificadosDb.getAll({ porPagina: TODOS }),
    situacionesDeAcceso(),
  ]);

  const periodo = periodoDeNomina(
    mesActual,
    desprendibles.datos.map((d) => d.periodo).filter((p) => /^\d{4}-\d{2}$/.test(p)),
  );

  const todos = [...mapa.values()];
  const activos = todos.filter((c) => c.estado === "Activo");

  // Desprendibles del periodo: cuántas personas activas ya tienen al menos uno
  const conDesprendible = new Set(desprendibles.datos.filter((d) => d.periodo === periodo).map((d) => d.colaboradorId));
  const porPlantilla = Object.fromEntries(
    PLANTILLAS_DESPRENDIBLE.map((p) => {
      const grupo = activos.filter((c) => plantillaSegunArea(c.area) === p);
      return [p, { esperados: grupo.length, cargados: grupo.filter((c) => conDesprendible.has(c.id)).length }];
    }),
  ) as ResumenAdmin["desprendibles"]["porPlantilla"];

  const cantidadPorPeriodo = new Map<string, number>();
  for (const d of desprendibles.datos) cantidadPorPeriodo.set(d.periodo, (cantidadPorPeriodo.get(d.periodo) ?? 0) + 1);

  // Acceso: solo colaboradores activos con rol colaborador (el admin entra por otra vía)
  const conCuenta = activos.filter((c) => c.rol === "colaborador");
  const situacion = (c: Colaborador) => situaciones.get(c.id) ?? "sin_pin";

  return {
    periodo,
    colaboradores: {
      total: todos.length,
      activos: activos.length,
      porArea: AREAS.map((area) => ({ area, cantidad: activos.filter((c) => c.area === area).length })).filter(
        (a) => a.cantidad > 0,
      ),
    },
    desprendibles: {
      cargados: activos.filter((c) => conDesprendible.has(c.id)).length,
      esperados: activos.length,
      porPlantilla,
      historial: periodosAnteriores(periodo, 6).map((p) => ({ periodo: p, cantidad: cantidadPorPeriodo.get(p) ?? 0 })),
    },
    acceso: {
      total: conCuenta.length,
      conPin: conCuenta.filter((c) => situacion(c) === "con_pin").length,
      pinTemporal: conCuenta.filter((c) => situacion(c) === "pin_temporal").length,
      sinPin: conCuenta.filter((c) => situacion(c) === "sin_pin").length,
      bloqueados: conCuenta.filter((c) => situacion(c) === "bloqueado").length,
    },
    certificados: {
      total: certificados.total,
      // Los certificados sí se cuentan por mes calendario
      esteMes: certificados.datos.filter((c) => c.fecha_generacion.startsWith(mesActual)).length,
    },
    pendientes: {
      sinDesprendible: lista(activos.filter((c) => !conDesprendible.has(c.id))),
      sinAcceso: lista(conCuenta.filter((c) => situacion(c) !== "con_pin")),
    },
    lote: [...activos]
      .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`, "es"))
      .map((c) => ({
        id: c.id,
        nombre: `${c.nombres} ${c.apellidos}`.trim(),
        plantilla: plantillaSegunArea(c.area),
        cargado: conDesprendible.has(c.id),
        acceso: c.rol === "admin" ? "admin" : situacion(c),
      })),
  };
}
