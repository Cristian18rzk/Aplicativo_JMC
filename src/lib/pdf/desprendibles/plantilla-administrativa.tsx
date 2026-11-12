/**
 * Plantilla de desprendible del PERSONAL ADMINISTRATIVO.
 * Formal y compacta: datos laborales en rejilla, devengados y deducciones lado a lado, neto en
 * franja Verde Palma y firmas. Punto de partida: el diseño definitivo se ajusta aquí.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency, formatNumber, pesosEnLetras } from "@/lib/utils";
import type { ConceptoNomina } from "@/types/desprendible";
import { COLORES_PDF, estilosBase } from "../estilos";
import { MarcaEmpresa, PieDesprendible, textoDocumento, textoPeriodo, type PlantillaDesprendibleProps } from "./comun";

const estilos = StyleSheet.create({
  titulo: { fontFamily: "Helvetica-Bold", fontSize: 11, textAlign: "right", letterSpacing: 0.4 },
  subtitulo: { fontSize: 8, color: COLORES_PDF.textoSuave, textAlign: "right", marginTop: 2 },
  etiquetaPlantilla: {
    alignSelf: "flex-end",
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    backgroundColor: COLORES_PDF.acentoSuave,
    color: COLORES_PDF.acentoOscuro,
    fontFamily: "Helvetica-Bold",
    fontSize: 6.5,
    letterSpacing: 0.6,
  },
  seccion: { marginBottom: 14 },
  tituloSeccion: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: COLORES_PDF.acento,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  rejilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: COLORES_PDF.borde,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: COLORES_PDF.fondo,
  },
  celda: { width: "33.33%", paddingVertical: 3, paddingRight: 6 },
  etiqueta: { fontSize: 6.5, color: COLORES_PDF.textoSuave, textTransform: "uppercase", letterSpacing: 0.3 },
  valor: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 1 },
  tablas: { flexDirection: "row", gap: 12 },
  tabla: { flex: 1, borderWidth: 1, borderColor: COLORES_PDF.borde, borderRadius: 4 },
  filaEncabezado: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORES_PDF.oro,
    backgroundColor: COLORES_PDF.oroSuave,
  },
  fila: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 7, borderBottomWidth: 0.5, borderBottomColor: COLORES_PDF.borde },
  filaTotal: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 7 },
  colConcepto: { flex: 3 },
  colCantidad: { flex: 1, textAlign: "center", color: COLORES_PDF.textoSuave },
  colValor: { flex: 2, textAlign: "right" },
  neto: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORES_PDF.acento,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: "#FFFFFF",
  },
  netoEtiqueta: { fontFamily: "Helvetica-Bold", fontSize: 10, letterSpacing: 0.5 },
  netoLetras: { fontSize: 7, marginTop: 2, color: "#DCEBDF" },
  netoValor: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  observaciones: { marginTop: 12, borderLeftWidth: 2, borderLeftColor: COLORES_PDF.oro, paddingLeft: 8 },
  firmas: { flexDirection: "row", justifyContent: "space-between", marginTop: 52 },
  firma: { width: "42%", borderTopWidth: 0.75, borderTopColor: COLORES_PDF.texto, paddingTop: 4, textAlign: "center", fontSize: 8 },
});

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.celda}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Text style={estilos.valor}>{valor || "—"}</Text>
    </View>
  );
}

function Tabla({ titulo, conceptos, total }: { titulo: string; conceptos: ConceptoNomina[]; total: number }) {
  return (
    <View style={estilos.tabla}>
      <View style={estilos.filaEncabezado}>
        <Text style={[estilos.colConcepto, estilosBase.negrita]}>{titulo}</Text>
        <Text style={[estilos.colCantidad, estilosBase.negrita]}>Cant.</Text>
        <Text style={[estilos.colValor, estilosBase.negrita]}>Valor</Text>
      </View>
      {conceptos.map((c, i) => (
        <View key={`${c.concepto}-${i}`} style={estilos.fila}>
          <Text style={estilos.colConcepto}>{c.concepto}</Text>
          <Text style={estilos.colCantidad}>{c.cantidad ?? ""}</Text>
          <Text style={estilos.colValor}>{formatCurrency(c.valor)}</Text>
        </View>
      ))}
      <View style={estilos.filaTotal}>
        <Text style={[estilos.colConcepto, estilosBase.negrita]}>Total</Text>
        <Text style={estilos.colCantidad} />
        <Text style={[estilos.colValor, estilosBase.negrita]}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
}

export function PlantillaAdministrativa({ contenido: c, empresa }: PlantillaDesprendibleProps) {
  return (
    <Document
      title={`Desprendible ${c.periodo} ${c.tipo_periodo} - ${c.colaborador.nombre}`}
      author={empresa.nombre}
      subject="Comprobante de pago de nómina"
      language="es"
    >
      <Page size="LETTER" style={estilosBase.pagina}>
        <View style={estilosBase.encabezado}>
          <MarcaEmpresa empresa={empresa} />
          <View>
            <Text style={estilos.titulo}>COMPROBANTE DE PAGO DE NÓMINA</Text>
            <Text style={estilos.subtitulo}>{textoPeriodo(c)}</Text>
            <Text style={estilos.etiquetaPlantilla}>PERSONAL ADMINISTRATIVO</Text>
          </View>
        </View>
        <View style={estilosBase.fileteDoble} />

        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Datos del empleado</Text>
          <View style={estilos.rejilla}>
            <Dato etiqueta="Nombre" valor={c.colaborador.nombre} />
            <Dato etiqueta="Documento" valor={textoDocumento(c)} />
            <Dato etiqueta="Cargo" valor={c.colaborador.cargo} />
            <Dato etiqueta="Área" valor={String(c.colaborador.area)} />
            <Dato
              etiqueta="Salario básico"
              valor={c.colaborador.salarioBasico ? formatCurrency(c.colaborador.salarioBasico) : ""}
            />
            <Dato
              etiqueta="Días liquidados"
              valor={c.colaborador.diasTrabajados !== undefined ? formatNumber(c.colaborador.diasTrabajados) : ""}
            />
          </View>
        </View>

        <View style={estilos.tablas}>
          <Tabla titulo="Devengados" conceptos={c.devengados} total={c.totalDevengado} />
          <Tabla titulo="Deducciones" conceptos={c.deducciones} total={c.totalDeducciones} />
        </View>

        <View style={estilos.neto}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.netoEtiqueta}>NETO A PAGAR</Text>
            <Text style={estilos.netoLetras}>{pesosEnLetras(c.neto)}</Text>
          </View>
          <Text style={estilos.netoValor}>{formatCurrency(c.neto)}</Text>
        </View>

        {c.observaciones ? (
          <View style={estilos.observaciones}>
            <Text style={estilos.tituloSeccion}>Observaciones</Text>
            <Text>{c.observaciones}</Text>
          </View>
        ) : null}

        <View style={estilos.firmas}>
          <Text style={estilos.firma}>{empresa.nombre}</Text>
          <Text style={estilos.firma}>Recibí conforme · {textoDocumento(c)}</Text>
        </View>

        <PieDesprendible empresa={empresa} codigo={c.codigo} />
      </Page>
    </Document>
  );
}
