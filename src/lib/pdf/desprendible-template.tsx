import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DatosEmpresa } from "@/lib/empresa";
import { calcularLiquidacion } from "@/lib/nomina";
import { formatCurrency, formatDate, formatNumber, formatPeriodo, pesosEnLetras } from "@/lib/utils";
import type { Colaborador } from "@/types/colaborador";
import type { Desprendible } from "@/types/desprendible";
import { COLORES_PDF, estilosBase, inicialesEmpresa, sinPuntoFinal } from "./estilos";

const estilos = StyleSheet.create({
  tituloDocumento: { fontFamily: "Helvetica-Bold", fontSize: 11, color: COLORES_PDF.texto, textAlign: "right" },
  subtitulo: { fontSize: 9, color: COLORES_PDF.textoSuave, textAlign: "right" },
  seccion: { marginBottom: 14 },
  tituloSeccion: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: COLORES_PDF.acento,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  rejilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: COLORES_PDF.borde,
    borderRadius: 6,
    padding: 8,
    backgroundColor: COLORES_PDF.fondo,
  },
  celdaDato: { width: "33.33%", paddingVertical: 3, paddingRight: 6 },
  etiqueta: { fontSize: 7, color: COLORES_PDF.textoSuave, textTransform: "uppercase" },
  valor: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  tablas: { flexDirection: "row", gap: 12 },
  tabla: { flex: 1, borderWidth: 1, borderColor: COLORES_PDF.borde, borderRadius: 6 },
  filaEncabezado: {
    flexDirection: "row",
    backgroundColor: COLORES_PDF.acento,
    color: "#FFFFFF",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  fila: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORES_PDF.borde,
  },
  filaTotal: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, backgroundColor: COLORES_PDF.acentoSuave },
  colConcepto: { flex: 3 },
  colCantidad: { flex: 1, textAlign: "center" },
  colValor: { flex: 2, textAlign: "right" },
  neto: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORES_PDF.acento,
    borderRadius: 6,
    padding: 12,
    color: "#FFFFFF",
  },
  netoEtiqueta: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  netoValor: { fontFamily: "Helvetica-Bold", fontSize: 16 },
  netoLetras: { fontSize: 7, marginTop: 2 },
  observaciones: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORES_PDF.borde,
    borderRadius: 6,
    padding: 8,
  },
  firmas: { flexDirection: "row", justifyContent: "space-between", marginTop: 48 },
  firma: { width: "40%", borderTopWidth: 1, borderTopColor: COLORES_PDF.texto, paddingTop: 4, textAlign: "center" },
});

export interface DesprendibleTemplateProps {
  desprendible: Desprendible;
  empresa: DatosEmpresa;
  colaborador?: Colaborador | null;
}

interface Concepto {
  concepto: string;
  cantidad?: string;
  valor: number;
}

function TablaConceptos({ titulo, conceptos, total }: { titulo: string; conceptos: Concepto[]; total: number }) {
  return (
    <View style={estilos.tabla}>
      <View style={estilos.filaEncabezado}>
        <Text style={[estilos.colConcepto, estilosBase.negrita]}>{titulo}</Text>
        <Text style={[estilos.colCantidad, estilosBase.negrita]}>Cant.</Text>
        <Text style={[estilos.colValor, estilosBase.negrita]}>Valor</Text>
      </View>
      {conceptos.map((c) => (
        <View key={c.concepto} style={estilos.fila}>
          <Text style={estilos.colConcepto}>{c.concepto}</Text>
          <Text style={estilos.colCantidad}>{c.cantidad ?? ""}</Text>
          <Text style={estilos.colValor}>{formatCurrency(c.valor)}</Text>
        </View>
      ))}
      <View style={estilos.filaTotal}>
        <Text style={[estilos.colConcepto, estilosBase.negrita]}>Total {titulo.toLowerCase()}</Text>
        <Text style={estilos.colCantidad} />
        <Text style={[estilos.colValor, estilosBase.negrita]}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={estilos.celdaDato}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Text style={estilos.valor}>{valor || "—"}</Text>
    </View>
  );
}

/** Plantilla PDF del comprobante de pago de nómina (desprendible). */
export function DesprendibleTemplate({ desprendible: d, empresa, colaborador }: DesprendibleTemplateProps) {
  const l = calcularLiquidacion(d);

  const devengados: Concepto[] = [
    { concepto: "Salario básico", cantidad: `${formatNumber(d.dias_trabajados)} d`, valor: l.valorSalario },
  ];
  if (d.horas_extras_diurnas > 0)
    devengados.push({ concepto: "Horas extras diurnas", cantidad: `${formatNumber(d.horas_extras_diurnas)} h`, valor: l.valorHorasExtrasDiurnas });
  if (d.horas_extras_nocturnas > 0)
    devengados.push({ concepto: "Horas extras nocturnas", cantidad: `${formatNumber(d.horas_extras_nocturnas)} h`, valor: l.valorHorasExtrasNocturnas });
  if (d.recargos_nocturnos > 0)
    devengados.push({ concepto: "Recargos nocturnos", cantidad: `${formatNumber(d.recargos_nocturnos)} h`, valor: l.valorRecargosNocturnos });
  if (d.dominicales_festivos > 0)
    devengados.push({ concepto: "Dominicales y festivos", cantidad: `${formatNumber(d.dominicales_festivos)} h`, valor: l.valorDominicalesFestivos });
  if (l.auxilioTransporte > 0) devengados.push({ concepto: "Auxilio de transporte", valor: l.auxilioTransporte });
  if (l.otrosDevengados > 0) devengados.push({ concepto: "Otros devengados", valor: l.otrosDevengados });

  const deducciones: Concepto[] = [
    { concepto: "Aporte salud (4%)", valor: l.deduccionSalud },
    { concepto: "Aporte pensión (4%)", valor: l.deduccionPension },
  ];
  if (l.retencionFuente > 0) deducciones.push({ concepto: "Retención en la fuente", valor: l.retencionFuente });
  if (l.otrosDescuentos > 0) deducciones.push({ concepto: "Otros descuentos", valor: l.otrosDescuentos });

  const fechaGeneracion = formatDate(d.fecha_generacion);

  return (
    <Document
      title={`Desprendible ${d.periodo} ${d.tipo_periodo} - ${d.colaboradorNombre}`}
      author={empresa.nombre}
      subject="Comprobante de pago de nómina"
      language="es"
    >
      <Page size="LETTER" style={estilosBase.pagina}>
        <View style={estilosBase.encabezado}>
          <View style={estilosBase.marcaEmpresa}>
            <Text style={estilosBase.logo}>{inicialesEmpresa(empresa.nombre)}</Text>
            <View>
              <Text style={estilosBase.nombreEmpresa}>{empresa.nombre}</Text>
              {empresa.nit ? <Text style={estilosBase.datoEmpresa}>NIT {empresa.nit}</Text> : null}
              <Text style={estilosBase.datoEmpresa}>
                {[empresa.direccion, empresa.ciudad].filter(Boolean).join(" · ")}
              </Text>
              {empresa.telefono ? <Text style={estilosBase.datoEmpresa}>Tel. {empresa.telefono}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={estilos.tituloDocumento}>COMPROBANTE DE PAGO DE NÓMINA</Text>
            <Text style={estilos.subtitulo}>
              {formatPeriodo(d.periodo)} · {d.tipo_periodo}
            </Text>
            <Text style={estilos.subtitulo}>Generado: {fechaGeneracion}</Text>
          </View>
        </View>

        <View style={estilos.seccion}>
          <Text style={estilos.tituloSeccion}>Datos del colaborador</Text>
          <View style={estilos.rejilla}>
            <Dato etiqueta="Nombre" valor={d.colaboradorNombre} />
            <Dato etiqueta="Cédula" valor={d.colaboradorCedula} />
            <Dato etiqueta="Cargo" valor={d.colaboradorCargo} />
            <Dato etiqueta="Salario base" valor={formatCurrency(d.salario_base)} />
            <Dato etiqueta="Días trabajados" valor={formatNumber(d.dias_trabajados)} />
            <Dato etiqueta="Área" valor={colaborador?.area ?? ""} />
            <Dato etiqueta="Banco" valor={colaborador?.banco ?? ""} />
            <Dato etiqueta="Cuenta" valor={colaborador?.cuenta_bancaria ?? ""} />
            <Dato etiqueta="EPS / Pensión" valor={[colaborador?.eps, colaborador?.fondo_pensiones].filter(Boolean).join(" / ")} />
          </View>
        </View>

        <View style={estilos.tablas}>
          <TablaConceptos titulo="Devengados" conceptos={devengados} total={l.totalDevengado} />
          <TablaConceptos titulo="Deducciones" conceptos={deducciones} total={l.totalDeducciones} />
        </View>

        <View style={estilos.neto}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.netoEtiqueta}>NETO A PAGAR</Text>
            <Text style={estilos.netoLetras}>{pesosEnLetras(l.netoAPagar)}</Text>
          </View>
          <Text style={estilos.netoValor}>{formatCurrency(l.netoAPagar)}</Text>
        </View>

        {d.descripcion_otros || d.descripcion_descuentos ? (
          <View style={estilos.observaciones}>
            <Text style={estilos.tituloSeccion}>Observaciones</Text>
            {d.descripcion_otros ? (
              <Text>
                <Text style={estilosBase.negrita}>Otros devengados: </Text>
                {d.descripcion_otros}
              </Text>
            ) : null}
            {d.descripcion_descuentos ? (
              <Text>
                <Text style={estilosBase.negrita}>Otros descuentos: </Text>
                {d.descripcion_descuentos}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={estilos.firmas}>
          <Text style={estilos.firma}>{empresa.nombre}</Text>
          <Text style={estilos.firma}>Recibí conforme — C.C. {d.colaboradorCedula}</Text>
        </View>

        <Text style={estilosBase.piePagina} fixed>
          Documento generado electrónicamente por el portal de nómina de {sinPuntoFinal(empresa.nombre)}. Código: {d.id}
        </Text>
      </Page>
    </Document>
  );
}
