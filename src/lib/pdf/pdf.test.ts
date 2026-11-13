// Comprueba que cada documento PDF se genere sin errores (no revisa el diseño visual).
import { describe, expect, it } from "vitest";
import { IDS, crearColaborador } from "@test/fabricas";
import { nombreArchivoCertificado, renderizarCertificadoPdf } from "@/components/certificados/certificado-pdf";
import type { DatosEmpresa } from "@/lib/empresa";
import { PLANTILLAS_DESPRENDIBLE } from "@/types/desprendible";
import { extraerPaginas } from "@/lib/lector/texto-pdf";
import { CONTENIDO_EJEMPLO, renderizarDesprendiblePdf } from "./desprendibles";

const empresa: DatosEmpresa = {
  nombre: "Empresa De Prueba S.A.S.",
  nit: "900.000.000-0",
  direccion: "Calle 1 # 2-3",
  ciudad: "Villavicencio",
  telefono: "3000000000",
  representanteLegal: "Representante De Prueba",
  cargoRepresentante: "Gerente",
};

const esPdf = (buffer: Buffer) => buffer.subarray(0, 5).toString("latin1") === "%PDF-";

describe("PDF", () => {
  it.each(PLANTILLAS_DESPRENDIBLE)("genera el desprendible con la plantilla %s", async (plantilla) => {
    const buffer = await renderizarDesprendiblePdf(plantilla, CONTENIDO_EJEMPLO[plantilla], empresa);
    expect(esPdf(buffer)).toBe(true);
  });

  it("genera el certificado laboral", async () => {
    const colaborador = crearColaborador();
    const buffer = await renderizarCertificadoPdf({
      empresa,
      certificado: {
        id: IDS.certificado,
        colaboradorId: colaborador.id,
        colaboradorNombre: "Persona De Prueba",
        colaboradorCedula: colaborador.cedula,
        tipo: "Laboral",
        fecha_generacion: "2026-11-11",
        generado_por: "Admin",
        contenido: { colaborador, dirigidoA: "A QUIEN INTERESE", textoAdicional: "Texto de prueba." },
      },
    });
    expect(esPdf(buffer)).toBe(true);
  });

  it("el certificado dice contrato indefinido aunque la ficha diga otro tipo", async () => {
    const colaborador = crearColaborador({ tipo_contrato: "Obra o labor" });
    const buffer = await renderizarCertificadoPdf({
      empresa,
      certificado: {
        id: IDS.certificado,
        colaboradorId: colaborador.id,
        colaboradorNombre: "Persona De Prueba",
        colaboradorCedula: colaborador.cedula,
        tipo: "Laboral",
        fecha_generacion: "2026-11-11",
        generado_por: "Admin",
        contenido: { colaborador, dirigidoA: "A QUIEN INTERESE", textoAdicional: "" },
      },
    });
    const textos = (await extraerPaginas(new Uint8Array(buffer)))[0].items.map((i) => i.texto);
    expect(textos).toContain("Indefinido");
    expect(textos.join(" ")).not.toContain("Obra o labor");
  });

  it("genera el certificado aunque falte la instantánea de datos", async () => {
    const buffer = await renderizarCertificadoPdf({
      empresa,
      certificado: {
        id: IDS.certificado,
        colaboradorId: IDS.colaborador,
        colaboradorNombre: "Persona De Prueba",
        colaboradorCedula: "1098765432",
        tipo: "Laboral",
        fecha_generacion: "2026-11-11",
        generado_por: "Admin",
        contenido: null,
      },
    });
    expect(esPdf(buffer)).toBe(true);
  });

  it("el nombre del certificado no lleva tildes ni caracteres peligrosos", () => {
    expect(nombreArchivoCertificado("Laboral", "1.098/765", "2026-11-11")).toBe("certificado_laboral_1-098-765_2026-11-11.pdf");
  });
});
