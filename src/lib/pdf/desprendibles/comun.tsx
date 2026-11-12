// Piezas compartidas por las dos plantillas de desprendible (administrativos y colaboradores).
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DatosEmpresa } from "@/lib/empresa";
import { formatDate, formatPeriodo } from "@/lib/utils";
import type { ContenidoDesprendible } from "@/types/desprendible";
import { COLORES_PDF, estilosBase, sinPuntoFinal } from "../estilos";
import { LOGO_JMC_DATA_URI } from "../logo";

export interface PlantillaDesprendibleProps {
  contenido: ContenidoDesprendible;
  empresa: DatosEmpresa;
}

/** "Octubre 2026 · Quincenal 1 (1 al 15 de octubre)" */
export function textoPeriodo(c: ContenidoDesprendible): string {
  const rango = c.fechaInicio && c.fechaFin ? ` (${formatDate(c.fechaInicio)} – ${formatDate(c.fechaFin)})` : "";
  return `${formatPeriodo(c.periodo)} · ${c.tipo_periodo}${rango}`;
}

/** "CC 1098765432" */
export const textoDocumento = (c: ContenidoDesprendible) => `${c.colaborador.tipo_documento} ${c.colaborador.documento}`;

const estilos = StyleSheet.create({
  marca: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 46, height: 46, borderRadius: 23 },
  nombre: { fontFamily: "Helvetica-Bold", fontSize: 12, marginBottom: 2 },
  dato: { fontSize: 7.5, color: COLORES_PDF.textoSuave },
});

/** Logo + razón social + NIT + dirección. */
export function MarcaEmpresa({ empresa }: { empresa: DatosEmpresa }) {
  return (
    <View style={estilos.marca}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf no admite alt */}
      <Image src={LOGO_JMC_DATA_URI} style={estilos.logo} />
      <View>
        <Text style={estilos.nombre}>{empresa.nombre}</Text>
        {empresa.nit ? <Text style={estilos.dato}>NIT {empresa.nit}</Text> : null}
        {empresa.direccion || empresa.ciudad ? (
          <Text style={estilos.dato}>{[empresa.direccion, empresa.ciudad].filter(Boolean).join(" · ")}</Text>
        ) : null}
      </View>
    </View>
  );
}

/** Pie fijo con el código del documento. */
export function PieDesprendible({ empresa, codigo }: { empresa: DatosEmpresa; codigo?: string }) {
  return (
    <Text style={estilosBase.piePagina} fixed>
      Documento generado por el Portal JMC de {sinPuntoFinal(empresa.nombre)}
      {codigo ? ` · Código ${codigo}` : ""}
    </Text>
  );
}
