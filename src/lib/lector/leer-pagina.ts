/**
 * Lee una página del PDF del programa de nómina y la convierte en el contenido de un desprendible.
 * Trabaja sobre el texto con posiciones (ItemTexto): las columnas se reconocen por la ubicación de
 * sus encabezados, no por posiciones fijas, para tolerar pequeños cambios del programa de nómina.
 *
 * Funciones puras (sin acceso a archivos ni a la red): se prueban con páginas construidas a mano.
 */
import { MESES, normalizarTexto } from "@/lib/utils";
import type { ConceptoNomina, ContenidoDesprendible, LaborCampo } from "@/types/desprendible";
import type { ItemTexto, PaginaLeida, PaginaTexto } from "./tipos";

interface Fila {
  y: number;
  items: ItemTexto[];
}

/** Agrupa los fragmentos en filas por su altura (tolerancia en pt) y los ordena de izquierda a derecha. */
export function agruparFilas(items: ItemTexto[], tolerancia = 3): Fila[] {
  const filas: Fila[] = [];
  for (const item of [...items].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const fila = filas.find((f) => Math.abs(f.y - item.y) <= tolerancia);
    if (fila) fila.items.push(item);
    else filas.push({ y: item.y, items: [item] });
  }
  for (const fila of filas) fila.items.sort((a, b) => a.x - b.x);
  return filas.sort((a, b) => a.y - b.y);
}

const textoFila = (f: Fila) => f.items.map((i) => i.texto).join(" ");

/** "$ 1.137.073" → 1137073 · "130.197,6" → 130197.6 · texto no numérico → NaN */
export function aNumero(texto: string): number {
  const limpio = texto.replace(/\$/g, "").replace(/\s+/g, "");
  if (!/^-?[\d.]+(,\d+)?$/.test(limpio)) return Number.NaN;
  return Number(limpio.replace(/\./g, "").replace(",", "."));
}

const esNumero = (texto: string) => !Number.isNaN(aNumero(texto));
const soloDigitos = (texto: string) => texto.replace(/\D/g, "");

/** "OCTUBRE" → 9 (índice del mes), o -1. */
function indiceMes(nombre: string): number {
  return MESES.findIndex((m) => normalizarTexto(m) === normalizarTexto(nombre));
}

/** Detecta el formato de la página. */
export function detectarFormato(filas: Fila[]): "campo" | "nomina" | null {
  const textos = filas.map((f) => normalizarTexto(textoFila(f)));
  if (textos.some((t) => t.includes("nomina correspondiente mes"))) return "campo";
  if (textos.some((t) => /nomina\s*#.*correspondiente al periodo/.test(t))) return "nomina";
  return null;
}

/** El fragmento cuyo borde derecho está más cerca de alguna de las columnas. */
function columnaMasCercana<T extends string>(item: ItemTexto, columnas: Record<T, number>): T {
  let mejor = "" as T;
  let distancia = Infinity;
  for (const [nombre, borde] of Object.entries(columnas) as [T, number][]) {
    const d = Math.abs(item.xFin - borde);
    if (d < distancia) {
      distancia = d;
      mejor = nombre;
    }
  }
  return mejor;
}

const buscarItem = (filas: Fila[], prueba: (t: string) => boolean) => {
  for (const fila of filas) {
    const item = fila.items.find((i) => prueba(normalizarTexto(i.texto)));
    if (item) return { fila, item };
  }
  return null;
};

// ─── Formato de campo ─────────────────────────────────────────────────

/** Columnas del detalle de labores, en el orden de la tabla, con el texto que identifica su encabezado. */
const COLUMNAS_LABOR: [keyof LaborCampo, string, number][] = [
  // [campo, encabezado, borde izquierdo de respaldo si no se encuentra el encabezado]
  ["semana", "sema", 174],
  ["bloque", "bloque", 200],
  ["ppr", "p.p.r.", 246],
  ["valorUnitario", "valor", 279],
  ["cantidad", "cantidad", 325],
  ["jornales", "jornales", 370],
  ["inasistencia", "inasist", 413],
  ["valorTotal", "vr. total", 449],
  ["promDominical", "prom/dom", 494],
  ["festivo", "$ festivo", 539],
  ["unidad", "unidad", 595],
  ["valorRacimo", "racimo", 640],
  ["secuencia", "secuencia", 676],
  ["total", "total", 735],
];

/** Labores y la suma de la columna TOTAL que el programa imprime debajo de la tabla. */
function leerLabores(filas: Fila[]): { labores: LaborCampo[]; total?: string } {
  const encabezado = buscarItem(filas, (t) => t === "labor");
  if (!encabezado) return { labores: [] };
  const yEncabezado = encabezado.fila.y;
  const filasEncabezado = filas.filter((f) => Math.abs(f.y - yEncabezado) <= 12);

  // Borde izquierdo de cada encabezado: una celda pertenece a la columna cuyo encabezado empieza
  // antes de su borde derecho y después del encabezado anterior (los números van alineados a la derecha)
  const inicios = COLUMNAS_LABOR.map(([campo, texto, respaldo]) => {
    const item = filasEncabezado.flatMap((f) => f.items).find((i) => normalizarTexto(i.texto) === texto);
    return { campo, inicio: item?.x ?? respaldo };
  }).sort((a, b) => a.inicio - b.inicio);
  const inicioUnidad = inicios.find((c) => c.campo === "unidad")!.inicio;
  const inicioRacimo = inicios.find((c) => c.campo === "valorRacimo")!.inicio;

  const labores: LaborCampo[] = [];
  const inicioTotal = inicios.find((c) => c.campo === "total")!.inicio;
  let total: string | undefined;
  for (const fila of filas.filter((f) => f.y > yEncabezado + 12)) {
    const primera = fila.items[0];
    // Fila suelta con un solo número bajo la columna TOTAL: la suma de las labores
    if (fila.items.length === 1 && primera && esNumero(primera.texto) && primera.xFin > inicioTotal) {
      total = primera.texto;
      continue;
    }
    // Las filas de labor empiezan con el nombre de la labor en el margen izquierdo
    if (!primera || primera.x > inicios[0].inicio - 10 || esNumero(primera.texto)) continue;
    const labor: LaborCampo = {
      labor: "", semana: "", bloque: "", ppr: "", valorUnitario: "", cantidad: "", jornales: "", inasistencia: "",
      valorTotal: "", promDominical: "", festivo: "", unidad: "", valorRacimo: "", secuencia: "", total: "",
    };
    for (const item of fila.items) {
      if (item.x < inicios[0].inicio - 30) {
        labor.labor = `${labor.labor} ${item.texto}`.trim();
        continue;
      }
      // La unidad de medida es texto ("RAC.", "PALMA", "UND."): va por su borde izquierdo
      if (!esNumero(item.texto) && item.x >= inicioUnidad - 20 && item.x < inicioRacimo) {
        labor.unidad = item.texto;
        continue;
      }
      let campo = inicios[inicios.length - 1].campo;
      for (let i = 0; i < inicios.length; i++) {
        const siguiente = inicios[i + 1]?.inicio ?? Infinity;
        if (item.xFin > inicios[i].inicio && item.xFin <= siguiente + 3) {
          campo = inicios[i].campo;
          break;
        }
      }
      labor[campo] = labor[campo] ? `${labor[campo]} ${item.texto}` : item.texto;
    }
    labores.push(labor);
  }
  return { labores, total };
}

function leerCampo(filas: Fila[], numero: number): PaginaLeida {
  const documento = buscarItem(filas, (t) => t.startsWith("nomina correspondiente mes"));
  const mes = documento ? /mes\s+(\S+)\s+(\d{4})/.exec(normalizarTexto(documento.item.texto)) : null;
  const indice = mes ? indiceMes(mes[1]) : -1;
  if (!mes || indice < 0) return { ok: false, numero, motivo: "No se encontró el mes de la nómina" };
  const periodo = `${mes[2]}-${String(indice + 1).padStart(2, "0")}`;

  const etiquetaNombre = buscarItem(filas, (t) => t === "nombre");
  const etiquetaCargo = etiquetaNombre?.fila.items.find((i) => normalizarTexto(i.texto) === "cargo");
  const nombre = etiquetaNombre
    ? etiquetaNombre.fila.items
        .filter((i) => i.x > etiquetaNombre.item.xFin && (!etiquetaCargo || i.x < etiquetaCargo.x))
        .map((i) => i.texto)
        .join(" ")
    : "";
  const cargo = etiquetaCargo
    ? etiquetaNombre!.fila.items
        .filter((i) => i.x > etiquetaCargo.xFin)
        .map((i) => i.texto)
        .join(" ")
    : "";

  const etiquetaCedula = buscarItem(filas, (t) => t === "cedula:");
  const cedula = etiquetaCedula?.fila.items.find((i) => i.x > etiquetaCedula.item.xFin && soloDigitos(i.texto).length >= 5);
  const documentoNumero = soloDigitos(cedula?.texto ?? "");
  if (!nombre || !documentoNumero) return { ok: false, numero, motivo: "No se encontró el nombre o la cédula" };

  const encabezado = buscarItem(filas, (t) => t === "descripcion");
  const devengo = encabezado?.fila.items.find((i) => normalizarTexto(i.texto) === "devengo");
  const deduccion = encabezado?.fila.items.find((i) => normalizarTexto(i.texto) === "deduccion");
  if (!encabezado || !devengo || !deduccion) return { ok: false, numero, motivo: "No se encontró la tabla de conceptos" };
  const columnas = { devengo: devengo.xFin, deduccion: deduccion.xFin };
  const xConcepto = encabezado.item.x;

  const devengados: ConceptoNomina[] = [];
  const deducciones: ConceptoNomina[] = [];
  let totalDevengado = Number.NaN;
  let totalDeducciones = Number.NaN;
  let neto = Number.NaN;
  let etiquetaNeto: string | undefined;
  let cuenta: string | undefined;

  for (const fila of filas.filter((f) => f.y > encabezado.fila.y)) {
    const texto = normalizarTexto(textoFila(fila));
    const valores = fila.items.filter((i) => i.texto.startsWith("$") && esNumero(i.texto));
    if (texto.includes("neto a pagar")) {
      neto = aNumero(valores[valores.length - 1]?.texto ?? "");
      const etiqueta = fila.items.find((i) => normalizarTexto(i.texto).startsWith("neto a pagar"));
      etiquetaNeto = etiqueta?.texto;
      const etiquetaCuenta = fila.items.find((i) => normalizarTexto(i.texto).startsWith("cuenta"));
      if (etiquetaCuenta) {
        cuenta = fila.items
          .filter((i) => i.x > etiquetaCuenta.xFin && (!etiqueta || i.x < etiqueta.x))
          .map((i) => i.texto)
          .join(" ");
      }
      break;
    }
    if (/\btotal\b/.test(texto) && texto.includes("cedula")) {
      for (const v of valores) {
        if (columnaMasCercana(v, columnas) === "devengo") totalDevengado = aNumero(v.texto);
        else totalDeducciones = aNumero(v.texto);
      }
      continue;
    }
    const concepto = fila.items
      .filter((i) => i.x >= xConcepto - 5 && !i.texto.startsWith("$"))
      .map((i) => i.texto)
      .join(" ");
    if (!concepto || valores.length === 0) continue;
    const valor = valores[0];
    const destino = columnaMasCercana(valor, columnas) === "devengo" ? devengados : deducciones;
    destino.push({ concepto, valor: aNumero(valor.texto) });
  }

  if ([totalDevengado, totalDeducciones, neto].some(Number.isNaN)) {
    return { ok: false, numero, motivo: "No se encontraron los totales o el neto a pagar" };
  }

  const { labores, total: totalLabores } = leerLabores(filas);
  const contenido: ContenidoDesprendible = {
    periodo,
    tipo_periodo: "Mensual",
    colaborador: { nombre, tipo_documento: "CC", documento: documentoNumero, cargo, area: "Campo" },
    devengados,
    deducciones,
    labores,
    ...(totalLabores ? { totalLabores } : {}),
    ...(etiquetaNeto ? { etiquetaNeto } : {}),
    ...(cuenta ? { cuenta } : {}),
    totalDevengado,
    totalDeducciones,
    neto,
  };
  return { ok: true, numero, formato: "campo", contenido };
}

// ─── Formato de nómina (administrativos y operadores) ────────────────

const DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

/** "01/10/2026" → "2026-10-01" */
const fechaISO = (dmy: string) => {
  const [d, m, a] = dmy.split("/");
  return `${a}-${m}-${d}`;
};

function leerNomina(filas: Fila[], numero: number): PaginaLeida {
  const titulo = buscarItem(filas, (t) => /nomina\s*#/.test(t));
  const numeroNomina = titulo ? (/#\s*(\d+)/.exec(titulo.item.texto)?.[1] ?? "") : "";
  const rango = filas.map(textoFila).map((t) => /(\d{2}\/\d{2}\/\d{4})\s+al\s+(\d{2}\/\d{2}\/\d{4})/.exec(t)).find(Boolean);
  if (!rango) return { ok: false, numero, motivo: "No se encontró el periodo de la nómina" };
  const fechaInicio = fechaISO(rango[1]);
  const fechaFin = fechaISO(rango[2]);

  const encabezado = buscarItem(filas, (t) => t === "concepto nomina");
  if (!encabezado) return { ok: false, numero, motivo: "No se encontró la tabla de conceptos" };
  const columna = (texto: string) => encabezado.fila.items.find((i) => normalizarTexto(i.texto) === texto)?.xFin;
  const bordes = {
    cantidad: columna("cantidad") ?? 346,
    unitario: columna("v/r. unitario") ?? 415,
    devengado: columna("devengado") ?? 481,
    deducido: columna("deducido") ?? 540,
  };
  // Los conceptos ocupan la izquierda; la entidad (EPS, fondo) va entre el concepto y la cantidad
  const xEntidad = 175;
  const xNumeros = bordes.cantidad - 60;

  const despues = filas.filter((f) => f.y > encabezado.fila.y);
  const filaNombre = despues[0];
  const etiquetaDoc = filaNombre?.items.find((i) => /^(cc|nit|ce|ti|ppt)$/i.test(i.texto));
  const nombre = filaNombre?.items.filter((i) => !etiquetaDoc || i.x < etiquetaDoc.x).map((i) => i.texto).join(" ") ?? "";
  const documento = soloDigitos(filaNombre?.items.find((i) => etiquetaDoc && i.x > etiquetaDoc.x)?.texto ?? "");
  if (!nombre || !etiquetaDoc || !documento) return { ok: false, numero, motivo: "No se encontró el nombre o el documento" };

  const filaCargo = despues.find((f) => normalizarTexto(f.items[0]?.texto ?? "") === "cargo:");
  const etiquetaSueldo = filaCargo?.items.find((i) => normalizarTexto(i.texto) === "sueldo basico");
  const cargo =
    filaCargo?.items
      .slice(1)
      .filter((i) => !etiquetaSueldo || i.x < etiquetaSueldo.x)
      .map((i) => i.texto)
      .join(" ") ?? "";
  const sueldo = etiquetaSueldo ? filaCargo!.items.find((i) => i.x > etiquetaSueldo.xFin && esNumero(i.texto)) : undefined;

  const devengados: ConceptoNomina[] = [];
  const deducciones: ConceptoNomina[] = [];
  let totalDevengado = Number.NaN;
  let totalDeducciones = Number.NaN;
  let neto = Number.NaN;
  let fechaEmision: string | undefined;

  for (const fila of despues.filter((f) => f.y > (filaCargo?.y ?? filaNombre.y))) {
    const texto = normalizarTexto(textoFila(fila));
    const numeros = fila.items.filter((i) => i.x >= xNumeros && esNumero(i.texto));

    const emision = /^(\S+),\s+(\d{1,2}) de (\S+) de (\d{4})/.exec(texto);
    if (emision && DIAS.includes(emision[1])) {
      const mes = indiceMes(emision[3]);
      if (mes >= 0) fechaEmision = `${emision[4]}-${String(mes + 1).padStart(2, "0")}-${emision[2].padStart(2, "0")}`;
      continue;
    }
    if (texto.includes("neto pagado")) {
      neto = aNumero(numeros[numeros.length - 1]?.texto ?? "");
      continue;
    }
    if (texto.includes("firma del empleado") || /^total\b/.test(texto)) {
      for (const n of numeros) {
        if (columnaMasCercana(n, { devengado: bordes.devengado, deducido: bordes.deducido }) === "devengado") {
          totalDevengado = aNumero(n.texto);
        } else totalDeducciones = aNumero(n.texto);
      }
      continue;
    }
    if (!Number.isNaN(neto)) continue;

    const concepto = fila.items.filter((i) => i.x < xEntidad).map((i) => i.texto).join(" ");
    if (!concepto || numeros.length === 0) continue;
    const entidad = fila.items
      .filter((i) => i.x >= xEntidad && i.x < xNumeros && !esNumero(i.texto))
      .map((i) => i.texto)
      .join(" ");
    const valores: Partial<Record<keyof typeof bordes, number>> = {};
    for (const n of numeros) valores[columnaMasCercana(n, bordes)] = aNumero(n.texto);

    const devengado = valores.devengado ?? 0;
    const cantidad = numeros.find((n) => columnaMasCercana(n, bordes) === "cantidad")?.texto;
    if (devengado > 0 || cantidad) {
      devengados.push({ concepto, cantidad, valorUnitario: valores.unitario, valor: devengado });
    } else {
      deducciones.push({ concepto, ...(entidad ? { entidad } : {}), valor: valores.deducido ?? 0 });
    }
  }

  if ([totalDevengado, totalDeducciones, neto].some(Number.isNaN)) {
    return { ok: false, numero, motivo: "No se encontraron los totales o el neto pagado" };
  }

  const contenido: ContenidoDesprendible = {
    periodo: fechaInicio.slice(0, 7),
    tipo_periodo: "Mensual",
    fechaInicio,
    fechaFin,
    numeroNomina,
    fechaEmision,
    colaborador: {
      nombre,
      tipo_documento: etiquetaDoc.texto.toUpperCase(),
      documento,
      cargo,
      area: "",
      salarioBasico: sueldo ? aNumero(sueldo.texto) : undefined,
    },
    devengados,
    deducciones,
    totalDevengado,
    totalDeducciones,
    neto,
  };
  return { ok: true, numero, formato: "nomina", contenido };
}

/** Lee una página en cualquiera de los dos formatos. */
export function leerPagina(pagina: PaginaTexto): PaginaLeida {
  const filas = agruparFilas(pagina.items);
  const formato = detectarFormato(filas);
  if (formato === "campo") return leerCampo(filas, pagina.numero);
  if (formato === "nomina") return leerNomina(filas, pagina.numero);
  return {
    ok: false,
    numero: pagina.numero,
    motivo: "La página no tiene el formato del programa de nómina (campo o nóminas 220/221)",
  };
}
