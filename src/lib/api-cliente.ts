// Cliente HTTP para el navegador: llamadas a las API routes con manejo uniforme de errores.

export class ErrorPeticion extends Error {
  constructor(
    public readonly status: number,
    mensaje: string,
    public readonly detalles?: Record<string, string[] | undefined>,
  ) {
    super(mensaje);
    this.name = "ErrorPeticion";
  }
}

export async function peticion<T>(url: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(url, {
    ...opciones,
    credentials: "same-origin",
    headers: {
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...opciones.headers,
    },
  });

  const esJson = respuesta.headers.get("content-type")?.includes("application/json");
  const cuerpo: unknown = esJson ? await respuesta.json().catch(() => null) : null;

  if (!respuesta.ok) {
    const datosError = (cuerpo ?? {}) as { error?: string; detalles?: Record<string, string[]> };
    throw new ErrorPeticion(
      respuesta.status,
      datosError.error ?? `Error ${respuesta.status}: no fue posible completar la solicitud`,
      datosError.detalles,
    );
  }
  return cuerpo as T;
}

/** Construye una query string ignorando valores vacíos. */
export function construirQuery(parametros: Record<string, string | number | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== undefined && valor !== null && valor !== "") params.set(clave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : "";
}

/** Mensaje legible de cualquier error (incluye el primer detalle de validación si existe). */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorPeticion) {
    const primerDetalle = error.detalles ? Object.values(error.detalles).flat().find(Boolean) : undefined;
    return primerDetalle ? `${error.message}: ${primerDetalle}` : error.message;
  }
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado";
}
