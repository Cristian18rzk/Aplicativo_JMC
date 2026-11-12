import { describe, expect, it } from "vitest";
import { claveIdentificador, generarTokenSeguro, hashesIguales, sha256 } from "./tokens";

describe("tokens", () => {
  it("genera tokens de 43 caracteres base64url y distintos cada vez", () => {
    const a = generarTokenSeguro();
    const b = generarTokenSeguro();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("hashesIguales compara hashes y rechaza vacíos o de distinto largo", () => {
    const h = sha256("x");
    expect(hashesIguales(h, sha256("x"))).toBe(true);
    expect(hashesIguales(h, sha256("y"))).toBe(false);
    expect(hashesIguales(h, "")).toBe(false);
    expect(hashesIguales("", "")).toBe(false);
    expect(hashesIguales(h, h.slice(0, 10))).toBe(false);
  });

  it("claveIdentificador no expone la cédula y es estable", () => {
    const clave = claveIdentificador(" 1098765432 ");
    expect(clave).toBe(claveIdentificador("1098765432"));
    expect(clave).not.toContain("1098765432");
  });
});
