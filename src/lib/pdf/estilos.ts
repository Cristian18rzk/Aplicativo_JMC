import { Font, StyleSheet } from "@react-pdf/renderer";

// Desactiva la separación silábica automática (pensada para inglés): no partir palabras en español
Font.registerHyphenationCallback((palabra) => [palabra]);

/** Paleta del Sistema de Diseño JMC v2 para las plantillas PDF. */
export const COLORES_PDF = {
  acento: "#2E6B3F", // Verde Palma
  acentoOscuro: "#1F4D2C",
  acentoSuave: "#EAF3EC",
  sol: "#E8782A", // Naranja Sol
  solClaro: "#F2A042",
  solOscuro: "#B4520F",
  solSuave: "#FDEEE0",
  oro: "#B8955A", // Oro Ala
  oroOscuro: "#8A6B37",
  oroSuave: "#F5EEE2",
  texto: "#2B2D2C", // Tinta
  textoSuave: "#6B6862", // Piedra
  borde: "#E6E1D8", // Línea
  bordeSuave: "#F0ECE4",
  fondo: "#FAF8F4", // Arena
  exito: "#2E6B3F",
  error: "#B3362B",
} as const;

export const estilosBase = StyleSheet.create({
  pagina: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: COLORES_PDF.texto,
    lineHeight: 1.4,
  },
  negrita: { fontFamily: "Helvetica-Bold" },
  encabezado: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
  },
  /**
   * Filete doble oro bajo el encabezado (firma de los documentos del sistema).
   * react-pdf no soporta border-style "double": se dibuja con dos líneas de 1pt.
   */
  fileteDoble: {
    height: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORES_PDF.oro,
    marginBottom: 16,
  },
  marcaEmpresa: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 48, height: 48, borderRadius: 24 },
  nombreEmpresa: { fontFamily: "Helvetica-Bold", fontSize: 13, color: COLORES_PDF.texto, marginBottom: 3 },
  datoEmpresa: { fontSize: 8, color: COLORES_PDF.textoSuave },
  piePagina: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: COLORES_PDF.borde,
    paddingTop: 6,
    fontSize: 7,
    color: COLORES_PDF.textoSuave,
    textAlign: "center",
  },
});

/** Quita el punto final para no duplicarlo al cerrar una oración ("S.A.S.." → "S.A.S."). */
export function sinPuntoFinal(texto: string): string {
  return texto.replace(/\.+$/, "");
}
