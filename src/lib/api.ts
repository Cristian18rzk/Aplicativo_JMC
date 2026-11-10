import { NextResponse } from "next/server";
import { z } from "zod";
import { ErrorCedulaDuplicada } from "@/lib/airtable/colaboradores";

/** Error controlado de la API con código HTTP. */
export class ErrorApi extends Error {
  constructor(
    public readonly status: number,
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

export function respuestaError(status: number, mensaje: string, detalles?: unknown) {
  return NextResponse.json({ error: mensaje, ...(detalles ? { detalles } : {}) }, { status });
}

/** Convierte cualquier error en una respuesta JSON adecuada. */
export function manejarErrorApi(error: unknown) {
  if (error instanceof ErrorApi) {
    return respuestaError(error.status, error.message, error.detalles);
  }
  if (error instanceof z.ZodError) {
    return respuestaError(400, "Datos inválidos", z.flattenError(error).fieldErrors);
  }
  if (error instanceof ErrorCedulaDuplicada) {
    return respuestaError(409, error.message);
  }
  const errorAirtable = error as { statusCode?: number; error?: string; message?: string };
  if (typeof errorAirtable?.statusCode === "number") {
    console.error("[Airtable]", errorAirtable.statusCode, errorAirtable.error, errorAirtable.message);
    if (errorAirtable.statusCode === 404) return respuestaError(404, "Registro no encontrado");
    if (errorAirtable.statusCode === 422) {
      return respuestaError(422, `Airtable rechazó los datos: ${errorAirtable.message ?? "revise los campos"}`);
    }
    if (errorAirtable.statusCode === 429) {
      return respuestaError(503, "Airtable está limitando las peticiones. Intente de nuevo en unos segundos.");
    }
    return respuestaError(502, "Error al comunicarse con la base de datos");
  }
  console.error("[API]", error);
  return respuestaError(500, "Error interno del servidor");
}

/** Lee el cuerpo JSON de la petición; lanza 400 si no es JSON válido. */
export async function leerJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ErrorApi(400, "El cuerpo de la petición no es JSON válido");
  }
}

/** Lee parámetros de paginación de la URL con límites seguros. */
export function leerPaginacion(params: URLSearchParams, maxPorPagina = 1000) {
  const pagina = Math.max(1, Number.parseInt(params.get("pagina") ?? "1", 10) || 1);
  const porPagina = Math.min(
    maxPorPagina,
    Math.max(1, Number.parseInt(params.get("porPagina") ?? "10", 10) || 10),
  );
  return { pagina, porPagina };
}

/** Conserva solo las claves que venían en el cuerpo original (evita que los defaults de Zod sobrescriban datos en un PUT). */
export function soloClavesPresentes<T extends object>(datos: T, original: unknown): Partial<T> {
  if (typeof original !== "object" || original === null) return {};
  const claves = new Set(Object.keys(original));
  return Object.fromEntries(Object.entries(datos).filter(([clave]) => claves.has(clave))) as Partial<T>;
}

/** Valida que un parámetro de ruta sea un ID de registro de Airtable. */
export function validarIdRegistro(id: string): string {
  if (!/^rec[a-zA-Z0-9]{14}$/.test(id)) throw new ErrorApi(400, "Identificador inválido");
  return id;
}
