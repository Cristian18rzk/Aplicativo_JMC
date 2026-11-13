// Extrae el texto de cada página de un PDF con su posición (solo servidor).
import "server-only";
import { getDocumentProxy } from "unpdf";
import type { PaginaTexto } from "./tipos";

/** Lee todas las páginas: cada fragmento de texto con su borde izquierdo, derecho y altura desde arriba. */
export async function extraerPaginas(bytes: Uint8Array): Promise<PaginaTexto[]> {
  // pdf.js puede quedarse con el buffer: se le pasa una copia
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const paginas: PaginaTexto[] = [];
  try {
    for (let numero = 1; numero <= pdf.numPages; numero++) {
      const pagina = await pdf.getPage(numero);
      const { width, height } = pagina.getViewport({ scale: 1 });
      const { items } = await pagina.getTextContent();
      paginas.push({
        numero,
        ancho: width,
        alto: height,
        items: items.flatMap((item) => {
          if (!("str" in item) || !item.str.trim()) return [];
          const x = item.transform[4];
          return [{ texto: item.str.trim(), x, xFin: x + item.width, y: height - item.transform[5] }];
        }),
      });
      pagina.cleanup();
    }
  } finally {
    await pdf.cleanup();
  }
  return paginas;
}
