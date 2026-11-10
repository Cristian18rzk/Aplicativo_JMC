import { Font, StyleSheet } from "@react-pdf/renderer";

// Desactiva la separación silábica automática (pensada para inglés): no partir palabras en español
Font.registerHyphenationCallback((palabra) => [palabra]);

/** Paleta compartida por las plantillas PDF. */
export const COLORES_PDF = {
  acento: "#1E40AF",
  acentoSuave: "#DBEAFE",
  texto: "#1E293B",
  textoSuave: "#64748B",
  borde: "#E2E8F0",
  fondo: "#F8FAFC",
  exito: "#16A34A",
  error: "#DC2626",
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
    borderBottomWidth: 2,
    borderBottomColor: COLORES_PDF.acento,
    marginBottom: 16,
  },
  marcaEmpresa: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORES_PDF.acento,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    textAlign: "center",
    paddingTop: 13,
  },
  nombreEmpresa: { fontFamily: "Helvetica-Bold", fontSize: 13, color: COLORES_PDF.acento, marginBottom: 3 },
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

/** Texto del "logo": "JMC S.A.S." → "JMC"; "Grupo Andino Ltda" → "GA". */
export function inicialesEmpresa(nombre: string): string {
  const palabras = nombre
    .replace(/\b(S\.?A\.?S|LTDA|S\.?A)\b\.?/gi, "")
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (palabras.length === 0) return nombre.slice(0, 3).toUpperCase();
  if (palabras.length === 1) return palabras[0].slice(0, 3).toUpperCase();
  return palabras
    .slice(0, 3)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

/** Quita el punto final para no duplicarlo al cerrar una oración ("S.A.S.." → "S.A.S."). */
export function sinPuntoFinal(texto: string): string {
  return texto.replace(/\.+$/, "");
}
