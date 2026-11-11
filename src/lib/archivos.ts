import "server-only";
import { ErrorApi } from "@/lib/api";
import type { ArchivoPdf } from "@/lib/airtable/desprendibles";
import { esContenidoPdf, validarArchivoPdf } from "@/lib/validators/desprendible";

/** Lee el cuerpo multipart/form-data; 400 si no lo es. */
export async function leerFormulario(request: Request): Promise<FormData> {
  try {
    return await request.formData();
  } catch {
    throw new ErrorApi(400, "La solicitud debe enviarse como formulario con el archivo adjunto");
  }
}

/** Nombre seguro para guardar: sin rutas ni caracteres de control, con extensión .pdf. */
function limpiarNombre(nombre: string): string {
  const base = nombre.split(/[\\/]/).pop() ?? "desprendible.pdf";
  const limpio = base.replace(/[^\p{L}\p{N}._ -]+/gu, "_").slice(0, 150).trim() || "desprendible";
  return limpio.toLowerCase().endsWith(".pdf") ? limpio : `${limpio}.pdf`;
}

/**
 * Extrae y valida el PDF del campo indicado.
 * Verifica tamaño, tipo declarado y la firma real del contenido ("%PDF-").
 */
export async function leerPdf(formulario: FormData, campo = "archivo", obligatorio = true): Promise<ArchivoPdf | undefined> {
  const valor = formulario.get(campo);
  if (!(valor instanceof File) || valor.size === 0) {
    if (obligatorio) throw new ErrorApi(400, "Adjunte el PDF del desprendible");
    return undefined;
  }
  const error = validarArchivoPdf(valor);
  if (error) throw new ErrorApi(400, error);

  const bytes = new Uint8Array(await valor.arrayBuffer());
  if (!esContenidoPdf(bytes)) throw new ErrorApi(400, "El archivo no es un PDF válido");
  return { nombre: limpiarNombre(valor.name), bytes };
}

/** Respuesta HTTP para entregar un PDF (inline para verlo o attachment para descargarlo). */
export function respuestaArchivoPdf(bytes: Uint8Array, nombreArchivo: string, descargar: boolean): Response {
  // Nombre ASCII de respaldo + nombre UTF-8 (RFC 6266) para tildes y eñes
  const ascii = nombreArchivo.normalize("NFD").replace(/[^\x20-\x7e]/g, "").replace(/"/g, "");
  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
