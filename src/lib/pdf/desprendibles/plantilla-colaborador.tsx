/**
 * Plantilla de desprendible de los COLABORADORES DE CAMPO (área Campo).
 * Réplica del desprendible de campo del programa de nómina: hoja A4 horizontal, Arial 7,2 pt en negro
 * (Helvetica tiene las mismas medidas), encabezado EMPRESA / DOCUMENTO / NOMBRE, líneas punteadas,
 * C.C. / DESCRIPCIÓN / DEVENGO / DEDUCCIÓN, cédula, total, neto a pagar y la tabla de labores con su
 * cuadrícula. Sin colores ni elementos añadidos.
 *
 * Las posiciones están medidas sobre el PDF original (pt, medidas desde arriba) y se dibujan con
 * posición absoluta. Si las labores no caben en la hoja, la tabla continúa en la siguiente.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { MESES, formatNumber } from "@/lib/utils";
import type { ContenidoDesprendible, LaborCampo } from "@/types/desprendible";
import type { PlantillaDesprendibleProps } from "./comun";

const TAM = 7.2;
const NEGRO = "#000000";

const s = StyleSheet.create({
  pagina: { fontFamily: "Helvetica", fontSize: TAM, color: NEGRO, lineHeight: 1 },
  abs: { position: "absolute" },
  negrita: { fontFamily: "Helvetica-Bold" },
});

// ─── Medidas del original ─────────────────────────────────────────────

const COLUMNAS: {
  campo: keyof LaborCampo;
  titulo: string;
  /** Ancho de la columna en pt (calculado para que títulos y valores habituales quepan sin invadir la vecina). */
  ancho: number;
  alinear: "izquierda" | "derecha" | "auto";
  siempreConBorde: boolean;
}[] = [
  // LABOR se queda con el espacio sobrante; si aun así no cabe, el texto salta de línea dentro de la celda
  { campo: "labor", titulo: "LABOR", ancho: 0, alinear: "izquierda", siempreConBorde: true },
  { campo: "semana", titulo: "SEMA\nNA", ancho: 26, alinear: "derecha", siempreConBorde: true },
  { campo: "bloque", titulo: "BLOQUE", ancho: 36, alinear: "auto", siempreConBorde: true },
  { campo: "ppr", titulo: "P.P.R.", ancho: 28, alinear: "derecha", siempreConBorde: true },
  { campo: "valorUnitario", titulo: "VALOR\nUNITARIO", ancho: 40, alinear: "derecha", siempreConBorde: true },
  { campo: "cantidad", titulo: "CANTIDAD", ancho: 42, alinear: "derecha", siempreConBorde: true },
  { campo: "jornales", titulo: "JORNALES", ancho: 43, alinear: "derecha", siempreConBorde: true },
  { campo: "inasistencia", titulo: "INASIST\nENCIA", ancho: 32, alinear: "derecha", siempreConBorde: true },
  { campo: "valorTotal", titulo: "VR. TOTAL", ancho: 44, alinear: "derecha", siempreConBorde: true },
  // En el original estas tres columnas solo tienen borde en las celdas con valor
  { campo: "promDominical", titulo: "PROM/DOM\nINIC.", ancho: 47, alinear: "derecha", siempreConBorde: false },
  { campo: "festivo", titulo: "$ FESTIVO", ancho: 42, alinear: "derecha", siempreConBorde: false },
  { campo: "unidad", titulo: "UNIDAD\nMEDIDA", ancho: 35, alinear: "izquierda", siempreConBorde: true },
  { campo: "valorRacimo", titulo: "$\nRACIMO", ancho: 34, alinear: "derecha", siempreConBorde: true },
  { campo: "secuencia", titulo: "SECUENCIA", ancho: 46, alinear: "derecha", siempreConBorde: false },
  { campo: "total", titulo: "TOTAL", ancho: 46, alinear: "derecha", siempreConBorde: true },
];

/** Bordes izquierdo y derecho de la tabla (los mismos del original). */
const X_TABLA_INICIO = 59.5;
const X_TABLA_FIN = 769.7;

/** Bordes de las 15 columnas de la tabla de labores. */
const X_COLUMNAS = (() => {
  const fijas = COLUMNAS.reduce((suma, col) => suma + col.ancho, 0);
  const anchoLabor = X_TABLA_FIN - X_TABLA_INICIO - fijas;
  const bordes = [X_TABLA_INICIO];
  for (const col of COLUMNAS) bordes.push(bordes[bordes.length - 1] + (col.campo === "labor" ? anchoLabor : col.ancho));
  return bordes;
})();

const ALTO_ENCABEZADO_TABLA = 28.44;
const ALTO_FILA = 9.72;
/** Alto que suma cada línea adicional cuando el texto de una celda no cabe en una sola. */
const ALTO_LINEA_EXTRA = 8.2;
/** Margen interno de las celdas a cada lado. */
const RELLENO_CELDA = 1.5;
const LINEA_V = 0.8;
const LINEA_H = 0.84;
/** Inicio de la tabla en la primera hoja y en las siguientes. */
const TOP_TABLA = 209.8;
const TOP_TABLA_CONTINUACION = 40;
const LIMITE_INFERIOR = 580;

/** Línea punteada del original: corto, corto, largo (periodo de 21 pt) entre x 60,8 y 770,1. */
const PATRON_PUNTEADO: [number, number][] = [
  [0, 2.6],
  [5.3, 2.6],
  [10.6, 7.8],
];
const X_INICIO_PUNTEADO = 60.8;
const X_FIN_PUNTEADO = 770.1;

// ─── Piezas de dibujo ─────────────────────────────────────────────────

/** Desde la línea base hasta el borde superior de la caja de texto (Helvetica). */
const ASCENSO = 0.89;

/** Texto anclado a su línea base: alineado a la izquierda en x, o a la derecha si se da `derecha`. */
function T({
  x,
  derecha,
  base,
  negrita,
  children,
}: {
  x?: number;
  derecha?: number;
  base: number;
  negrita?: boolean;
  children: string;
}) {
  const top = base - TAM * ASCENSO;
  const posicion =
    derecha !== undefined ? { left: derecha - 200, width: 200, textAlign: "right" as const } : { left: x ?? 0 };
  return <Text style={[s.abs, { top }, posicion, negrita ? s.negrita : {}]}>{children}</Text>;
}

function Rect({ x, y, ancho, alto }: { x: number; y: number; ancho: number; alto: number }) {
  return <View style={[s.abs, { left: x, top: y, width: ancho, height: alto, backgroundColor: NEGRO }]} />;
}

function LineaPunteada({ y }: { y: number }) {
  const segmentos: { x: number; ancho: number }[] = [];
  for (let inicio = X_INICIO_PUNTEADO; inicio < X_FIN_PUNTEADO; inicio += 21) {
    for (const [desde, largo] of PATRON_PUNTEADO) {
      const x = inicio + desde;
      if (x < X_FIN_PUNTEADO) segmentos.push({ x, ancho: Math.min(largo, X_FIN_PUNTEADO - x) });
    }
  }
  return (
    <>
      {segmentos.map((seg) => (
        <Rect key={seg.x} x={seg.x} y={y} ancho={seg.ancho} alto={LINEA_H} />
      ))}
    </>
  );
}

const esNumerico = (texto: string) => /^[\d.,]+$/.test(texto);

// ─── Medición de texto ────────────────────────────────────────────────

/** Anchos de Helvetica (unidades por 1000 de em) para los caracteres ASCII 32–126. */
const ANCHOS_HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
];

/** Ancho aproximado (pt) de un texto en Helvetica a TAM pt. Las tildes se miden como su letra base. */
function anchoTexto(texto: string): number {
  let unidades = 0;
  for (const caracter of texto.normalize("NFD").replace(/[̀-ͯ]/g, "")) {
    const codigo = caracter.charCodeAt(0);
    unidades += codigo >= 32 && codigo <= 126 ? ANCHOS_HELVETICA[codigo - 32] : 556;
  }
  return (unidades / 1000) * TAM;
}

/** Parte un texto en líneas que quepan en `ancho` (por palabras; una palabra demasiado larga se corta). */
function partirEnLineas(texto: string, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (anchoTexto(candidata) <= ancho) {
      actual = candidata;
      continue;
    }
    if (actual) lineas.push(actual);
    actual = "";
    for (const caracter of palabra) {
      if (actual && anchoTexto(actual + caracter) > ancho) {
        lineas.push(actual);
        actual = "";
      }
      actual += caracter;
    }
  }
  if (actual) lineas.push(actual);
  return lineas.length ? lineas : [""];
}

const anchoUtil = (columna: number) => X_COLUMNAS[columna + 1] - X_COLUMNAS[columna] - 2 * RELLENO_CELDA;

/** Líneas de cada celda de una labor y alto de la fila (crece si alguna celda necesita más de una línea). */
function medirFila(labor: LaborCampo): { lineas: string[][]; alto: number } {
  const lineas = COLUMNAS.map((col, i) => (labor[col.campo] ? partirEnLineas(labor[col.campo], anchoUtil(i)) : []));
  const maximo = Math.max(1, ...lineas.map((l) => l.length));
  return { lineas, alto: ALTO_FILA + (maximo - 1) * ALTO_LINEA_EXTRA };
}

/** Bordes de una celda: cuatro líneas (las compartidas con la vecina caen en el mismo lugar). */
function BordesCelda({ columna, top, alto }: { columna: number; top: number; alto: number }) {
  const x0 = X_COLUMNAS[columna];
  const x1 = X_COLUMNAS[columna + 1];
  return (
    <>
      <Rect x={x0} y={top} ancho={x1 - x0 + LINEA_V} alto={LINEA_H} />
      <Rect x={x0} y={top + alto} ancho={x1 - x0 + LINEA_V} alto={LINEA_H} />
      <Rect x={x0} y={top} ancho={LINEA_V} alto={alto + LINEA_H} />
      <Rect x={x1} y={top} ancho={LINEA_V} alto={alto + LINEA_H} />
    </>
  );
}

function TablaLabores({ labores, top, total }: { labores: LaborCampo[]; top: number; total?: string }) {
  const topFilas = top + ALTO_ENCABEZADO_TABLA;
  return (
    <>
      {/* Encabezado: recuadro con divisiones y títulos en negrita centrados */}
      {COLUMNAS.map((col, i) => {
        // Una línea: base a 17,2 pt del borde superior; dos líneas: a 12,2 y 21,2 pt (como el original)
        const lineas = col.titulo.split("\n");
        const bases = lineas.length === 1 ? [top + 17.2] : [top + 12.2, top + 21.2];
        return (
          <View key={col.campo}>
            <BordesCelda columna={i} top={top} alto={ALTO_ENCABEZADO_TABLA} />
            {lineas.map((linea, j) => (
              <Text
                key={linea}
                style={[
                  s.abs,
                  s.negrita,
                  {
                    top: bases[j] - TAM * ASCENSO,
                    left: X_COLUMNAS[i],
                    width: X_COLUMNAS[i + 1] - X_COLUMNAS[i],
                    textAlign: "center",
                  },
                ]}
              >
                {linea}
              </Text>
            ))}
          </View>
        );
      })}

      {(() => {
        let topFila = topFilas;
        return labores.map((labor, fila) => {
          const { lineas, alto } = medirFila(labor);
          const top = topFila;
          topFila += alto;
          return (
            <View key={fila}>
              {COLUMNAS.map((col, i) => {
                const valor = labor[col.campo];
                const conBorde = col.siempreConBorde || Boolean(valor);
                const derecha = col.alinear === "derecha" || (col.alinear === "auto" && esNumerico(valor));
                return (
                  <View key={col.campo}>
                    {conBorde ? <BordesCelda columna={i} top={top} alto={alto} /> : null}
                    {lineas[i].map((linea, j) =>
                      derecha ? (
                        <T key={j} derecha={X_COLUMNAS[i + 1] - 0.8} base={top + 7.7 + j * ALTO_LINEA_EXTRA}>
                          {linea}
                        </T>
                      ) : (
                        <T key={j} x={X_COLUMNAS[i] + RELLENO_CELDA} base={top + 7.7 + j * ALTO_LINEA_EXTRA}>
                          {linea}
                        </T>
                      ),
                    )}
                  </View>
                );
              })}
            </View>
          );
        });
      })()}

      {/* Suma de la columna TOTAL, en una casilla debajo de la última labor */}
      {total ? (
        <>
          <BordesCelda columna={COLUMNAS.length - 1} top={topFilas + altoFilas(labores)} alto={ALTO_FILA} />
          <T derecha={X_COLUMNAS[COLUMNAS.length] - 0.8} base={topFilas + altoFilas(labores) + 7.7}>
            {total}
          </T>
        </>
      ) : null}
    </>
  );
}

const altoFilas = (labores: LaborCampo[]) => labores.reduce((suma, labor) => suma + medirFila(labor).alto, 0);

/** Reparte las labores en hojas: la primera tiene el encabezado del desprendible; las demás, solo la tabla. */
function repartirLabores(labores: LaborCampo[]): LaborCampo[][] {
  // Se reserva espacio para la casilla del total debajo de la última fila
  const disponible = (top: number) => LIMITE_INFERIOR - top - ALTO_ENCABEZADO_TABLA - ALTO_FILA;
  const hojas: LaborCampo[][] = [[]];
  let libre = disponible(TOP_TABLA);
  for (const labor of labores) {
    const { alto } = medirFila(labor);
    const hoja = hojas[hojas.length - 1];
    if (alto > libre && hoja.length) {
      hojas.push([labor]);
      libre = disponible(TOP_TABLA_CONTINUACION) - alto;
    } else {
      hoja.push(labor);
      libre -= alto;
    }
  }
  return hojas;
}

const pesos = (valor: number) => `$ ${formatNumber(Math.round(valor))}`;

function Encabezado({ c, empresa }: { c: ContenidoDesprendible; empresa: string }) {
  const [anio, mes] = c.periodo.split("-");
  const nombreMes = (MESES[Number(mes) - 1] ?? "").toUpperCase();
  const cedula = formatNumber(Number(c.colaborador.documento));
  const conceptos = [
    ...c.devengados.map((d) => ({ ...d, deduccion: false })),
    ...c.deducciones.map((d) => ({ ...d, deduccion: true })),
  ];

  return (
    <>
      <T x={61} base={47}>EMPRESA</T>
      <T x={172} base={47}>{empresa.toUpperCase()}</T>
      <T x={699} base={47}>Página</T>
      <T x={745} base={47}>1</T>

      <T x={61} base={57}>DOCUMENTO</T>
      <T x={172} base={57}>{`NOMINA CORRESPONDIENTE MES ${nombreMes} ${anio}`}</T>
      <T x={519} base={57}>MES</T>
      <T x={537} base={57}>{nombreMes}</T>

      <T x={61} base={67}>NOMBRE</T>
      <T x={172} base={67}>{c.colaborador.nombre.toUpperCase()}</T>
      <T x={508} base={67}>CARGO</T>
      <T x={537} base={67}>{c.colaborador.cargo.toUpperCase()}</T>
      <LineaPunteada y={68.9} />

      <T x={61} base={80}>C.C.</T>
      <T x={200} base={80}>DESCRIPCIÓN</T>
      <T x={444} base={80}>DEVENGO</T>
      <T x={672} base={80}>DEDUCCIÓN</T>
      <LineaPunteada y={82.6} />

      <T x={61} base={90}>{cedula}</T>
      {conceptos.map((concepto, i) => {
        const base = 90 + i * ALTO_FILA;
        return (
          <View key={`${concepto.concepto}-${i}`}>
            <T x={200} base={base}>
              {concepto.concepto}
            </T>
            {concepto.deduccion ? (
              <T x={672} base={base}>
                {pesos(concepto.valor)}
              </T>
            ) : (
              <T derecha={491} base={base}>
                {pesos(concepto.valor)}
              </T>
            )}
          </View>
        );
      })}

      <LineaPunteada y={179.8} />
      <T x={61} base={187}>CÉDULA:</T>
      <T x={172} base={187}>{cedula}</T>
      <T x={378} base={187}>TOTAL</T>
      <T derecha={491} base={187}>{pesos(c.totalDevengado)}</T>
      <T x={672} base={187}>{pesos(c.totalDeducciones)}</T>

      <T x={61} base={197}>CUENTA #:</T>
      <T x={172} base={197}>{c.cuenta || "(en blanco)"}</T>
      <T x={308} base={197}>{c.etiquetaNeto || "NETO A PAGAR"}</T>
      <T derecha={721} base={197}>{pesos(c.neto)}</T>
    </>
  );
}

export function PlantillaColaborador({ contenido: c, empresa }: PlantillaDesprendibleProps) {
  const hojas = repartirLabores(c.labores ?? []);
  return (
    <Document
      title={`Desprendible ${c.periodo} ${c.tipo_periodo} - ${c.colaborador.nombre}`}
      author={empresa.nombre}
      subject="Desprendible de pago de nómina"
      language="es"
    >
      {hojas.map((labores, i) => (
        <Page key={i} size="A4" orientation="landscape" style={s.pagina}>
          {i === 0 ? <Encabezado c={c} empresa={empresa.nombre} /> : null}
          {labores.length ? (
            <TablaLabores
              labores={labores}
              top={i === 0 ? TOP_TABLA : TOP_TABLA_CONTINUACION}
              total={i === hojas.length - 1 ? c.totalLabores : undefined}
            />
          ) : null}
        </Page>
      ))}
    </Document>
  );
}
