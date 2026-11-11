import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DatosEmpresa } from "@/lib/empresa";
import { MESES, parseFecha } from "@/lib/utils";
import type { Certificado, ContenidoCertificado } from "@/types/certificado";
import { NOMBRES_DOCUMENTO } from "@/types/colaborador";
import { COLORES_PDF, estilosBase } from "./estilos";
import { LOGO_JMC_DATA_URI } from "./logo";

const estilos = StyleSheet.create({
  pagina: { ...estilosBase.pagina, paddingTop: 48, paddingBottom: 72, paddingHorizontal: 72, fontSize: 11, lineHeight: 1.6 },
  // Marco Oro Ala de dos líneas alrededor de la página (sello de distinción de los certificados)
  marcoExterior: {
    position: "absolute",
    top: 22,
    left: 22,
    right: 22,
    bottom: 22,
    borderWidth: 1,
    borderColor: COLORES_PDF.oro,
  },
  marcoInterior: {
    position: "absolute",
    top: 27,
    left: 27,
    right: 27,
    bottom: 27,
    borderWidth: 1,
    borderColor: COLORES_PDF.oro,
  },
  encabezado: { alignItems: "center", gap: 8 },
  logo: { width: 72, height: 72, borderRadius: 36 },
  lineaEmpresa: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: COLORES_PDF.oroOscuro,
    textAlign: "center",
  },
  datosEmpresa: { fontSize: 8, color: COLORES_PDF.textoSuave, textAlign: "center" },
  titulo: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 24,
    color: COLORES_PDF.texto,
  },
  pie: { ...estilosBase.piePagina, bottom: 38, left: 72, right: 72 },
  suscrito: { fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 4 },
  certifica: { fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 12, marginBottom: 18, fontSize: 12 },
  parrafo: { textAlign: "justify", marginBottom: 12 },
  firma: { marginTop: 64, width: 240 },
  lineaFirma: { borderTopWidth: 1, borderTopColor: COLORES_PDF.texto, paddingTop: 4 },
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
        Que el(la) señor(a) <Text style={estilosBase.negrita}>{nombre}</Text>, identificado(a) con{" "}
        {/* Certificados antiguos no guardaban el tipo de documento: eran cédulas de ciudadanía */}
        {NOMBRES_DOCUMENTO[c.tipo_documento ?? "CC"].toLowerCase()} No.{" "}
        <Text style={estilosBase.negrita}>{c.cedula}</Text>, {activo ? "labora" : "laboró"} en nuestra empresa desde
        el <Text style={estilosBase.negrita}>{fechaIngresoTexto(c.fecha_ingreso)}</Text>, mediante contrato de trabajo{" "}
        {DESCRIPCION_CONTRATO[c.tipo_contrato] ?? c.tipo_contrato.toLowerCase()}, desempeñando el cargo de{" "}
        <Text style={estilosBase.negrita}>{c.cargo.toUpperCase()}</Text> en el área {c.area}.
      </Text>
    </>
  );
}

/** Plantilla PDF del certificado laboral. */
export function CertificadoTemplate({ certificado, empresa }: CertificadoTemplateProps) {
  const contenido = certificado.contenido;
  const titulo = "CERTIFICACIÓN LABORAL";

  return (
    <Document
      title={`${titulo} - ${certificado.colaboradorNombre}`}
      author={empresa.nombre}
      subject={titulo}
      language="es"
    >
      <Page size="LETTER" style={estilos.pagina}>
        <View style={estilos.marcoExterior} fixed />
        <View style={estilos.marcoInterior} fixed />

        <View style={estilos.encabezado}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
          <Image src={LOGO_JMC_DATA_URI} style={estilos.logo} />
          <Text style={estilos.lineaEmpresa}>
            {empresa.nombre}
            {empresa.nit ? ` · NIT ${empresa.nit}` : ""}
          </Text>
          <Text style={estilos.datosEmpresa}>
            {[empresa.direccion, empresa.ciudad, empresa.telefono ? `Tel. ${empresa.telefono}` : ""].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={[estilosBase.fileteDoble, { marginTop: 14 }]} />

        <Text style={estilos.titulo}>{titulo}</Text>

        <Text style={estilos.suscrito}>
          {empresa.cargoRepresentante ? `EL(LA) ${empresa.cargoRepresentante.toUpperCase()}` : "EL REPRESENTANTE LEGAL"} DE{" "}
          {empresa.nombre.toUpperCase()}
        </Text>
        {empresa.nit ? <Text style={{ textAlign: "center" }}>NIT {empresa.nit}</Text> : null}
        <Text style={estilos.certifica}>CERTIFICA:</Text>

        {contenido ? (
          <CuerpoLaboral contenido={contenido} />
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

        <Text style={estilos.pie} fixed>
          Código de verificación: {certificado.id} · Generado por: {certificado.generado_por || "Sistema"} ·{" "}
          {[empresa.direccion, empresa.ciudad, empresa.telefono].filter(Boolean).join(" · ")}
        </Text>
      </Page>
    </Document>
  );
}
