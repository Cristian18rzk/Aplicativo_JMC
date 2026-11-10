// Wrapper de servidor: renderiza la plantilla del certificado a un Buffer PDF.
// Se usa desde el route handler /api/certificados/[id]/pdf (runtime Node.js).
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificadoTemplate, type CertificadoTemplateProps } from "@/lib/pdf/certificado-template";

export async function renderizarCertificadoPdf(props: CertificadoTemplateProps): Promise<Buffer> {
  return renderToBuffer(<CertificadoTemplate {...props} />);
}

/** Nombre de archivo seguro: certificado_laboral_1020304050_2026-11-10.pdf */
export function nombreArchivoCertificado(tipo: string, cedula: string, fecha: string): string {
  const limpio = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .toLowerCase();
  return `certificado_${limpio(tipo)}_${limpio(cedula)}_${limpio(fecha)}.pdf`;
}
