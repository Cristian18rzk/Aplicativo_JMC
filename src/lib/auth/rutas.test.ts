import { describe, expect, it } from "vitest";
import { destinoSeguro, inicioSegunRol } from "./rutas";

describe("inicioSegunRol", () => {
  it("lleva al admin a /admin y a cualquier otro rol a /colaborador", () => {
    expect(inicioSegunRol("admin")).toBe("/admin");
    expect(inicioSegunRol("colaborador")).toBe("/colaborador");
    expect(inicioSegunRol("desconocido")).toBe("/colaborador");
  });
});

describe("destinoSeguro (evita redirecciones abiertas tras el login)", () => {
  it("respeta un destino interno de la sección del rol", () => {
    expect(destinoSeguro("/admin/colaboradores", "admin")).toBe("/admin/colaboradores");
    expect(destinoSeguro("/colaborador/desprendibles", "colaborador")).toBe("/colaborador/desprendibles");
  });

  it.each([
    "https://sitio-malicioso.com",
    "//sitio-malicioso.com",
    "/\\sitio-malicioso.com",
    "javascript:alert(1)",
    "",
    null,
    undefined,
  ])("descarta %j y envía al inicio", (destino) => {
    expect(destinoSeguro(destino, "colaborador")).toBe("/colaborador");
  });

  it("no deja que un colaborador sea enviado a la sección del admin", () => {
    expect(destinoSeguro("/admin/colaboradores", "colaborador")).toBe("/colaborador");
  });

  it("no confunde /administrador con /admin", () => {
    expect(destinoSeguro("/administrador", "admin")).toBe("/admin");
  });
});
