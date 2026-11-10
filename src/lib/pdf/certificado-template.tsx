import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DatosEmpresa } from "@/lib/empresa";
import { MESES, formatCurrency, parseFecha, pesosEnLetras } from "@/lib/utils";
import type { Certificado, ContenidoCertificado } from "@/types/certificado";
import { COLORES_PDF, estilosBase, inicialesEmpresa } from "./estilos";

const estilos = StyleSheet.create({
  pagina: { ...estilosBase.pagina, paddingHorizontal: 64, fontSize: 11, lineHeight: 1.6 },
  titulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    textAlign: "center",
    marginTop: 24,
    marginBottom: 28,
    letterSpacing: 1,
  },
  suscrito: { fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 4 },
  certifica: { fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 12, marginBottom: 18, fontSize: 12 },
  parrafo: { textAlign: "justify", marginBottom: 12 },
  tabla: { borderWidth: 1, borderColor: COLORES_PDF.borde, borderRadius: 4, marginBottom: 12 },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORES_PDF.borde,
  },
  filaTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: COLORES_PDF.acentoSuave,
  },
  firma: { marginTop: 64, width: 240 },
  lineaFirma: { borderTopWidth: 1, borderTopColor: COLORES_PDF.texto, paddingTop: 4 },
  nota: { fontSize: 8, color: COLORES_PDF.textoSuave, marginTop: 24 },
});

export interface CertificadoTemplateProps {
  certificado: Certificado;
  empresa: DatosEmpresa;
}

/** "a los 10 días del mes de noviembre de 2026" */
function fechaExpedicion(fecha: string): string {
  const d = parseFecha(fecha) ?? new Date();
  const dia = d.getDate();
  return `a los ${dia} ${dia === 1 ? "día" : "días"} del mes de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

function fechaIngresoTexto(fecha: string): string {
  const d = parseFecha(fecha);
  if (!d) return "—";
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

const DESCRIPCION_CONTRATO: Record<string, string> = {
  Fijo: "a término fijo",
  Indefinido: "a término indefinido",
  "Obra o labor": "por obra o labor contratada",
};

function CuerpoLaboral({ contenido }: { contenido: ContenidoCertificado }) {
  const c = contenido.colaborador;
  const activo = c.estado === "Activo";
  const nombre = `${c.nombres} ${c.apellidos}`.toUpperCase();
  return (
    <>
      <Text style={estilos.parrafo}>
        Que el(la) señor(a) <Text style={estilosBase.negrita}>{nombre}</Text>, identificado(a) con cédula de ciudadanía
        No. <Text style={estilosBase.negrita}>{c.cedula}</Text>, {activo ? "labora" : "laboró"} en nuestra empresa desde
        el <Text style={estilosBase.negrita}>{fechaIngresoTexto(c.fecha_ingreso)}</Text>, mediante contrato de trabajo{" "}
        {DESCRIPCION_CONTRATO[c.tipo_contrato] ?? c.tipo_contrato.toLowerCase()}, desempeñando el cargo de{" "}
        <Text style={estilosBase.negrita}>{c.cargo.toUpperCase()}</Text> en el área {c.area}.
      </Text>
      {contenido.incluirSalario ? (
        <Text style={estilos.parrafo}>
          {activo ? "Actualmente devenga" : "Devengaba"} un salario básico mensual de{" "}
          <Text style={estilosBase.negrita}>
            {pesosEnLetras(c.salario_base)} ({formatCurrency(c.salario_base)})
          </Text>
          .
        </Text>
      ) : null}
    </>
  );
}

function CuerpoIngresos({ contenido }: { contenido: ContenidoCertificado }) {
  const c = contenido.colaborador;
  const ing = contenido.ingresos;
  const nombre = `${c.nombres} ${c.apellidos}`.toUpperCase();
  if (!ing) return null;
  return (
    <>
      <Text style={estilos.parrafo}>
        Que al(la) señor(a) <Text style={estilosBase.negrita}>{nombre}</Text>, identificado(a) con cédula de ciudadanía
        No. <Text style={estilosBase.negrita}>{c.cedula}</Text>, quien se desempeña en el cargo de {c.cargo}, le fueron
        pagados durante el año gravable <Text style={estilosBase.negrita}>{ing.anio}</Text> los siguientes valores por
        concepto de pagos laborales, según {ing.cantidadDesprendibles}{" "}
        {ing.cantidadDesprendibles === 1 ? "comprobante" : "comprobantes"} de nómina registrados:
      </Text>
      <View style={estilos.tabla}>
        <View style={estilos.fila}>
          <Text>Total ingresos laborales (devengados)</Text>
          <Text style={estilosBase.negrita}>{formatCurrency(ing.totalDevengado)}</Text>
        </View>
        <View style={estilos.fila}>
          <Text>Aportes obligatorios a salud</Text>
          <Text>{formatCurrency(ing.deduccionSalud)}</Text>
        </View>
        <View style={estilos.fila}>
          <Text>Aportes obligatorios a pensión</Text>
          <Text>{formatCurrency(ing.deduccionPension)}</Text>
        </View>
        <View style={estilos.filaTotal}>
          <Text style={estilosBase.negrita}>Retención en la fuente practicada</Text>
          <Text style={estilosBase.negrita}>{formatCurrency(ing.retencionFuente)}</Text>
        </View>
      </View>
    </>
  );
}

/** Plantilla PDF de certificado laboral / de ingresos y retenciones. */
export function CertificadoTemplate({ certificado, empresa }: CertificadoTemplateProps) {
  const contenido = certificado.contenido;
  const esIngresos = certificado.tipo === "Ingresos y retenciones";
  const titulo = esIngresos ? "CERTIFICADO DE INGRESOS Y RETENCIONES" : "CERTIFICACIÓN LABORAL";

  return (
    <Document
      title={`${titulo} - ${certificado.colaboradorNombre}`}
      author={empresa.nombre}
      subject={titulo}
      language="es"
    >
      <Page size="LETTER" style={estilos.pagina}>
        <View style={estilosBase.encabezado}>
          <View style={estilosBase.marcaEmpresa}>
            <Text style={estilosBase.logo}>{inicialesEmpresa(empresa.nombre)}</Text>
            <View>
              <Text style={estilosBase.nombreEmpresa}>{empresa.nombre}</Text>
              {empresa.nit ? <Text style={estilosBase.datoEmpresa}>NIT {empresa.nit}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={[estilosBase.datoEmpresa, { textAlign: "right" }]}>{empresa.direccion}</Text>
            <Text style={[estilosBase.datoEmpresa, { textAlign: "right" }]}>{empresa.ciudad}</Text>
            {empresa.telefono ? (
              <Text style={[estilosBase.datoEmpresa, { textAlign: "right" }]}>Tel. {empresa.telefono}</Text>
            ) : null}
          </View>
        </View>

        <Text style={estilos.titulo}>{titulo}</Text>

        <Text style={estilos.suscrito}>
          {empresa.cargoRepresentante ? `EL(LA) ${empresa.cargoRepresentante.toUpperCase()}` : "EL REPRESENTANTE LEGAL"} DE{" "}
          {empresa.nombre.toUpperCase()}
        </Text>
        {empresa.nit ? <Text style={{ textAlign: "center" }}>NIT {empresa.nit}</Text> : null}
        <Text style={estilos.certifica}>CERTIFICA:</Text>

        {contenido ? (
          esIngresos ? (
            <CuerpoIngresos contenido={contenido} />
          ) : (
            <CuerpoLaboral contenido={contenido} />
          )
        ) : (
          <Text style={estilos.parrafo}>No fue posible leer el contenido de este certificado.</Text>
        )}

        {contenido?.textoAdicional ? <Text style={estilos.parrafo}>{contenido.textoAdicional}</Text> : null}

        <Text style={estilos.parrafo}>
          La presente certificación se expide a solicitud del interesado
          {contenido?.dirigidoA ? `, con destino a ${contenido.dirigidoA}` : ""}, en la ciudad de{" "}
          {empresa.ciudad || "—"}, {fechaExpedicion(certificado.fecha_generacion)}.
        </Text>

        <View style={estilos.firma}>
          <Text style={estilos.lineaFirma}>{empresa.representanteLegal || "Representante Legal"}</Text>
          <Text>{empresa.cargoRepresentante || "Representante Legal"}</Text>
          <Text>{empresa.nombre}</Text>
        </View>

        {esIngresos ? (
          <Text style={estilos.nota}>
            Este certificado resume los pagos registrados en el sistema de nómina y no reemplaza el Formulario 220 de
            la DIAN.
          </Text>
        ) : null}

        <Text style={estilosBase.piePagina} fixed>
          Código de verificación: {certificado.id} · Generado por: {certificado.generado_por || "Sistema"} ·{" "}
          {[empresa.direccion, empresa.ciudad, empresa.telefono].filter(Boolean).join(" · ")}
        </Text>
      </Page>
    </Document>
  );
}
