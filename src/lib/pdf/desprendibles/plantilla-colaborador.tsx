/**
 * Plantilla de desprendible de los COLABORADORES DE CAMPO (áreas Campo y Operativa).
 * Pensada para leerse fácil, también impresa: letra grande, el valor a recibir arriba y destacado en
 * Naranja Sol, días y zona visibles, y los conceptos en una sola columna. Punto de partida: el diseño
 * definitivo se ajusta aquí.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency, formatNumber, pesosEnLetras } from "@/lib/utils";
import type { ConceptoNomina } from "@/types/desprendible";
import { COLORES_PDF, estilosBase } from "../estilos";
import { MarcaEmpresa, PieDesprendible, textoDocumento, textoPeriodo, type PlantillaDesprendibleProps } from "./comun";

const estilos = StyleSheet.create({
  pagina: { ...estilosBase.pagina, fontSize: 10.5, lineHeight: 1.45 },
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 10, textAlign: "right", color: COLORES_PDF.solOscuro, letterSpacing: 0.6 },
  subtitulo: { fontSize: 9, color: COLORES_PDF.textoSuave, textAlign: "right", marginTop: 2 },
  saludo: { fontSize: 9, color: COLORES_PDF.textoSuave, marginBottom: 2 },
  nombre: { fontFamily: "Helvetica-Bold", fontSize: 17, lineHeight: 1.2, marginBottom: 3 },
  datos: { fontSize: 9.5, color: COLORES_PDF.textoSuave },
  recibe: {
    marginTop: 14,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: COLORES_PDF.solSuave,
    borderWidth: 1,
    borderColor: "#F6CFA8",
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recibeEtiqueta: { fontFamily: "Helvetica-Bold", fontSize: 10, color: COLORES_PDF.solOscuro, letterSpacing: 0.4 },
  recibeLetras: { fontSize: 7.5, color: COLORES_PDF.textoSuave, marginTop: 3, maxWidth: 300 },
  recibeValor: { fontFamily: "Helvetica-Bold", fontSize: 24, color: COLORES_PDF.texto },
  chips: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORES_PDF.borde,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: COLORES_PDF.fondo,
  },
  chipEtiqueta: { fontSize: 7, color: COLORES_PDF.textoSuave, textTransform: "uppercase", letterSpacing: 0.4 },
  chipValor: { fontFamily: "Helvetica-Bold", fontSize: 12, marginTop: 1 },
  bloque: { marginBottom: 12 },
  bloqueTitulo: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 4,
    marginBottom: 2,
    borderBottomWidth: 1.5,
  },
  bloqueNombre: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  fila: { flexDirection: "row", paddingVertical: 4.5, borderBottomWidth: 0.5, borderBottomColor: COLORES_PDF.borde },
  colConcepto: { flex: 1 },
  colCantidad: { width: 70, textAlign: "center", color: COLORES_PDF.textoSuave },
  colValor: { width: 100, textAlign: "right", fontFamily: "Helvetica-Bold" },
  observaciones: { marginTop: 4, padding: 10, borderRadius: 6, backgroundColor: COLORES_PDF.fondo },
  firma: { marginTop: 44, width: "50%", borderTopWidth: 0.75, borderTopColor: COLORES_PDF.texto, paddingTop: 4, fontSize: 8.5 },
});

function Bloque({
  titulo,
  color,
  conceptos,
  total,
  signo,
}: {
  titulo: string;
  color: string;
  conceptos: ConceptoNomina[];
  total: number;
  signo: "" | "−";
}) {
  return (
    <View style={estilos.bloque} wrap={false}>
      <View style={[estilos.bloqueTitulo, { borderBottomColor: color }]}>
        <Text style={[estilos.bloqueNombre, { color }]}>{titulo}</Text>
        <Text style={[estilos.bloqueNombre, { color }]}>
          {signo}
          {formatCurrency(total)}
        </Text>
      </View>
      {conceptos.map((c, i) => (
        <View key={`${c.concepto}-${i}`} style={estilos.fila}>
          <Text style={estilos.colConcepto}>{c.concepto}</Text>
          <Text style={estilos.colCantidad}>{c.cantidad ?? ""}</Text>
          <Text style={estilos.colValor}>
            {signo}
            {formatCurrency(c.valor)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function PlantillaColaborador({ contenido: c, empresa }: PlantillaDesprendibleProps) {
  const chips = [
    c.colaborador.diasTrabajados !== undefined
      ? { etiqueta: "Días trabajados", valor: formatNumber(c.colaborador.diasTrabajados) }
      : null,
    { etiqueta: "Labor", valor: c.colaborador.cargo || "—" },
    c.colaborador.zona ? { etiqueta: "Zona", valor: c.colaborador.zona } : null,
  ].filter(Boolean) as { etiqueta: string; valor: string }[];

  return (
    <Document
      title={`Desprendible ${c.periodo} ${c.tipo_periodo} - ${c.colaborador.nombre}`}
      author={empresa.nombre}
      subject="Comprobante de pago"
      language="es"
    >
      <Page size="LETTER" style={estilos.pagina}>
        <View style={estilosBase.encabezado}>
          <MarcaEmpresa empresa={empresa} />
          <View>
            <Text style={estilos.titulo}>COMPROBANTE DE PAGO</Text>
            <Text style={estilos.subtitulo}>{textoPeriodo(c)}</Text>
          </View>
        </View>
        <View style={[estilosBase.fileteDoble, { borderColor: COLORES_PDF.solClaro }]} />

        <Text style={estilos.saludo}>Este es tu pago,</Text>
        <Text style={estilos.nombre}>{c.colaborador.nombre}</Text>
        <Text style={estilos.datos}>{textoDocumento(c)}</Text>

        <View style={estilos.recibe}>
          <View>
            <Text style={estilos.recibeEtiqueta}>VAS A RECIBIR</Text>
            <Text style={estilos.recibeLetras}>{pesosEnLetras(c.neto)}</Text>
          </View>
          <Text style={estilos.recibeValor}>{formatCurrency(c.neto)}</Text>
        </View>

        <View style={estilos.chips}>
          {chips.map((chip) => (
            <View key={chip.etiqueta} style={estilos.chip}>
              <Text style={estilos.chipEtiqueta}>{chip.etiqueta}</Text>
              <Text style={estilos.chipValor}>{chip.valor}</Text>
            </View>
          ))}
        </View>

        <Bloque titulo="Lo que ganaste" color={COLORES_PDF.acento} conceptos={c.devengados} total={c.totalDevengado} signo="" />
        <Bloque titulo="Descuentos" color={COLORES_PDF.error} conceptos={c.deducciones} total={c.totalDeducciones} signo="−" />

        {c.observaciones ? (
          <View style={estilos.observaciones}>
            <Text style={estilosBase.negrita}>Nota</Text>
            <Text>{c.observaciones}</Text>
          </View>
        ) : null}

        <Text style={estilos.firma}>Recibí conforme · {textoDocumento(c)}</Text>

        <PieDesprendible empresa={empresa} codigo={c.codigo} />
      </Page>
    </Document>
  );
}
