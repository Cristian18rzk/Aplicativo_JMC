import { afterEach, vi } from "vitest";

const fetchReal = globalThis.fetch;

/**
 * Red de seguridad: si un test olvida simular Airtable, la petición falla en vez de llegar a la base real.
 * Solo se permiten las URL "data:" (el logo incrustado de los PDF), que no salen a internet.
 * Los tests que necesiten `fetch` lo reemplazan con vi.stubGlobal.
 */
vi.stubGlobal("fetch", (entrada: string | URL | Request, init?: RequestInit) => {
  const url = entrada instanceof Request ? entrada.url : String(entrada);
  if (url.startsWith("data:")) return fetchReal(entrada, init);
  throw new Error(`Un test intentó hacer una petición de red real (${url}). Simule el módulo de Airtable.`);
});

afterEach(() => {
  vi.useRealTimers();
});
