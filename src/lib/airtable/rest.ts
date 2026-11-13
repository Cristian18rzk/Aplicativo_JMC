/**
 * Cliente mínimo de la API REST de Airtable basado en fetch.
 *
 * Se usa en todo el módulo de autenticación (incluido proxy.ts) porque no depende del SDK
 * de Airtable ni de APIs exclusivas de Node: solo fetch, disponible en cualquier runtime.
 */

const URL_API = "https://api.airtable.com/v0";
const TIEMPO_ESPERA_MS = 15_000;

/** Tablas del módulo de autenticación. */
export const TABLAS_AUTH = {
  usuarios: "Usuarios",
  authLogs: "auth_logs",
  refreshTokens: "refresh_tokens",
  colaboradores: "Colaboradores",
} as const;

export type TablaAuth = (typeof TABLAS_AUTH)[keyof typeof TABLAS_AUTH];

export type ValorCampo = string | number | boolean | null | string[];
export type CamposAirtable = Record<string, ValorCampo | undefined>;

export interface RegistroRest {
  id: string;
  createdTime: string;
  fields: CamposAirtable;
}

/** Error de Airtable con statusCode, compatible con manejarErrorApi(). */
export class ErrorAirtable extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorAirtable";
  }
}

function configuracion() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    throw new Error("Faltan las variables de entorno AIRTABLE_API_KEY y/o AIRTABLE_BASE_ID");
  }
  return { apiKey, baseId };
}

async function solicitar<T>(ruta: string, init: RequestInit = {}, intento = 0): Promise<T> {
  const { apiKey, baseId } = configuracion();
  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_API}/${baseId}/${ruta}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(TIEMPO_ESPERA_MS),
    });
  } catch (error) {
    // Error de red transitorio (timeout de conexión, DNS…): un reintento antes de fallar.
    // Solo en lecturas: una escritura pudo llegar a Airtable y repetirla duplicaría el registro.
    const esLectura = !init.method || init.method === "GET";
    if (esLectura && intento < 1) {
      await new Promise((r) => setTimeout(r, 500));
      return solicitar<T>(ruta, init, intento + 1);
    }
    throw new ErrorAirtable(503, "NETWORK_ERROR", `Sin conexión con Airtable: ${(error as Error).message}`);
  }

  // Airtable limita a 5 peticiones/segundo por base: reintento con espera exponencial corta
  if (respuesta.status === 429 && intento < 3) {
    await new Promise((r) => setTimeout(r, 300 * 2 ** intento));
    return solicitar<T>(ruta, init, intento + 1);
  }

  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => ({}))) as {
      error?: { type?: string; message?: string } | string;
    };
    const tipo = typeof cuerpo.error === "string" ? cuerpo.error : (cuerpo.error?.type ?? "ERROR");
    const mensaje = typeof cuerpo.error === "object" ? (cuerpo.error?.message ?? tipo) : tipo;
    throw new ErrorAirtable(respuesta.status, tipo, mensaje);
  }
  return (await respuesta.json()) as T;
}

const rutaTabla = (tabla: TablaAuth) => encodeURIComponent(tabla);

/** Escapa un valor para usarlo dentro de comillas dobles en filterByFormula. */
export function escaparFormula(valor: string): string {
  return valor.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export interface OpcionesListar {
  filterByFormula?: string;
  maxRecords?: number;
  fields?: string[];
  sort?: { field: string; direction?: "asc" | "desc" }[];
}

/** Lista registros (todas las páginas) que cumplan el filtro. */
export async function listar(tabla: TablaAuth, opciones: OpcionesListar = {}): Promise<RegistroRest[]> {
  const registros: RegistroRest[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams();
    if (opciones.filterByFormula) params.set("filterByFormula", opciones.filterByFormula);
    if (opciones.maxRecords) params.set("maxRecords", String(opciones.maxRecords));
    opciones.fields?.forEach((f) => params.append("fields[]", f));
    opciones.sort?.forEach((s, i) => {
      params.set(`sort[${i}][field]`, s.field);
      params.set(`sort[${i}][direction]`, s.direction ?? "asc");
    });
    if (offset) params.set("offset", offset);
    const pagina = await solicitar<{ records: RegistroRest[]; offset?: string }>(
      `${rutaTabla(tabla)}?${params.toString()}`,
    );
    registros.push(...pagina.records);
    offset = pagina.offset;
  } while (offset && (!opciones.maxRecords || registros.length < opciones.maxRecords));
  return registros;
}

export async function primero(tabla: TablaAuth, filterByFormula: string): Promise<RegistroRest | null> {
  const [registro] = await listar(tabla, { filterByFormula, maxRecords: 1 });
  return registro ?? null;
}

/**
 * Obtiene un registro por ID; devuelve null si no existe o si es de otra tabla.
 *
 * Se busca dentro de la tabla con RECORD_ID() en lugar de pedir `tabla/id` porque Airtable:
 * - responde 403 INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND (no 404) cuando el registro no existe
 *   (p. ej. un refresh token ya borrado en la cookie), y
 * - entrega el registro aunque el ID sea de OTRA tabla de la base.
 */
export async function obtener(tabla: TablaAuth, id: string): Promise<RegistroRest | null> {
  if (!/^rec[a-zA-Z0-9]{14}$/.test(id)) return null;
  return primero(tabla, `RECORD_ID() = "${id}"`);
}

export async function crear(tabla: TablaAuth, fields: CamposAirtable): Promise<RegistroRest> {
  const { records } = await solicitar<{ records: RegistroRest[] }>(rutaTabla(tabla), {
    method: "POST",
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
  });
  return records[0];
}

export async function actualizar(tabla: TablaAuth, id: string, fields: CamposAirtable): Promise<RegistroRest> {
  return solicitar<RegistroRest>(`${rutaTabla(tabla)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ fields, typecast: true }),
  });
}

/** Actualiza varios registros en lotes de 10 (límite de Airtable). */
export async function actualizarVarios(
  tabla: TablaAuth,
  cambios: { id: string; fields: CamposAirtable }[],
): Promise<void> {
  for (let i = 0; i < cambios.length; i += 10) {
    await solicitar(rutaTabla(tabla), {
      method: "PATCH",
      body: JSON.stringify({ records: cambios.slice(i, i + 10), typecast: true }),
    });
  }
}

export async function eliminar(tabla: TablaAuth, id: string): Promise<void> {
  await solicitar(`${rutaTabla(tabla)}/${id}`, { method: "DELETE" });
}

// ─── Lectores de campos ──────────────────────────────────────────────

export function texto(campos: CamposAirtable, clave: string): string {
  const valor = campos[clave];
  if (valor === undefined || valor === null) return "";
  return Array.isArray(valor) ? valor.join(", ") : String(valor);
}

export function numero(campos: CamposAirtable, clave: string): number {
  const valor = campos[clave];
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

export function booleano(campos: CamposAirtable, clave: string): boolean {
  return campos[clave] === true;
}

/** Fecha ISO → milisegundos (0 si vacía o inválida). */
export function fechaMs(campos: CamposAirtable, clave: string): number {
  const valor = texto(campos, clave);
  if (!valor) return 0;
  const ms = new Date(valor).getTime();
  return Number.isFinite(ms) ? ms : 0;
}
