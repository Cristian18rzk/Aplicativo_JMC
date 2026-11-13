/**
 * Plantilla de desprendible de ADMINISTRATIVOS Y OPERADORES.
 * Réplica del comprobante del programa de nómina (nóminas 220 y 221): encabezado centrado con la
 * razón social, una sola tabla de conceptos (Cantidad, V/r. Unitario, Devengado, Deducido), totales,
 * neto pagado, firma del empleado y pie con la fecha de emisión y la página.
 *
 * Las posiciones están medidas sobre el PDF original (hoja carta, 612 × 792 pt) y se dibujan con
 * posición absoluta para que coincidan línea a línea.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { MESES, formatDate, formatNumber, parseFecha } from "@/lib/utils";
import type { ConceptoNomina } from "@/types/desprendible";
import type { PlantillaDesprendibleProps } from "./comun";

/** Estilo de un texto de react-pdf. */
type Estilo = ReturnType<typeof StyleSheet.create>[string];

const AZUL = "#1E2288";
const LINEA_AZUL = "#8C93C9";
const GRIS = "#BDBDBD";
const NEGRO = "#000000";

/** Bordes derechos de las columnas numéricas y posiciones fijas (pt). */
const COL = {
  concepto: 35,
  entidad: 183,
  cantidad: 346,
  unitario: 408,
  devengado: 473.5,
  deducido: 539,
  etiquetaTotal: 335,
};
const MARGEN_IZQ = 19.3;
const ANCHO = 534;
const PRIMERA_FILA = 174; // centro vertical de la primera línea de conceptos
const PASO_FILA = 11.15;
const TOP_PIE = 419.4;

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** "viernes, 6 de noviembre de 2026" */
function fechaConDia(fecha?: string): string {
  const d = parseFecha(fecha) ?? new Date();
  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

const s = StyleSheet.create({
  pagina: { fontFamily: "Helvetica", fontSize: 7.3, color: NEGRO, lineHeight: 1 },
  abs: { position: "absolute" },
  centrado: { position: "absolute", left: MARGEN_IZQ, width: ANCHO, textAlign: "center" },
  empresa: { fontFamily: "Helvetica-Bold", fontSize: 15.8 },
  nit: { fontFamily: "Helvetica-Bold", fontSize: 11.8 },
  nomina: { fontFamily: "Times-BoldItalic", fontSize: 12, color: AZUL },
  encabezadoTabla: { fontFamily: "Times-BoldItalic", fontSize: 10.5, color: AZUL },
  nombre: { fontFamily: "Times-BoldItalic", fontSize: 12, color: AZUL, textDecoration: "underline" },
  documento: { fontFamily: "Times-BoldItalic", fontSize: 11.5, color: AZUL, textDecoration: "underline" },
  cargo: { fontFamily: "Times-BoldItalic", fontSize: 11 },
  sueldoEtiqueta: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  sueldoValor: { fontFamily: "Times-BoldItalic", fontSize: 10.5 },
  negritaSerif: { fontFamily: "Times-Bold", fontSize: 10.5 },
  pie: { fontFamily: "Times-BoldItalic", fontSize: 8.5, color: AZUL },
});

/** Texto anclado a su centro vertical y a su borde izquierdo. */
function T({ y, x, tam, estilo, children }: { y: number; x: number; tam: number; estilo?: Estilo; children: string }) {
  return <Text style={[s.abs, { top: y - tam / 2, left: x }, estilo ?? {}]}>{children}</Text>;
}

/** Texto alineado a la derecha sobre el borde `derecha`. */
function TDer({ y, derecha, tam, estilo, children }: { y: number; derecha: number; tam: number; estilo?: Estilo; children: string }) {
  const ancho = 90;
  return (
    <Text style={[s.abs, { top: y - tam / 2, left: derecha - ancho, width: ancho, textAlign: "right" }, estilo ?? {}]}>
      {children}
    </Text>
  );
}

/** Texto centrado sobre el ancho del encabezado. */
function TCentro({ y, tam, estilo, children }: { y: number; tam: number; estilo: Estilo; children: string }) {
  return <Text style={[s.centrado, { top: y - tam / 2 }, estilo]}>{children}</Text>;
}

function Linea({ y, x, ancho, grosor, color }: { y: number; x: number; ancho: number; grosor: number; color: string }) {
  return <View style={[s.abs, { top: y - grosor / 2, left: x, width: ancho, height: grosor, backgroundColor: color }]} />;
}

interface Fila extends ConceptoNomina {
  deducido: boolean;
}

function FilaConcepto({ fila, y }: { fila: Fila; y: number }) {
  const tam = 7.3;
  return (
    <>
      <T y={y} x={COL.concepto} tam={tam}>
        {fila.concepto}
      </T>
      {fila.entidad ? (
        <T y={y} x={COL.entidad} tam={tam}>
          {fila.entidad}
        </T>
      ) : null}
      {fila.cantidad ? (
        <TDer y={y} derecha={COL.cantidad} tam={tam}>
          {fila.cantidad}
        </TDer>
      ) : null}
      {fila.valorUnitario !== undefined ? (
        <TDer y={y} derecha={COL.unitario} tam={tam}>
          {formatNumber(fila.valorUnitario)}
        </TDer>
      ) : null}
      <TDer y={y} derecha={COL.devengado} tam={tam}>
        {formatNumber(fila.deducido ? 0 : fila.valor)}
      </TDer>
      <TDer y={y} derecha={COL.deducido} tam={tam}>
        {formatNumber(fila.deducido ? fila.valor : 0)}
      </TDer>
    </>
  );
}

export function PlantillaAdministrativa({ contenido: c, empresa }: PlantillaDesprendibleProps) {
  // Una sola lista, en el orden del programa de nómina: primero lo devengado y luego lo deducido
  const filas: Fila[] = [
    ...c.devengados.map((d) => ({ ...d, deducido: false })),
    ...c.deducciones.map((d) => ({ ...d, deducido: true })),
  ];
  const ultimaFila = PRIMERA_FILA + Math.max(filas.length - 1, 0) * PASO_FILA;
  const lineaTotal = ultimaFila + 5.6;
  const filaFirma = lineaTotal + 8.5;
  const filaCC = filaFirma + 14.8;
  const lineaCierre = filaCC + 9;
  const topPie = Math.max(TOP_PIE, lineaCierre + 24);

  const nomina = c.numeroNomina ? `Nómina #  ${c.numeroNomina} correspondiente al periodo del` : "Nómina correspondiente al periodo del";
  const rango = c.fechaInicio && c.fechaFin ? `${formatDate(c.fechaInicio)} al  ${formatDate(c.fechaFin)}` : "";

  return (
    <Document
      title={`Desprendible ${c.periodo} ${c.tipo_periodo} - ${c.colaborador.nombre}`}
      author={empresa.nombre}
      subject="Comprobante de pago de nómina"
      language="es"
    >
      <Page size="LETTER" style={s.pagina}>
        {/* Encabezado */}
        <Linea y={20} x={MARGEN_IZQ} ancho={ANCHO} grosor={2} color={GRIS} />
        <TCentro y={30.5} tam={15.8} estilo={s.empresa}>
          {empresa.nombre.toUpperCase()}
        </TCentro>
        {empresa.nit ? (
          <TCentro y={56.7} tam={11.8} estilo={s.nit}>
            {`Nit: ${empresa.nit}`}
          </TCentro>
        ) : null}
        <TCentro y={72.8} tam={12} estilo={s.nomina}>
          {nomina}
        </TCentro>
        {rango ? (
          <TCentro y={84.4} tam={12} estilo={s.nomina}>
            {rango}
          </TCentro>
        ) : null}
        <Linea y={100} x={MARGEN_IZQ} ancho={ANCHO} grosor={3} color={GRIS} />

        {/* Encabezado de la tabla */}
        <Linea y={107.3} x={37} ancho={507.4} grosor={2} color={AZUL} />
        <T y={116} x={39} tam={10.5} estilo={s.encabezadoTabla}>
          Concepto Nómina
        </T>
        <TDer y={116} derecha={COL.cantidad} tam={10.5} estilo={s.encabezadoTabla}>
          Cantidad
        </TDer>
        <TDer y={116} derecha={415.5} tam={10.5} estilo={s.encabezadoTabla}>
          V/r. Unitario
        </TDer>
        <TDer y={116} derecha={482} tam={10.5} estilo={s.encabezadoTabla}>
          Devengado
        </TDer>
        <TDer y={116} derecha={541} tam={10.5} estilo={s.encabezadoTabla}>
          Deducido
        </TDer>
        <Linea y={125} x={37} ancho={507.4} grosor={1.3} color={AZUL} />

        {/* Empleado */}
        <T y={138.5} x={39} tam={12} estilo={s.nombre}>
          {c.colaborador.nombre.toUpperCase()}
        </T>
        <T y={138.5} x={410} tam={11.5} estilo={s.documento}>
          {c.colaborador.tipo_documento}
        </T>
        <T y={138.5} x={442} tam={11.5} estilo={s.documento}>
          {c.colaborador.documento}
        </T>
        <Text style={[s.abs, s.cargo, { top: 156.5 - 5.5, left: 39 }]}>
          {"Cargo:  "}
          <Text style={{ textDecoration: "underline" }}>{c.colaborador.cargo.toUpperCase()}</Text>
        </Text>
        <T y={156.5} x={397.5} tam={9.5} estilo={s.sueldoEtiqueta}>
          Sueldo Básico
        </T>
        {c.colaborador.salarioBasico !== undefined ? (
          <TDer y={156.5} derecha={534.7} tam={10.5} estilo={s.sueldoValor}>
            {formatNumber(c.colaborador.salarioBasico)}
          </TDer>
        ) : null}

        {/* Conceptos */}
        {filas.map((fila, i) => (
          <FilaConcepto key={`${fila.concepto}-${i}`} fila={fila} y={PRIMERA_FILA + i * PASO_FILA} />
        ))}

        {/* Totales, neto y firma */}
        <Linea y={lineaTotal} x={MARGEN_IZQ} ancho={535} grosor={0.6} color={LINEA_AZUL} />
        <T y={filaFirma} x={21} tam={10.5} estilo={s.negritaSerif}>
          Firma del Empleado
        </T>
        <T y={filaFirma} x={COL.etiquetaTotal} tam={10.5} estilo={s.negritaSerif}>
          Total
        </T>
        <TDer y={filaFirma} derecha={COL.devengado} tam={10.5} estilo={s.negritaSerif}>
          {formatNumber(c.totalDevengado)}
        </TDer>
        <TDer y={filaFirma} derecha={COL.deducido} tam={10.5} estilo={s.negritaSerif}>
          {formatNumber(c.totalDeducciones)}
        </TDer>
        <T y={filaCC} x={21} tam={10.5} estilo={s.negritaSerif}>
          C.C.
        </T>
        <Linea y={filaCC - 1.5} x={129} ancho={174} grosor={0.8} color={NEGRO} />
        <T y={filaCC} x={COL.etiquetaTotal} tam={10.5} estilo={s.negritaSerif}>
          Neto Pagado
        </T>
        <TDer y={filaCC} derecha={COL.deducido} tam={10.5} estilo={s.negritaSerif}>
          {formatNumber(c.neto)}
        </TDer>
        <Linea y={lineaCierre} x={22.5} ancho={533.5} grosor={0.6} color={LINEA_AZUL} />

        {/* Pie */}
        <Linea y={topPie} x={MARGEN_IZQ} ancho={524} grosor={2} color={GRIS} />
        <T y={topPie + 9.6} x={23.8} tam={8.5} estilo={s.pie}>
          {fechaConDia(c.fechaEmision)}
        </T>
        <Text
          style={[s.abs, s.pie, { top: topPie + 9.6 - 4.25, left: 435.5 }]}
          render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
