import { createHash, timingSafeEqual } from "node:crypto";
import { COOKIE_CSRF, obtenerAuthSecret, urlAplicacion } from "./constantes";
import { ErrorApi } from "@/lib/api";

/**
 * Protección CSRF de los endpoints propios (forgot/reset/logout) reutilizando el token de Auth.js
 * (patrón "double submit cookie" firmado):
 *   cookie  = "<token>|sha256(<token> + AUTH_SECRET)"   (HttpOnly, SameSite=Strict)
 *   cabecera X-CSRF-Token = "<token>"                  (obtenido de GET /api/auth/csrf)
 * Un atacante no puede leer la cookie ni falsificar la firma sin el secreto.
 * Además se exige que Origin coincida con la aplicación.
 */

function iguales(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function origenValido(request: Request): boolean {
  const origen = request.headers.get("origin");
  // Los navegadores modernos siempre envían Origin en POST; si falta, se rechaza
  if (!origen) return false;
  const permitidos = new Set([new URL(urlAplicacion()).origin, new URL(request.url).origin]);
  return permitidos.has(origen);
}

export function verificarCsrf(request: Request & { cookies?: { get(n: string): { value: string } | undefined } }): void {
  if (!origenValido(request)) throw new ErrorApi(403, "Solicitud no permitida");

  const valorCookie =
    request.cookies?.get(COOKIE_CSRF)?.value ??
    request.headers
      .get("cookie")
      ?.split(/;\s*/)
      .find((c) => c.startsWith(`${COOKIE_CSRF}=`))
      ?.slice(COOKIE_CSRF.length + 1);
  const enviado = request.headers.get("x-csrf-token") ?? "";

  const [token, firma] = decodeURIComponent(valorCookie ?? "").split("|");
  if (!token || !firma || !enviado) throw new ErrorApi(403, "Token CSRF inválido. Recarga la página.");

  const esperada = createHash("sha256").update(`${token}${obtenerAuthSecret()}`).digest("hex");
  if (!iguales(firma, esperada) || !iguales(token, enviado)) {
    throw new ErrorApi(403, "Token CSRF inválido. Recarga la página.");
  }
}
