import type Airtable from "airtable";
import type { Colaborador, ListaPaginada } from "@/types/colaborador";
import type { Desprendible, DesprendibleInput, FiltrosDesprendibles, TipoPeriodo } from "@/types/desprendible";
import { fechaHoyISO, normalizarTexto, paginar } from "@/lib/utils";
import { TABLAS, escaparFormula, leerEnlace, leerNumero, leerTexto, tabla } from "./client";
import { esNoEncontrado, getMapa, nombreCompleto } from "./colaboradores";

type RegistroAirtable = Airtable.Record<Airtable.FieldSet>;

/** Campo de adjunto donde se guarda el PDF. */
const CAMPO_ARCHIVO = "archivo";

interface Adjunto {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
}

function leerAdjunto(campos: Airtable.FieldSet): Adjunto | null {
  const valor = campos[CAMPO_ARCHIVO];
  if (!Array.isArray(valor) || valor.length === 0) return null;
  // El último adjunto es el vigente (al reemplazar se limpia el campo, pero se protege por si acaso)
  const adjunto = valor[valor.length - 1] as unknown as Partial<Adjunto>;
  return adjunto?.url ? (adjunto as Adjunto) : null;
}

function mapearDesprendible(registro: RegistroAirtable, colaboradores: Map<string, Colaborador>): Desprendible {
  const c = registro.fields;
  const colaboradorId = leerEnlace(c, "colaborador");
  const colaborador = colaboradores.get(colaboradorId);
  const adjunto = leerAdjunto(c);

  return {
    id: registro.id,
    colaboradorId,
    colaboradorNombre: colaborador ? nombreCompleto(colaborador) : "(Colaborador no encontrado)",
    colaboradorCedula: colaborador?.cedula ?? "",
    colaboradorCargo: colaborador?.cargo ?? "",
    periodo: leerTexto(c, "periodo"),
    tipo_periodo: (leerTexto(c, "tipo_periodo") || "Mensual") as TipoPeriodo,
    nombre_archivo: leerTexto(c, "nombre_archivo") || adjunto?.filename || "",
    tamano_bytes: leerNumero(c, "tamano_bytes") || adjunto?.size || 0,
    tieneArchivo: Boolean(adjunto),
    fecha_carga: leerTexto(c, "fecha_generacion"),
    cargado_por: leerTexto(c, "cargado_por"),
  };
}

function aCampos(datos: Partial<DesprendibleInput>): Partial<Airtable.FieldSet> {
  const campos: Partial<Airtable.FieldSet> = {};
  if (datos.colaboradorId !== undefined) campos.colaborador = [datos.colaboradorId];
  if (datos.periodo !== undefined) campos.periodo = datos.periodo;
  if (datos.tipo_periodo !== undefined) campos.tipo_periodo = datos.tipo_periodo;
  return campos;
}

const ORDEN_TIPO: Record<string, number> = { "Quincenal 1": 1, "Quincenal 2": 2, Mensual: 3 };

function ordenar(a: Desprendible, b: Desprendible): number {
  if (a.periodo !== b.periodo) return b.periodo.localeCompare(a.periodo);
  if (a.tipo_periodo !== b.tipo_periodo) return (ORDEN_TIPO[b.tipo_periodo] ?? 0) - (ORDEN_TIPO[a.tipo_periodo] ?? 0);
  return a.colaboradorNombre.localeCompare(b.colaboradorNombre, "es");
}

async function consultar(filtros: FiltrosDesprendibles): Promise<Desprendible[]> {
  const condiciones: string[] = [];
  if (filtros.periodo) condiciones.push(`{periodo} = "${escaparFormula(filtros.periodo)}"`);

  const [registros, colaboradores] = await Promise.all([
    tabla(TABLAS.desprendibles)
      .select({ filterByFormula: condiciones.length ? `AND(${condiciones.join(", ")})` : "" })
      .all(),
    getMapa(),
  ]);

  let desprendibles = registros.map((r) => mapearDesprendible(r, colaboradores));

  if (filtros.colaboradorId) {
    desprendibles = desprendibles.filter((d) => d.colaboradorId === filtros.colaboradorId);
  }
  if (filtros.busqueda) {
    const termino = normalizarTexto(filtros.busqueda);
    desprendibles = desprendibles.filter(
      (d) => d.colaboradorCedula.includes(termino) || normalizarTexto(d.colaboradorNombre).includes(termino),
    );
  }
  return desprendibles.sort(ordenar);
}

export async function getAll(filtros: FiltrosDesprendibles = {}): Promise<ListaPaginada<Desprendible>> {
  const desprendibles = await consultar(filtros);
  return paginar(desprendibles, filtros.pagina ?? 1, filtros.porPagina ?? 10);
}

export async function getByColaborador(
  colaboradorId: string,
  filtros: Omit<FiltrosDesprendibles, "colaboradorId"> = {},
): Promise<ListaPaginada<Desprendible>> {
  return getAll({ ...filtros, colaboradorId });
}

async function obtenerRegistro(id: string): Promise<RegistroAirtable | null> {
  try {
    return await tabla(TABLAS.desprendibles).find(id);
  } catch (error) {
    if (esNoEncontrado(error)) return null;
    throw error;
  }
}

export async function getById(id: string): Promise<Desprendible | null> {
  const [registro, colaboradores] = await Promise.all([obtenerRegistro(id), getMapa()]);
  return registro ? mapearDesprendible(registro, colaboradores) : null;
}

/** Verifica si ya existe un desprendible para el mismo colaborador, periodo y tipo. */
export async function existeDuplicado(
  colaboradorId: string,
  periodo: string,
  tipoPeriodo: TipoPeriodo,
  excluirId?: string,
): Promise<boolean> {
  const desprendibles = await consultar({ periodo, colaboradorId });
  return desprendibles.some((d) => d.tipo_periodo === tipoPeriodo && d.id !== excluirId);
}

// ─── Archivo PDF (adjunto de Airtable) ────────────────────────────────

export interface ArchivoPdf {
  nombre: string;
  bytes: Uint8Array;
}

/**
 * Sube el PDF al campo de adjunto con la API de contenido de Airtable (máx. 5 MB, en base64).
 * Antes vacía el campo para que el registro tenga siempre un único archivo.
 */
async function subirAdjunto(id: string, archivo: ArchivoPdf): Promise<void> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) throw new Error("Faltan las variables de entorno AIRTABLE_API_KEY y/o AIRTABLE_BASE_ID");

  await tabla(TABLAS.desprendibles).update([{ id, fields: { [CAMPO_ARCHIVO]: [] } }]);

  const respuesta = await fetch(
    `https://content.airtable.com/v0/${baseId}/${id}/${encodeURIComponent(CAMPO_ARCHIVO)}/uploadAttachment`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: "application/pdf",
        filename: archivo.nombre,
        file: Buffer.from(archivo.bytes).toString("base64"),
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!respuesta.ok) {
    const detalle = (await respuesta.json().catch(() => ({}))) as { error?: { message?: string } | string };
    const mensaje = typeof detalle.error === "string" ? detalle.error : (detalle.error?.message ?? "");
    throw Object.assign(new Error(`Airtable rechazó el archivo: ${mensaje || respuesta.status}`), {
      statusCode: respuesta.status,
    });
  }
}

/** Crea el registro y sube el PDF. Si la subida falla, borra el registro para no dejar huérfanos. */
export async function create(datos: DesprendibleInput, archivo: ArchivoPdf, cargadoPor: string): Promise<Desprendible> {
  const [registro] = await tabla(TABLAS.desprendibles).create(
    [
      {
        fields: {
          ...aCampos(datos),
          nombre_archivo: archivo.nombre,
          tamano_bytes: archivo.bytes.length,
          cargado_por: cargadoPor,
          fecha_generacion: fechaHoyISO(),
        },
      },
    ],
    { typecast: true },
  );
  try {
    await subirAdjunto(registro.id, archivo);
  } catch (error) {
    await tabla(TABLAS.desprendibles).destroy(registro.id).catch(() => undefined);
    throw error;
  }
  const creado = await getById(registro.id);
  if (!creado) throw new Error("No fue posible leer el desprendible recién creado");
  return creado;
}

/** Actualiza colaborador/periodo/tipo y, si se envía, reemplaza el PDF. */
export async function update(
  id: string,
  datos: Partial<DesprendibleInput>,
  archivo?: ArchivoPdf,
  cargadoPor?: string,
): Promise<Desprendible> {
  const campos: Partial<Airtable.FieldSet> = { ...aCampos(datos) };
  if (archivo) {
    campos.nombre_archivo = archivo.nombre;
    campos.tamano_bytes = archivo.bytes.length;
    campos.fecha_generacion = fechaHoyISO();
    if (cargadoPor) campos.cargado_por = cargadoPor;
  }
  if (Object.keys(campos).length) {
    await tabla(TABLAS.desprendibles).update([{ id, fields: campos }], { typecast: true });
  }
  if (archivo) await subirAdjunto(id, archivo);

  const actualizado = await getById(id);
  if (!actualizado) throw new Error("No fue posible leer el desprendible actualizado");
  return actualizado;
}

/**
 * Descarga el PDF desde Airtable. Las URLs de adjuntos de Airtable son temporales y públicas para quien
 * las tenga, por eso nunca se envían al navegador: el archivo pasa por la API con control de acceso.
 */
export async function descargarArchivo(id: string): Promise<ArchivoPdf | null> {
  const registro = await obtenerRegistro(id);
  const adjunto = registro ? leerAdjunto(registro.fields) : null;
  if (!adjunto) return null;

  const respuesta = await fetch(adjunto.url, { signal: AbortSignal.timeout(30_000), cache: "no-store" });
  if (!respuesta.ok) throw new Error(`No fue posible descargar el archivo de Airtable (${respuesta.status})`);
  return { nombre: adjunto.filename, bytes: new Uint8Array(await respuesta.arrayBuffer()) };
}

async function eliminar(id: string): Promise<void> {
  await tabla(TABLAS.desprendibles).destroy(id);
}
export { eliminar as delete };
