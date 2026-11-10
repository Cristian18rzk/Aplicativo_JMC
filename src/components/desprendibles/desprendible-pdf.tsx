// Wrapper de servidor: renderiza la plantilla del desprendible a un Buffer PDF.
// Se usa desde el route handler /api/desprendibles/[id]/pdf (runtime Node.js).
import { renderToBuffer } from "@react-pdf/renderer";
import { DesprendibleTemplate, type DesprendibleTemplateProps } from "@/lib/pdf/desprendible-template";

export async function renderizarDesprendiblePdf(props: DesprendibleTemplateProps): Promise<Buffer> {
  return renderToBuffer(<DesprendibleTemplate {...props} />);
}

/** Nombre de archivo seguro: desprendible_2026-03_Quincenal-1_1020304050.pdf */
export function nombreArchivoDesprendible(periodo: string, tipo: string, cedula: string): string {
  const limpio = (s: string) => s.replace(/[^a-zA-Z0-9-]+/g, "-");
  return `desprendible_${limpio(periodo)}_${limpio(tipo)}_${limpio(cedula)}.pdf`;
}
