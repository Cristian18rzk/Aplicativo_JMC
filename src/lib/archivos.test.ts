import { describe, expect, it } from "vitest";
import { leerPdf, respuestaArchivoPdf } from "./archivos";

const PDF = "%PDF-1.7 contenido";
const formularioCon = (archivo?: File) => {
  const datos = new FormData();
  if (archivo) datos.set("archivo", archivo);
  return datos;
};
const estado = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
    return 200;
  } catch (error) {
    return (error as { status?: number }).status;
  }
};

describe("leerPdf (cargue de desprendibles)", () => {
  it("acepta un PDF real y limpia el nombre del archivo", async () => {
    const archivo = new File([PDF], "../../nómina oct<>.PDF", { type: "application/pdf" });

    const leido = await leerPdf(formularioCon(archivo));

    // Sin la ruta "../../" y con los caracteres no permitidos reemplazados por "_"
    expect(leido?.nombre).toBe("nómina oct_.PDF");
    expect(leido?.bytes.length).toBe(PDF.length);
  });

  it("agrega la extensión .pdf si falta", async () => {
    const leido = await leerPdf(formularioCon(new File([PDF], "desprendible", { type: "application/pdf" })));
    expect(leido?.nombre).toBe("desprendible.pdf");
  });

  it("rechaza un archivo con nombre .pdf que en realidad no es PDF", async () => {
    const falso = new File(["MZ ejecutable"], "nomina.pdf", { type: "application/pdf" });
    expect(await estado(() => leerPdf(formularioCon(falso)))).toBe(400);
  });

  it("exige el archivo cuando es obligatorio y lo omite cuando no", async () => {
    expect(await estado(() => leerPdf(formularioCon()))).toBe(400);
    expect(await leerPdf(formularioCon(), "archivo", false)).toBeUndefined();
  });
});

describe("respuestaArchivoPdf", () => {
  it("entrega el PDF sin caché y con un nombre seguro en la cabecera", () => {
    const respuesta = respuestaArchivoPdf(new Uint8Array([1, 2]), 'desprendible "año".pdf', true);

    expect(respuesta.headers.get("Cache-Control")).toBe("private, no-store");
    expect(respuesta.headers.get("Content-Disposition")).toBe(
      `attachment; filename="desprendible ano.pdf"; filename*=UTF-8''${encodeURIComponent('desprendible "año".pdf')}`,
    );
  });
});
