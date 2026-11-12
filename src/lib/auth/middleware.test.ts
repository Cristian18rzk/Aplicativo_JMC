import { describe, expect, it, vi } from "vitest";
import { IDS, sesionAdmin, sesionColaborador } from "@test/fabricas";

vi.mock("./session", () => ({ getSession: vi.fn() }));

const { getSession } = await import("./session");
const { requerirAdmin, requerirSesion, verificarAccesoPropio } = await import("./middleware");

const estado = async (fn: () => unknown) => {
  try {
    await fn();
    return 200;
  } catch (error) {
    return (error as { status?: number }).status;
  }
};

describe("requerirSesion / requerirAdmin", () => {
  it("sin sesión responde 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    expect(await estado(() => requerirSesion())).toBe(401);
  });

  it("un colaborador sin ficha asociada responde 401 (un id vacío no puede significar 'todos')", async () => {
    vi.mocked(getSession).mockResolvedValue(sesionColaborador({ id: "" }));
    expect(await estado(() => requerirSesion())).toBe(401);
  });

  it("un colaborador no pasa requerirAdmin (403)", async () => {
    vi.mocked(getSession).mockResolvedValue(sesionColaborador());
    expect(await estado(() => requerirAdmin())).toBe(403);
  });

  it("un admin sin ficha de colaborador sí pasa requerirAdmin", async () => {
    vi.mocked(getSession).mockResolvedValue(sesionAdmin());
    expect(await requerirAdmin()).toEqual(sesionAdmin());
  });
});

describe("verificarAccesoPropio", () => {
  it("el colaborador accede a lo suyo", () => {
    expect(() => verificarAccesoPropio(sesionColaborador(), IDS.colaborador)).not.toThrow();
  });

  it("el colaborador no accede a lo de otro (403)", async () => {
    expect(await estado(() => verificarAccesoPropio(sesionColaborador(), IDS.otroColaborador))).toBe(403);
  });

  it("un recurso sin dueño no queda abierto para un colaborador sin ficha", async () => {
    expect(await estado(() => verificarAccesoPropio(sesionColaborador({ id: "" }), ""))).toBe(403);
  });

  it("el admin accede a todo", () => {
    expect(() => verificarAccesoPropio(sesionAdmin(), IDS.otroColaborador)).not.toThrow();
  });
});
