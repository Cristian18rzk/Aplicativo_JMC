/** Vacía los contadores del rate limit en memoria (viven en globalThis, ver src/lib/auth/rate-limit.ts). */
export function limpiarRateLimit(): void {
  (globalThis as { __jmcRateLimit?: Map<string, unknown> }).__jmcRateLimit?.clear();
}
