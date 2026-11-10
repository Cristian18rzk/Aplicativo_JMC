import type Airtable from "airtable";
import type { Colaborador, ListaPaginada } from "@/types/colaborador";
import type {
  Certificado,
  ContenidoCertificado,
  FiltrosCertificados,
  TipoCertificado,
} from "@/types/certificado";
import { fechaHoyISO, paginar } from "@/lib/utils";
import { TABLAS, escaparFormula, leerEnlace, leerTexto, tabla } from "./client";
import { esNoEncontrado, getMapa, nombreCompleto } from "./colaboradores";

type RegistroAirtable = Airtable.Record<Airtable.FieldSet>;

function parsearContenido(json: string): ContenidoCertificado | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ContenidoCertificado;
  } catch {
    return null;
  }
}

function mapearCertificado(registro: RegistroAirtable, colaboradores: Map<string, Colaborador>): Certificado {
  const c = registro.fields;
  const colaboradorId = leerEnlace(c, "colaborador");
  const colaborador = colaboradores.get(colaboradorId);
  const contenido = parsearContenido(leerTexto(c, "contenido_json"));
  return {
    id: registro.id,
    colaboradorId,
    colaboradorNombre: colaborador
      ? nombreCompleto(colaborador)
      : contenido
        ? nombreCompleto(contenido.colaborador)
        : "(Colaborador no encontrado)",
    colaboradorCedula: colaborador?.cedula ?? contenido?.colaborador.cedula ?? "",
    tipo: (leerTexto(c, "tipo") || "Laboral") as TipoCertificado,
    fecha_generacion: leerTexto(c, "fecha_generacion"),
    contenido,
    generado_por: leerTexto(c, "generado_por"),
  };
}

export async function getAll(filtros: FiltrosCertificados = {}): Promise<ListaPaginada<Certificado>> {
  const condiciones: string[] = [];
  if (filtros.tipo) condiciones.push(`{tipo} = "${escaparFormula(filtros.tipo)}"`);

  const [registros, colaboradores] = await Promise.all([
    tabla(TABLAS.certificados)
      .select({
        filterByFormula: condiciones.length ? `AND(${condiciones.join(", ")})` : "",
        sort: [{ field: "fecha_generacion", direction: "desc" }],
      })
      .all(),
    getMapa(),
  ]);

  let certificados = registros.map((r) => mapearCertificado(r, colaboradores));
  if (filtros.colaboradorId) {
    certificados = certificados.filter((c) => c.colaboradorId === filtros.colaboradorId);
  }
  return paginar(certificados, filtros.pagina ?? 1, filtros.porPagina ?? 10);
}

export async function getByColaborador(
  colaboradorId: string,
  filtros: Omit<FiltrosCertificados, "colaboradorId"> = {},
): Promise<ListaPaginada<Certificado>> {
  return getAll({ ...filtros, colaboradorId });
}

export async function getById(id: string): Promise<Certificado | null> {
  try {
    const [registro, colaboradores] = await Promise.all([tabla(TABLAS.certificados).find(id), getMapa()]);
    return mapearCertificado(registro, colaboradores);
  } catch (error) {
    if (esNoEncontrado(error)) return null;
    throw error;
  }
}

export async function create(datos: {
  colaboradorId: string;
  tipo: TipoCertificado;
  contenido: ContenidoCertificado;
  generadoPor: string;
}): Promise<Certificado> {
  const [registro] = await tabla(TABLAS.certificados).create(
    [
      {
        fields: {
          colaborador: [datos.colaboradorId],
          tipo: datos.tipo,
          fecha_generacion: fechaHoyISO(),
          contenido_json: JSON.stringify(datos.contenido),
          generado_por: datos.generadoPor,
        },
      },
    ],
    { typecast: true },
  );
  const colaboradores = await getMapa();
  return mapearCertificado(registro, colaboradores);
}
