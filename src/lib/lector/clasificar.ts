/**
 * Cruza las páginas leídas con las fichas de colaboradores y decide qué pasa con cada una.
 *
 * Reglas acordadas con la empresa:
 * - Cada página se asigna por el documento (cédula o NIT) a la ficha con esa cédula.
 * - Sin ficha: se avisa y no se carga (se crea la ficha y se vuelve a cargar).
 * - PDF de campo de alguien del área Administrativa u Operativa: se omite, porque su desprendible es
 *   el de las nóminas 220/221.
 * - PDF de nómina 220/221 de alguien del área Campo: queda para revisar (probablemente su área está mal).
 * - Todo en $0: se omite.
 * - Ya tiene desprendible de ese periodo: no se repite.
 */
import { formatCurrency } from "@/lib/utils";
import { plantillaSegunArea, type ContenidoDesprendible } from "@/types/desprendible";
import type { Colaborador } from "@/types/colaborador";
import { PLANTILLA_DEL_FORMATO, type PaginaClasificada, type PaginaLeida } from "./tipos";

type Ficha = Pick<Colaborador, "id" | "nombres" | "apellidos" | "cedula" | "area">;

/** El programa de nómina redondea cada concepto: se tolera esta diferencia (en pesos) con el total impreso. */
const TOLERANCIA_REDONDEO = 2;

/** Mensaje si los conceptos leídos no suman los totales impresos en el PDF, o "" si cuadran. */
export function diferenciaConTotales(contenido: ContenidoDesprendible): string {
  const suma = (lista: { valor: number }[]) => lista.reduce((s, c) => s + c.valor, 0);
  const devengado = suma(contenido.devengados);
  const deducido = suma(contenido.deducciones);
  if (Math.abs(devengado - contenido.totalDevengado) > TOLERANCIA_REDONDEO) {
    return `Los conceptos devengados suman ${formatCurrency(devengado)} pero el total del PDF dice ${formatCurrency(contenido.totalDevengado)}.`;
  }
  if (Math.abs(deducido - contenido.totalDeducciones) > TOLERANCIA_REDONDEO) {
    return `Las deducciones suman ${formatCurrency(deducido)} pero el total del PDF dice ${formatCurrency(contenido.totalDeducciones)}.`;
  }
  return "";
}

/** Clave "colaboradorId|periodo" de los desprendibles mensuales que ya existen. */
export const claveExistente = (colaboradorId: string, periodo: string) => `${colaboradorId}|${periodo}`;

export function clasificarPaginas(
  leidas: PaginaLeida[],
  fichas: Ficha[],
  existentes: Set<string>,
): PaginaClasificada[] {
  const porDocumento = new Map(fichas.map((f) => [f.cedula.replace(/\D/g, ""), f]));
  const vistos = new Set<string>();

  return leidas.map((leida): PaginaClasificada => {
    if (!leida.ok) {
      return { pagina: leida.numero, estado: "ilegible", mensaje: leida.motivo, nombre: "", documento: "" };
    }
    const { contenido, formato } = leida;
    const base = {
      pagina: leida.numero,
      formato,
      nombre: contenido.colaborador.nombre,
      documento: contenido.colaborador.documento,
      neto: contenido.neto,
      periodo: contenido.periodo,
    };

    const ficha = porDocumento.get(contenido.colaborador.documento);
    if (!ficha) {
      return { ...base, estado: "sin_ficha", mensaje: "No hay una ficha con este documento. Créela y vuelva a cargar." };
    }
    const plantilla = plantillaSegunArea(ficha.area);
    const conFicha = {
      ...base,
      colaboradorId: ficha.id,
      colaboradorNombre: `${ficha.nombres} ${ficha.apellidos}`.trim(),
      plantilla,
    };

    if (plantilla !== PLANTILLA_DEL_FORMATO[formato]) {
      return formato === "campo"
        ? {
            ...conFicha,
            estado: "omitido",
            mensaje: `Es del área ${ficha.area}: recibe su desprendible de la nómina de administrativos y operadores.`,
          }
        : {
            ...conFicha,
            estado: "revisar",
            mensaje: `Su ficha está en el área ${ficha.area}. Si es administrativo u operador, cambie su área y vuelva a cargar.`,
          };
    }
    if (contenido.totalDevengado === 0 && contenido.totalDeducciones === 0 && contenido.neto === 0) {
      return { ...conFicha, estado: "omitido", mensaje: "Todos los valores están en $0." };
    }
    const descuadre = diferenciaConTotales(contenido);
    if (descuadre) return { ...conFicha, estado: "revisar", mensaje: descuadre };
    if (existentes.has(claveExistente(ficha.id, contenido.periodo))) {
      return { ...conFicha, estado: "ya_cargado", mensaje: "Ya tiene desprendible de este periodo." };
    }
    const clave = claveExistente(ficha.id, contenido.periodo);
    if (vistos.has(clave)) {
      return { ...conFicha, estado: "revisar", mensaje: "Aparece más de una vez en el archivo: se carga solo la primera." };
    }
    vistos.add(clave);
    return { ...conFicha, estado: "listo", mensaje: "", contenido: { ...contenido, colaborador: { ...contenido.colaborador, area: ficha.area } } };
  });
}
