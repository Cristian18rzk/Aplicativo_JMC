import Airtable from "airtable";

/** Nombres de las tablas en la base de Airtable. */
export const TABLAS = {
  colaboradores: "Colaboradores",
  desprendibles: "Desprendibles",
  certificados: "Certificados",
} as const;

export type NombreTabla = (typeof TABLAS)[keyof typeof TABLAS];

let baseCache: Airtable.Base | null = null;

/**
 * Devuelve la instancia de la base de Airtable configurada desde variables de entorno.
 * Se inicializa de forma perezosa para no fallar durante el build si faltan variables.
 */
export function obtenerBase(): Airtable.Base {
  if (baseCache) return baseCache;
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    throw new Error("Faltan las variables de entorno AIRTABLE_API_KEY y/o AIRTABLE_BASE_ID");
  }
  baseCache = new Airtable({ apiKey, requestTimeout: 30_000 }).base(baseId);
  return baseCache;
}

/** Acceso a una tabla de la base. */
export function tabla(nombre: NombreTabla): Airtable.Table<Airtable.FieldSet> {
  return obtenerBase()(nombre);
}

/** Escapa un valor para usarlo dentro de una cadena entre comillas dobles en filterByFormula. */
export function escaparFormula(valor: string): string {
  return valor.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** Airtable permite crear/actualizar máximo 10 registros por petición. */
export const TAMANO_LOTE = 10;

export function dividirEnLotes<T>(items: T[], tamano = TAMANO_LOTE): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) lotes.push(items.slice(i, i + tamano));
  return lotes;
}

// ─── Lectores seguros de campos ───────────────────────────────────────

type Campos = Airtable.FieldSet;

export function leerTexto(campos: Campos, clave: string): string {
  const valor = campos[clave];
  if (valor === undefined || valor === null) return "";
  if (Array.isArray(valor)) return valor.map(String).join(", ");
  return String(valor);
}

export function leerNumero(campos: Campos, clave: string): number {
  const valor = campos[clave];
  if (typeof valor === "number") return valor;
  if (typeof valor === "string" && valor.trim() !== "") {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Lee un campo de tipo "link to another record" y devuelve el primer ID enlazado. */
export function leerEnlace(campos: Campos, clave: string): string {
  const valor = campos[clave];
  if (Array.isArray(valor) && typeof valor[0] === "string") return valor[0];
  return "";
}
