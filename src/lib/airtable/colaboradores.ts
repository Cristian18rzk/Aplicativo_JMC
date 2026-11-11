import type Airtable from "airtable";
import type {
  Area,
  Colaborador,
  ColaboradorInput,
  EstadoColaborador,
  FiltrosColaboradores,
  ListaPaginada,
  Rol,
  TipoContrato,
} from "@/types/colaborador";
import { normalizarTexto, paginar } from "@/lib/utils";
import { TABLAS, escaparFormula, leerNumero, leerTexto, tabla } from "./client";

type RegistroAirtable = Airtable.Record<Airtable.FieldSet>;

/** Convierte un registro de Airtable en un Colaborador. */
function mapearColaborador(registro: RegistroAirtable): Colaborador {
  const c = registro.fields;
  return {
    id: registro.id,
    cedula: leerTexto(c, "cedula"),
    nombres: leerTexto(c, "nombres"),
    apellidos: leerTexto(c, "apellidos"),
    cargo: leerTexto(c, "cargo"),
    area: (leerTexto(c, "area") || "Administrativa") as Area,
    fecha_ingreso: leerTexto(c, "fecha_ingreso"),
    tipo_contrato: (leerTexto(c, "tipo_contrato") || "Indefinido") as TipoContrato,
    salario_base: leerNumero(c, "salario_base"),
    eps: leerTexto(c, "eps"),
    fondo_pensiones: leerTexto(c, "fondo_pensiones"),
    arl: leerTexto(c, "arl"),
    caja_compensacion: leerTexto(c, "caja_compensacion"),
    cuenta_bancaria: leerTexto(c, "cuenta_bancaria"),
    banco: leerTexto(c, "banco"),
    estado: (leerTexto(c, "estado") || "Activo") as EstadoColaborador,
    rol: (leerTexto(c, "rol") || "colaborador") as Rol,
    email: leerTexto(c, "email"),
    telefono: leerTexto(c, "telefono"),
  };
}

/** Convierte datos de la aplicación en campos de Airtable (omitiendo valores undefined). */
function aCampos(datos: Partial<ColaboradorInput>): Partial<Airtable.FieldSet> {
  const campos: Partial<Airtable.FieldSet> = {};
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor === undefined) continue;
    // Airtable rechaza cadenas vacías en campos select/email/fecha: se envían como null (limpia el campo)
    campos[clave] = valor === "" ? VACIO : valor;
  }
  return campos;
}

/** null limpia un campo en Airtable; los tipos del SDK no lo contemplan. */
const VACIO = null as unknown as undefined;

export const nombreCompleto = (c: Pick<Colaborador, "nombres" | "apellidos">) =>
  `${c.nombres} ${c.apellidos}`.trim();

/** Lista todos los colaboradores (ordenados por apellidos) y aplica filtros y paginación en memoria. */
export async function getAll(filtros: FiltrosColaboradores = {}): Promise<ListaPaginada<Colaborador>> {
  const condiciones: string[] = [];
  if (filtros.area) condiciones.push(`{area} = "${escaparFormula(filtros.area)}"`);
  if (filtros.estado) condiciones.push(`{estado} = "${escaparFormula(filtros.estado)}"`);

  const registros = await tabla(TABLAS.colaboradores)
    .select({
      filterByFormula: condiciones.length ? `AND(${condiciones.join(", ")})` : "",
      sort: [
        { field: "apellidos", direction: "asc" },
        { field: "nombres", direction: "asc" },
      ],
    })
    .all();

  let colaboradores = registros.map(mapearColaborador);

  if (filtros.busqueda) {
    const termino = normalizarTexto(filtros.busqueda);
    colaboradores = colaboradores.filter(
      (c) => c.cedula.includes(termino) || normalizarTexto(nombreCompleto(c)).includes(termino),
    );
  }

  return paginar(colaboradores, filtros.pagina ?? 1, filtros.porPagina ?? 10);
}

/** Mapa id → colaborador para enriquecer desprendibles y certificados. */
export async function getMapa(): Promise<Map<string, Colaborador>> {
  const registros = await tabla(TABLAS.colaboradores).select().all();
  return new Map(registros.map((r) => [r.id, mapearColaborador(r)]));
}

export async function getById(id: string): Promise<Colaborador | null> {
  try {
    const registro = await tabla(TABLAS.colaboradores).find(id);
    return mapearColaborador(registro);
  } catch (error) {
    if (esNoEncontrado(error)) return null;
    throw error;
  }
}

/** Busca por cédula (se usa para evitar duplicados). */
export async function getByCedula(cedula: string): Promise<Colaborador | null> {
  const registros = await tabla(TABLAS.colaboradores)
    .select({ filterByFormula: `{cedula} = "${escaparFormula(cedula)}"`, maxRecords: 1 })
    .firstPage();
  return registros[0] ? mapearColaborador(registros[0]) : null;
}

export async function create(datos: ColaboradorInput): Promise<Colaborador> {
  const existente = await getByCedula(datos.cedula);
  if (existente) {
    throw new ErrorCedulaDuplicada(datos.cedula);
  }
  const [registro] = await tabla(TABLAS.colaboradores).create([{ fields: aCampos(datos) }], {
    typecast: true,
  });
  return mapearColaborador(registro);
}

export async function update(id: string, datos: Partial<ColaboradorInput>): Promise<Colaborador> {
  if (datos.cedula) {
    const existente = await getByCedula(datos.cedula);
    if (existente && existente.id !== id) throw new ErrorCedulaDuplicada(datos.cedula);
  }
  const [registro] = await tabla(TABLAS.colaboradores).update([{ id, fields: aCampos(datos) }], {
    typecast: true,
  });
  return mapearColaborador(registro);
}

async function eliminar(id: string): Promise<void> {
  await tabla(TABLAS.colaboradores).destroy(id);
}
export { eliminar as delete };

// ─── Errores ──────────────────────────────────────────────────────────

export class ErrorCedulaDuplicada extends Error {
  constructor(cedula: string) {
    super(`Ya existe un colaborador con la cédula ${cedula}`);
    this.name = "ErrorCedulaDuplicada";
  }
}

export function esNoEncontrado(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as { statusCode?: number; error?: string };
  return e.statusCode === 404 || e.error === "NOT_FOUND";
}
