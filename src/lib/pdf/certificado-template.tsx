/**
 * Plantilla PDF del certificado laboral: réplica del certificado oficial de la empresa (carta vertical,
 * logo y razón social en Forte arriba, "C E R T I F I C A", datos en Arial de 13 pt, firma del gerente y
 * pie con la oficina). Las posiciones están medidas sobre el certificado original (pt, desde arriba).
 *
 * Datos que varían: nombre, documento y lugar de expedición, fecha de ingreso, cargo y fecha de
 * expedición. El tipo de contrato es siempre "Indefinido". El cargo del personal de campo es "Auxiliar de Campo" (como en la nómina); el
 * de administrativos y operadores es el de su ficha (Gerente, Supervisora, Operador).
 */
import { randomBytes } from "node:crypto";
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DatosEmpresa } from "@/lib/empresa";
import { MESES, formatNumber, numeroALetras, parseFecha } from "@/lib/utils";
import type { Certificado, ContenidoCertificado } from "@/types/certificado";
import { ALTO_FIRMA, ANCHO_FIRMA, FRANJAS_FIRMA } from "./firma";
import { ARIMO_NEGRITA, ARIMO_REGULAR } from "./fuente-arimo";
import { ENCABEZADO_CERTIFICADO_DATA_URI, LOGO_CERTIFICADO_DATA_URI } from "./membrete";

// Arimo = medidas de Arial (la fuente del original). Sin kerning, como Word: las líneas cortan igual.
Font.register({
  family: "Arimo",
  fonts: [
    { src: ARIMO_REGULAR, fontWeight: 400 },
    { src: ARIMO_NEGRITA, fontWeight: 700 },
  ],
});

/** Membrete y firma del certificado oficial: no dependen de la persona. */
const CIUDAD_EXPEDICION = "Barranca de Upia, Meta";
/** Por decisión de la empresa, todos los certificados dicen contrato indefinido (sin importar la ficha). */
export const TIPO_CONTRATO = "Indefinido";
const FIRMA = ["CARLOS ENRIQUE MARTINEZ.", "GERENTE", "JAIRO MARTINEZ JMC SAS ZOMAC"];
const PIE = ["OFICINA: CR3 10 61 CENTRO", "BARRANCA DE UPIA META", "MOVIL: 304 123 8054", "GMAIL: jairomartinezjmcsaszomac@gmail.com"];

const TAM = 13;
/** Desde la línea base hasta el borde superior de la caja de texto (Arimo, interlineado 1). */
const ASCENSO = 0.89;
const IZQUIERDA = 90;
const ANCHO_TEXTO = 432;
const INTERLINEADO = 15;

const s = StyleSheet.create({
  pagina: { fontFamily: "Arimo", fontFeatureSettings: { kern: false }, fontSize: TAM, color: "#000000", lineHeight: 1 },
  abs: { position: "absolute" },
  negrita: { fontWeight: 700 },
  // El interlineado se calcula sobre el tamaño de letra del propio estilo: se fija aquí
  parrafo: { position: "absolute", left: IZQUIERDA, width: ANCHO_TEXTO, fontSize: TAM, lineHeight: INTERLINEADO / TAM },
  linea15: { fontSize: TAM, lineHeight: INTERLINEADO / TAM },
});

const desdeBase = (base: number, tam = TAM) => base - tam * ASCENSO;

/** Texto de una línea anclado a su línea base. */
function T({ x, base, negrita, tam = TAM, children }: { x: number; base: number; negrita?: boolean; tam?: number; children: string }) {
  return <Text style={[s.abs, { left: x, top: desdeBase(base, tam), fontSize: tam }, negrita ? s.negrita : {}]}>{children}</Text>;
}

const mayusculaInicial = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** "02 de Marzo del 2024" */
function fechaIngreso(fecha: string): string {
  const d = parseFecha(fecha);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")} de ${mayusculaInicial(MESES[d.getMonth()])} del ${d.getFullYear()}`;
}

/** "nueve (09) de Octubre de dos mil veintiséis (2026)" */
function fechaExpedicion(fecha: string): string {
  const d = parseFecha(fecha) ?? new Date();
  const dia = d.getDate();
  const anio = d.getFullYear();
  return `${numeroALetras(dia).toLowerCase()} (${String(dia).padStart(2, "0")}) de ${mayusculaInicial(MESES[d.getMonth()])} de ${numeroALetras(anio).toLowerCase()} (${anio})`;
}

/** Cargo que aparece en el certificado. */
function cargoCertificado(c: ContenidoCertificado["colaborador"]): string {
  return c.area === "Campo" ? "Auxiliar de Campo" : c.cargo;
}

/** Posición de la firma: encima de "CARLOS ENRIQUE MARTINEZ." (línea base 536,1). */
const X_FIRMA = 88.6;
const TOP_FIRMA = 536.1 - TAM * ASCENSO - ALTO_FIRMA - 2;

/**
 * Permisos del PDF (cifrado AES-256): se puede abrir sin contraseña, ver, descargar e imprimir, pero no
 * editar, copiar ni extraer contenido, anotar ni reorganizar páginas. La contraseña de propietario es
 * aleatoria en cada descarga y no se guarda: nadie puede levantar las restricciones con ella.
 */
const PERMISOS = {
  printing: "highResolution",
  modifying: false,
  copying: false,
  annotating: false,
  fillingForms: false,
  contentAccessibility: true,
  documentAssembly: false,
} as const;

/**
 * Firma del representante legal, protegida: va en franjas (extraerla da pedazos), con microtexto de
 * uso exclusivo horneado en la imagen y, encima, el código de ESTE certificado: una copia de la firma
 * pegada en otro documento delata de qué certificado salió.
 */
function Firma({ codigo, fecha }: { codigo: string; fecha: string }) {
  const marca = `CERTIFICADO ${codigo} · ${fecha} · JMC · `;
  return (
    <>
      {FRANJAS_FIRMA.map((franja) => (
        // eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt
        <Image
          key={franja.x}
          src={franja.src}
          style={[s.abs, { left: X_FIRMA + franja.x, top: TOP_FIRMA, width: franja.ancho, height: ALTO_FIRMA }]}
        />
      ))}
      {[0.28, 0.62].map((fraccion) => (
        <Text
          key={fraccion}
          style={[
            s.abs,
            {
              left: X_FIRMA,
              top: TOP_FIRMA + ALTO_FIRMA * fraccion,
              width: ANCHO_FIRMA,
              height: 6,
              overflow: "hidden",
              fontSize: 4.2,
              color: "#8A8FA3",
              opacity: 0.55,
            },
          ]}
        >
          {marca.repeat(4)}
        </Text>
      ))}
    </>
  );
}

export interface CertificadoTemplateProps {
  certificado: Certificado;
  empresa: DatosEmpresa;
}

export function CertificadoTemplate({ certificado, empresa }: CertificadoTemplateProps) {
  const contenido = certificado.contenido;
  const c = contenido?.colaborador;
  const destino = contenido?.dirigidoA?.trim();
  const conDestino = destino && destino.toUpperCase() !== "A QUIEN INTERESE";

  return (
    <Document
      title={`Certificado laboral - ${certificado.colaboradorNombre}`}
      author={empresa.nombre}
      subject="Certificado laboral"
      language="es"
      pdfVersion="1.7ext3"
      ownerPassword={randomBytes(32).toString("hex")}
      permissions={PERMISOS}
    >
      <Page size="LETTER" style={s.pagina}>
        {/* Membrete */}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
        <Image src={LOGO_CERTIFICADO_DATA_URI} style={[s.abs, { left: 139.55, top: 14.3, width: 54.8, height: 62.045 }]} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
        <Image src={ENCABEZADO_CERTIFICADO_DATA_URI} style={[s.abs, { left: 226.9, top: 30.8, width: 193, height: 26.8 }]} />

        <T x={252.7} base={133.4} negrita>
          C E R T I F I C A
        </T>

        {c ? (
          <>
            <Text style={[s.parrafo, { top: desdeBase(194) }]}>
              Que, el señor(a) <Text style={s.negrita}>{`${c.apellidos} ${c.nombres}`.toUpperCase()},</Text> identificado (a) con{" "}
              {c.tipo_documento ?? "CC"} número <Text style={s.negrita}>{formatNumber(Number(c.cedula))}</Text>
              {c.lugar_expedicion ? ` de ${c.lugar_expedicion}` : ""}, {c.estado === "Activo" ? "labora" : "laboró"} en esta empresa:
            </Text>

            <T x={95.8} base={254.5}>Fecha de Ingreso:</T>
            <T x={287.3} base={254.5}>{fechaIngreso(c.fecha_ingreso)}</T>
            <T x={95.8} base={284.5}>Último Cargo:</T>
            <T x={290.9} base={284.5}>{cargoCertificado(c)}</T>
            <T x={95.8} base={314.3}>Tipo de Contrato:</T>
            <T x={290.2} base={314.3}>{TIPO_CONTRATO}</T>
          </>
        ) : (
          <Text style={[s.parrafo, { top: desdeBase(194) }]}>No fue posible leer el contenido de este certificado.</Text>
        )}

        {/* Expedición y despedida: van seguidas, por si el administrador agregó un texto adicional */}
        <View style={[s.abs, { left: IZQUIERDA, width: ANCHO_TEXTO, top: desdeBase(359.5) }]}>
          {contenido?.textoAdicional ? (
            <Text style={[s.linea15, { marginBottom: 15 }]}>{contenido.textoAdicional}</Text>
          ) : null}
          <Text style={s.linea15}>
            Se expide la solicitud{conDestino ? ` con destino a ${destino}` : ""} en {CIUDAD_EXPEDICION} el día{" "}
            {fechaExpedicion(certificado.fecha_generacion)}.
          </Text>
          <Text style={{ marginTop: 26.2 }}>Cordialmente,</Text>
        </View>

        {/* Firma */}
        <Firma codigo={certificado.id} fecha={certificado.fecha_generacion} />
        {FIRMA.map((linea, i) => (
          <T key={linea} x={88.6} base={[536.1, 551.3, 566.3][i]} negrita>
            {linea}
          </T>
        ))}

        {/* Pie con los datos de la oficina, centrado */}
        {PIE.map((linea, i) => (
          <Text
            key={linea}
            style={[s.abs, s.negrita, { left: 0, right: 0, textAlign: "center", fontSize: 9, top: desdeBase([735.8, 752.2, 768.6, 784.6][i], 9) }]}
          >
            {linea}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
