/**
 * Matriz de permisos de la API: quién puede ver o cambiar qué.
 * Es la red de seguridad más importante del proyecto: un colaborador nunca debe ver datos de otro.
 * Airtable y la sesión se simulan; las rutas y la lógica de permisos son las reales.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDS, crearColaborador, sesionAdmin, sesionColaborador } from "@test/fabricas";
import type { SesionUsuario } from "@/types/auth";

vi.mock("@/lib/auth/session");
vi.mock("@/lib/airtable/desprendibles");
vi.mock("@/lib/airtable/certificados");
vi.mock("@/lib/airtable/colaboradores");
vi.mock("@/lib/airtable/usuarios");
vi.mock("@/lib/auth/cuentas");
vi.mock("@/lib/resumen");
vi.mock("@/components/certificados/certificado-pdf");

const { getSession } = await import("@/lib/auth/session");
const desprendiblesDb = await import("@/lib/airtable/desprendibles");
const certificadosDb = await import("@/lib/airtable/certificados");
const colaboradoresDb = await import("@/lib/airtable/colaboradores");
const { renderizarCertificadoPdf } = await import("@/components/certificados/certificado-pdf");
const { calcularResumenAdmin } = await import("@/lib/resumen");

const rutas = {
  desprendibles: await import("./desprendibles/route"),
  desprendible: await import("./desprendibles/[id]/route"),
  desprendiblePdf: await import("./desprendibles/[id]/pdf/route"),
  plantilla: await import("./desprendibles/plantillas/[tipo]/route"),
  certificados: await import("./certificados/route"),
  certificadoPdf: await import("./certificados/[id]/pdf/route"),
  colaboradores: await import("./colaboradores/route"),
  colaborador: await import("./colaboradores/[id]/route"),
  acceso: await import("./colaboradores/[id]/acceso/route"),
  resumen: await import("./admin/resumen/route"),
};

const URL_BASE = "http://localhost:3000";
const peticion = (ruta: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(`${URL_BASE}${ruta}`, init);
const conId = (id: string) => ({ params: Promise.resolve({ id }) });
const iniciarSesion = (sesion: SesionUsuario | null) => vi.mocked(getSession).mockResolvedValue(sesion);
const listaVacia = { datos: [], total: 0, pagina: 1, porPagina: 10, totalPaginas: 1 };

/** Desprendible y certificado que pertenecen a OTRO colaborador. */
const desprendibleAjeno = {
  id: IDS.desprendible,
  colaboradorId: IDS.otroColaborador,
  colaboradorNombre: "Otra Persona",
  colaboradorCedula: "1000000002",
  colaboradorCargo: "",
  periodo: "2026-10",
  tipo_periodo: "Mensual" as const,
  plantilla: "administrativo" as const,
  nombre_archivo: "x.pdf",
  tamano_bytes: 10,
  tieneArchivo: true,
  fecha_carga: "2026-10-30",
  cargado_por: "Admin",
};
const certificadoAjeno = {
  id: IDS.certificado,
  colaboradorId: IDS.otroColaborador,
  colaboradorNombre: "Otra Persona",
  colaboradorCedula: "1000000002",
  tipo: "Laboral" as const,
  fecha_generacion: "2026-11-01",
  contenido: null,
  generado_por: "Admin",
};

beforeEach(() => {
  vi.mocked(desprendiblesDb.getAll).mockResolvedValue(listaVacia);
  vi.mocked(certificadosDb.getAll).mockResolvedValue(listaVacia);
  vi.mocked(colaboradoresDb.getAll).mockResolvedValue(listaVacia);
});

describe("sin sesión", () => {
  beforeEach(() => iniciarSesion(null));

  it.each([
    ["GET /api/desprendibles", () => rutas.desprendibles.GET(peticion("/api/desprendibles"))],
    ["GET /api/certificados", () => rutas.certificados.GET(peticion("/api/certificados"))],
    ["GET /api/colaboradores", () => rutas.colaboradores.GET(peticion("/api/colaboradores"))],
    ["GET /api/colaboradores/[id]", () => rutas.colaborador.GET(peticion("/"), conId(IDS.colaborador))],
    ["GET /api/desprendibles/[id]/pdf", () => rutas.desprendiblePdf.GET(peticion("/"), conId(IDS.desprendible))],
    ["GET /api/admin/resumen", () => rutas.resumen.GET(peticion("/api/admin/resumen"))],
  ])("%s responde 401", async (_, llamar) => {
    expect((await llamar()).status).toBe(401);
  });
});

describe("colaborador", () => {
  beforeEach(() => iniciarSesion(sesionColaborador()));

  describe("solo ve lo suyo", () => {
    it("el listado de desprendibles ignora el colaboradorId y la búsqueda que mande", async () => {
      await rutas.desprendibles.GET(peticion(`/api/desprendibles?colaboradorId=${IDS.otroColaborador}&busqueda=perez`));

      expect(desprendiblesDb.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ colaboradorId: IDS.colaborador, busqueda: "" }),
      );
    });

    it("el listado de certificados ignora el colaboradorId que mande", async () => {
      await rutas.certificados.GET(peticion(`/api/certificados?colaboradorId=${IDS.otroColaborador}`));

      expect(certificadosDb.getAll).toHaveBeenCalledWith(expect.objectContaining({ colaboradorId: IDS.colaborador }));
    });

    it("no puede abrir el desprendible de otro (403)", async () => {
      vi.mocked(desprendiblesDb.getById).mockResolvedValue(desprendibleAjeno);

      expect((await rutas.desprendible.GET(peticion("/"), conId(IDS.desprendible))).status).toBe(403);
    });

    it("no puede descargar el PDF del desprendible de otro (403) y el archivo ni se lee", async () => {
      vi.mocked(desprendiblesDb.getById).mockResolvedValue(desprendibleAjeno);

      expect((await rutas.desprendiblePdf.GET(peticion("/"), conId(IDS.desprendible))).status).toBe(403);
      expect(desprendiblesDb.descargarArchivo).not.toHaveBeenCalled();
    });

    it("sí puede descargar el PDF de su propio desprendible", async () => {
      vi.mocked(desprendiblesDb.getById).mockResolvedValue({ ...desprendibleAjeno, colaboradorId: IDS.colaborador });
      vi.mocked(desprendiblesDb.descargarArchivo).mockResolvedValue({ nombre: "x.pdf", bytes: new Uint8Array([37, 80, 68, 70]) });

      const respuesta = await rutas.desprendiblePdf.GET(peticion("/"), conId(IDS.desprendible));

      expect(respuesta.status).toBe(200);
      expect(respuesta.headers.get("Content-Type")).toBe("application/pdf");
      expect(respuesta.headers.get("Cache-Control")).toContain("no-store");
    });

    it("no puede descargar el certificado de otro (403) y el PDF ni se genera", async () => {
      vi.mocked(certificadosDb.getById).mockResolvedValue(certificadoAjeno);

      expect((await rutas.certificadoPdf.GET(peticion("/"), conId(IDS.certificado))).status).toBe(403);
      expect(renderizarCertificadoPdf).not.toHaveBeenCalled();
    });

    it("no puede ver la ficha de otro colaborador (403)", async () => {
      expect((await rutas.colaborador.GET(peticion("/"), conId(IDS.otroColaborador))).status).toBe(403);
      expect(colaboradoresDb.getById).not.toHaveBeenCalled();
    });

    it("sí puede ver su propia ficha", async () => {
      vi.mocked(colaboradoresDb.getById).mockResolvedValue(crearColaborador());
      expect((await rutas.colaborador.GET(peticion("/"), conId(IDS.colaborador))).status).toBe(200);
    });
  });

  describe("certificados de autoservicio", () => {
    const generar = (cuerpo: object) =>
      rutas.certificados.POST(
        peticion("/api/certificados", { method: "POST", body: JSON.stringify(cuerpo), headers: { "content-type": "application/json" } }),
      );

    it("no puede generar un certificado para otro (403)", async () => {
      expect((await generar({ colaboradorId: IDS.otroColaborador })).status).toBe(403);
      expect(certificadosDb.create).not.toHaveBeenCalled();
    });

    it("al generar el suyo, el texto libre que mande se descarta", async () => {
      vi.mocked(colaboradoresDb.getById).mockResolvedValue(crearColaborador());
      vi.mocked(certificadosDb.create).mockResolvedValue(certificadoAjeno);

      expect((await generar({ colaboradorId: IDS.colaborador, textoAdicional: "Gana 10 millones" })).status).toBe(201);
      expect(vi.mocked(certificadosDb.create).mock.lastCall?.[0].contenido.textoAdicional).toBe("");
    });
  });

  describe("no puede hacer nada de administrador (403)", () => {
    const formulario = () => {
      const datos = new FormData();
      datos.set("colaboradorId", IDS.colaborador);
      return datos;
    };

    it.each([
      ["listar colaboradores", () => rutas.colaboradores.GET(peticion("/api/colaboradores"))],
      ["crear colaboradores", () => rutas.colaboradores.POST(peticion("/api/colaboradores", { method: "POST", body: "{}" }))],
      ["editar su propia ficha", () => rutas.colaborador.PUT(peticion("/", { method: "PUT", body: '{"rol":"admin"}' }), conId(IDS.colaborador))],
      ["eliminar colaboradores", () => rutas.colaborador.DELETE(peticion("/", { method: "DELETE" }), conId(IDS.otroColaborador))],
      ["ver el estado de acceso de otro", () => rutas.acceso.GET(peticion("/"), conId(IDS.otroColaborador))],
      ["subir desprendibles", () => rutas.desprendibles.POST(peticion("/api/desprendibles", { method: "POST", body: formulario() }))],
      ["editar desprendibles", () => rutas.desprendible.PUT(peticion("/", { method: "PUT", body: formulario() }), conId(IDS.desprendible))],
      ["eliminar desprendibles", () => rutas.desprendible.DELETE(peticion("/", { method: "DELETE" }), conId(IDS.desprendible))],
      ["ver plantillas", () => rutas.plantilla.GET(peticion("/"), { params: Promise.resolve({ tipo: "administrativo" }) })],
      ["ver el resumen del panel", () => rutas.resumen.GET(peticion("/api/admin/resumen"))],
    ])("%s", async (_, llamar) => {
      expect((await llamar()).status).toBe(403);
      expect(colaboradoresDb.update).not.toHaveBeenCalled();
      expect(colaboradoresDb.delete).not.toHaveBeenCalled();
      expect(desprendiblesDb.create).not.toHaveBeenCalled();
      expect(desprendiblesDb.delete).not.toHaveBeenCalled();
      expect(calcularResumenAdmin).not.toHaveBeenCalled();
    });
  });
});

describe("administrador", () => {
  beforeEach(() => iniciarSesion(sesionAdmin({ id: IDS.colaborador })));

  it("puede filtrar los desprendibles de cualquier colaborador", async () => {
    await rutas.desprendibles.GET(peticion(`/api/desprendibles?colaboradorId=${IDS.otroColaborador}`));
    expect(desprendiblesDb.getAll).toHaveBeenCalledWith(expect.objectContaining({ colaboradorId: IDS.otroColaborador }));
  });

  it("puede abrir el desprendible de cualquier colaborador", async () => {
    vi.mocked(desprendiblesDb.getById).mockResolvedValue(desprendibleAjeno);
    expect((await rutas.desprendible.GET(peticion("/"), conId(IDS.desprendible))).status).toBe(200);
  });

  it("no puede quitarse a sí mismo el rol de administrador", async () => {
    const respuesta = await rutas.colaborador.PUT(
      peticion("/", { method: "PUT", body: JSON.stringify({ rol: "colaborador" }) }),
      conId(IDS.colaborador),
    );
    expect(respuesta.status).toBe(400);
    expect(colaboradoresDb.update).not.toHaveBeenCalled();
  });

  it("no puede eliminar su propia ficha", async () => {
    const respuesta = await rutas.colaborador.DELETE(peticion("/", { method: "DELETE" }), conId(IDS.colaborador));
    expect(respuesta.status).toBe(400);
    expect(colaboradoresDb.delete).not.toHaveBeenCalled();
  });

  it("generar un PIN temporal exige el token CSRF", async () => {
    const respuesta = await rutas.acceso.POST(peticion("/", { method: "POST" }), conId(IDS.otroColaborador));
    expect(respuesta.status).toBe(403);
  });

  it.each(["123", "recCORTO", "../../etc", `${IDS.desprendible}x`])("rechaza el identificador %j con 400", async (id) => {
    expect((await rutas.desprendible.GET(peticion("/"), conId(id))).status).toBe(400);
    expect(desprendiblesDb.getById).not.toHaveBeenCalled();
  });
});
