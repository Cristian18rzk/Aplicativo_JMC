import { beforeEach, describe, expect, it, vi } from "vitest";
import { crearColaborador, idAirtable } from "@test/fabricas";
import type { Colaborador } from "@/types/colaborador";

vi.mock("@/lib/airtable/colaboradores", () => ({ getMapa: vi.fn() }));
vi.mock("@/lib/airtable/desprendibles", () => ({ getAll: vi.fn() }));
vi.mock("@/lib/airtable/certificados", () => ({ getAll: vi.fn() }));
vi.mock("@/lib/airtable/usuarios", () => ({ situacionesDeAcceso: vi.fn() }));

const { getMapa } = await import("@/lib/airtable/colaboradores");
const desprendiblesDb = await import("@/lib/airtable/desprendibles");
const certificadosDb = await import("@/lib/airtable/certificados");
const { situacionesDeAcceso } = await import("@/lib/airtable/usuarios");
const { calcularResumenAdmin } = await import("./resumen");

const lista = <T,>(datos: T[]) => ({ datos, total: datos.length, pagina: 1, porPagina: datos.length, totalPaginas: 1 });

const ana = crearColaborador({ id: idAirtable("ANA"), nombres: "Ana", apellidos: "Zapata", area: "Administrativa" });
const beto = crearColaborador({ id: idAirtable("BETO"), nombres: "Beto", apellidos: "Arias", area: "Campo" });
const caro = crearColaborador({ id: idAirtable("CARO"), nombres: "Caro", apellidos: "Mejía", area: "Operativa" });
const retirado = crearColaborador({ id: idAirtable("RETIRADO"), estado: "Retirado", area: "Campo" });
const admin = crearColaborador({ id: idAirtable("ADMIN"), rol: "admin", area: "Administrativa" });

function preparar(colaboradores: Colaborador[]) {
  vi.mocked(getMapa).mockResolvedValue(new Map(colaboradores.map((c) => [c.id, c])));
}

beforeEach(() => {
  // 11 de noviembre de 2026 a las 23:30 en Colombia = 12 de noviembre en UTC
  vi.useFakeTimers({ now: new Date("2026-11-12T04:30:00Z"), toFake: ["Date"] });
  preparar([ana, beto, caro, retirado, admin]);
  vi.mocked(desprendiblesDb.getAll).mockResolvedValue(
    lista([
      { colaboradorId: ana.id, periodo: "2026-11" },
      { colaboradorId: ana.id, periodo: "2026-11" }, // dos quincenas: cuenta como una persona
      { colaboradorId: beto.id, periodo: "2026-10" },
    ]) as never,
  );
  vi.mocked(certificadosDb.getAll).mockResolvedValue(
    lista([{ fecha_generacion: "2026-11-03" }, { fecha_generacion: "2026-10-30" }]) as never,
  );
  vi.mocked(situacionesDeAcceso).mockResolvedValue(new Map([[ana.id, "con_pin"], [beto.id, "bloqueado"]]));
});

describe("calcularResumenAdmin", () => {
  it("usa la fecha de Colombia, no la del servidor en UTC", async () => {
    expect((await calcularResumenAdmin()).periodo).toBe("2026-11");
  });

  it("cuenta solo colaboradores activos y una vez por persona", async () => {
    const { colaboradores, desprendibles } = await calcularResumenAdmin();

    expect(colaboradores).toMatchObject({ total: 5, activos: 4 });
    expect(desprendibles).toMatchObject({ cargados: 1, esperados: 4 });
    expect(desprendibles.porPlantilla).toEqual({
      administrativo: { esperados: 2, cargados: 1 },
      colaborador: { esperados: 2, cargados: 0 },
    });
  });

  it("el historial muestra los últimos 6 meses, del más antiguo al actual", async () => {
    const { historial } = (await calcularResumenAdmin()).desprendibles;

    expect(historial.map((h) => h.periodo)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(historial.at(-1)?.cantidad).toBe(2);
    expect(historial.at(-2)?.cantidad).toBe(1);
  });

  it("el acceso no cuenta al admin y trata la falta de cuenta como 'sin PIN'", async () => {
    expect((await calcularResumenAdmin()).acceso).toEqual({ total: 3, conPin: 1, pinTemporal: 0, sinPin: 1, bloqueados: 1 });
  });

  it("lista los pendientes ordenados por apellido", async () => {
    const { pendientes } = await calcularResumenAdmin();

    // Arias, De Prueba (el admin también recibe desprendible), Mejía
    expect(pendientes.sinDesprendible.personas.map((p) => p.nombre)).toEqual(["Beto Arias", "Persona De Prueba", "Caro Mejía"]);
    expect(pendientes.sinAcceso.total).toBe(2);
  });

  it("cuenta los certificados del mes", async () => {
    expect((await calcularResumenAdmin()).certificados).toEqual({ total: 2, esteMes: 1 });
  });

  it("el año cambia bien al calcular el historial de enero", async () => {
    vi.setSystemTime(new Date("2027-01-15T15:00:00Z"));
    const { historial } = (await calcularResumenAdmin()).desprendibles;
    expect(historial[0].periodo).toBe("2026-08");
  });
});
