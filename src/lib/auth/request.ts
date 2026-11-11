/** Utilidades para extraer metadatos de la petición (IP, user agent). */

type ConHeaders = { headers: Headers } | Headers;

function headersDe(origen: ConHeaders): Headers {
  return origen instanceof Headers ? origen : origen.headers;
}

/**
 * IP del cliente. En Vercel `x-forwarded-for` lo fija la plataforma (el primer valor es el cliente).
 * Detrás de otro proxy, asegúrese de que este sobrescriba el encabezado y no lo herede del cliente.
 */
export function obtenerIp(origen: ConHeaders): string {
  const h = headersDe(origen);
  const reenviada = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = reenviada || h.get("x-real-ip")?.trim() || "desconocida";
  // Solo caracteres válidos en IPv4/IPv6, para no usar texto arbitrario en claves y logs
  return /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : "desconocida";
}

export function obtenerUserAgent(origen: ConHeaders): string {
  return (headersDe(origen).get("user-agent") ?? "").slice(0, 500);
}

export const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
