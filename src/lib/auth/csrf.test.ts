import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { COOKIE_CSRF } from "./constantes";
import { verificarCsrf } from "./csrf";

const ORIGEN = "http://localhost:3000";
const TOKEN = "token-csrf-de-prueba";
const firmar = (token: string) => createHash("sha256").update(`${token}${process.env.AUTH_SECRET}`).digest("hex");

function peticion({
  origen = ORIGEN as string | null,
  cookie = `${TOKEN}|${firmar(TOKEN)}` as string | null,
  cabecera = TOKEN as string | null,
} = {}) {
  const headers = new Headers();
  if (origen) headers.set("origin", origen);
  if (cookie) headers.set("cookie", `${COOKIE_CSRF}=${encodeURIComponent(cookie)}`);
  if (cabecera) headers.set("x-csrf-token", cabecera);
  return new Request(`${ORIGEN}/api/auth/logout`, { method: "POST", headers });
}

const estado = (fn: () => void) => {
  try {
    fn();
    return 200;
  } catch (error) {
    return (error as { status?: number }).status;
  }
};

describe("verificarCsrf", () => {
  it("acepta una petición del mismo origen con cookie firmada y cabecera iguales", () => {
    expect(estado(() => verificarCsrf(peticion()))).toBe(200);
  });

  it.each([
    ["sin Origin", { origen: null }],
    ["desde otro sitio", { origen: "https://sitio-malicioso.com" }],
    ["sin cookie", { cookie: null }],
    ["sin cabecera", { cabecera: null }],
    ["con una cabecera distinta al token de la cookie", { cabecera: "otro-token" }],
    ["con la firma de la cookie falsificada", { cookie: `${TOKEN}|${"0".repeat(64)}` }],
    ["con una cookie firmada para otro token", { cookie: `otro|${firmar(TOKEN)}`, cabecera: "otro" }],
  ])("rechaza con 403 una petición %s", (_, opciones) => {
    expect(estado(() => verificarCsrf(peticion(opciones)))).toBe(403);
  });
});
