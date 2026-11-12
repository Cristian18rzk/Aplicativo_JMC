import { describe, expect, it } from "vitest";
import { IDS } from "@test/fabricas";
import { cedulaSchema, crearPinSchema, loginSchema } from "./auth";
import { generarCertificadoSchema } from "./certificado";
import { actualizarColaboradorSchema, crearColaboradorSchema } from "./colaborador";
import { desprendibleSchema, esContenidoPdf, periodoSchema, validarArchivoPdf } from "./desprendible";

describe("cédula", () => {
  it("acepta puntos y espacios y guarda solo los dígitos", () => {
    expect(cedulaSchema.parse(" 1.098.765.432 ")).toBe("1098765432");
  });

  it.each(["1234", "1234567890123", "10a8765432", ""])("rechaza %j", (valor) => {
    expect(cedulaSchema.safeParse(valor).success).toBe(false);
  });
});

describe("login", () => {
  it("permite el PIN vacío (primer ingreso)", () => {
    expect(loginSchema.safeParse({ cedula: "1098765432", password: "" }).success).toBe(true);
  });

  it("limita el largo del secreto", () => {
    expect(loginSchema.safeParse({ cedula: "1098765432", password: "x".repeat(129) }).success).toBe(false);
  });
});

describe("crear PIN", () => {
  it("exige que la confirmación coincida", () => {
    const resultado = crearPinSchema.safeParse({ pin: "4829", confirmPin: "4828" });
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0].path).toEqual(["confirmPin"]);
  });

  it("aplica las reglas del PIN", () => {
    expect(crearPinSchema.safeParse({ pin: "1234", confirmPin: "1234" }).success).toBe(false);
    expect(crearPinSchema.safeParse({ pin: "4829", confirmPin: "4829" }).success).toBe(true);
  });
});

describe("colaborador", () => {
  const valido = {
    tipo_documento: "CC",
    cedula: "1098765432",
    nombres: " Ana ",
    apellidos: "Gómez",
    cargo: "Auxiliar",
    area: "Campo",
    fecha_ingreso: "2024-02-01",
    tipo_contrato: "Fijo",
    estado: "Activo",
    rol: "colaborador",
  };

  it("acepta una ficha válida, recorta espacios y deja correo y teléfono vacíos por defecto", () => {
    expect(crearColaboradorSchema.parse(valido)).toMatchObject({ nombres: "Ana", email: "", telefono: "" });
  });

  it("normaliza el correo a minúsculas", () => {
    expect(crearColaboradorSchema.parse({ ...valido, email: " Ana@Correo.COM " }).email).toBe("ana@correo.com");
  });

  it.each([
    ["un área que no existe", { area: "Gerencia" }],
    ["un rol inventado", { rol: "superadmin" }],
    ["una fecha inválida", { fecha_ingreso: "01/02/2024" }],
    ["un correo inválido", { email: "no-es-correo" }],
    ["un teléfono con letras", { telefono: "300-ABC" }],
    ["nombres vacíos", { nombres: "   " }],
  ])("rechaza %s", (_, cambio) => {
    expect(crearColaboradorSchema.safeParse({ ...valido, ...cambio }).success).toBe(false);
  });

  it("en la edición todos los campos son opcionales, pero los enviados se validan", () => {
    expect(actualizarColaboradorSchema.safeParse({ cargo: "Supervisor" }).success).toBe(true);
    expect(actualizarColaboradorSchema.safeParse({ rol: "superadmin" }).success).toBe(false);
  });
});

describe("desprendible", () => {
  it.each(["2026-01", "2026-12"])("acepta el periodo %s", (p) => {
    expect(periodoSchema.safeParse(p).success).toBe(true);
  });

  it.each(["2026-13", "2026-00", "2026-1", "26-01", "enero"])("rechaza el periodo %s", (p) => {
    expect(periodoSchema.safeParse(p).success).toBe(false);
  });

  it("exige un ID de colaborador con formato de Airtable", () => {
    const base = { periodo: "2026-10", tipo_periodo: "Mensual" };
    expect(desprendibleSchema.safeParse({ ...base, colaboradorId: IDS.colaborador }).success).toBe(true);
    expect(desprendibleSchema.safeParse({ ...base, colaboradorId: "OR(1=1)" }).success).toBe(false);
  });

  it("valida tamaño y tipo del archivo", () => {
    expect(validarArchivoPdf({ name: "a.pdf", size: 1000, type: "application/pdf" })).toBeNull();
    expect(validarArchivoPdf({ name: "a.pdf", size: 0, type: "application/pdf" })).toBe("El archivo está vacío");
    expect(validarArchivoPdf({ name: "a.pdf", size: 5 * 1024 * 1024, type: "application/pdf" })).toMatch(/supera/);
    expect(validarArchivoPdf({ name: "a.exe", size: 1000, type: "application/octet-stream" })).toMatch(/Solo/);
  });

  it("reconoce un PDF por su contenido, no por su nombre", () => {
    expect(esContenidoPdf(new TextEncoder().encode("%PDF-1.7 ..."))).toBe(true);
    expect(esContenidoPdf(new TextEncoder().encode("MZ ejecutable"))).toBe(false);
    expect(esContenidoPdf(new Uint8Array())).toBe(false);
  });
});

describe("certificado", () => {
  it("aplica los valores por defecto", () => {
    expect(generarCertificadoSchema.parse({ colaboradorId: IDS.colaborador })).toEqual({
      colaboradorId: IDS.colaborador,
      tipo: "Laboral",
      dirigidoA: "A QUIEN INTERESE",
      textoAdicional: "",
    });
  });

  it("limita el largo del texto adicional", () => {
    expect(generarCertificadoSchema.safeParse({ colaboradorId: IDS.colaborador, textoAdicional: "x".repeat(1501) }).success).toBe(false);
  });
});
