/** Construye la respuesta HTTP para un PDF. `descargar=true` fuerza la descarga; si no, se muestra en el navegador. */
export function respuestaPdf(buffer: Buffer, nombreArchivo: string, descargar: boolean): Response {
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${nombreArchivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
