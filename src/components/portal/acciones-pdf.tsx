import { Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TipoPeriodo } from "@/types/desprendible";

/**
 * Piezas del portal del colaborador. Pensadas para personas de campo que entran desde el celular:
 * botones grandes, siempre con texto (nunca solo un ícono) y palabras simples.
 */

/** "Quincenal 1" → "Primera quincena": como lo diría una persona. */
export function nombrePeriodo(tipo: TipoPeriodo): string {
  if (tipo === "Quincenal 1") return "Primera quincena";
  if (tipo === "Quincenal 2") return "Segunda quincena";
  return "Mes completo";
}

type Tono = "palma" | "oro";

const PRINCIPAL: Record<Tono, string> = {
  palma: "bg-acento text-white hover:bg-acento-hover",
  oro: "bg-oro-oscuro text-white hover:bg-[#6F5529]",
};

const SECUNDARIO: Record<Tono, string> = {
  palma: "border-2 border-palma-300 bg-white text-palma-800 hover:bg-palma-50",
  oro: "border-2 border-oro-claro bg-white text-oro-oscuro hover:bg-oro-suave",
};

/** Dos botones grandes: Descargar (principal) y Ver (abre el PDF en otra pestaña). */
export function AccionesPdf({
  url,
  queEs,
  tono = "palma",
  className,
}: {
  /** Ruta del PDF, sin parámetros. */
  url: string;
  /** Para lectores de pantalla: "el desprendible de noviembre 2026". */
  queEs: string;
  tono?: Tono;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-[1fr_auto] gap-2", className)}>
      <a
        href={`${url}?descargar=1`}
        aria-label={`Descargar ${queEs}`}
        className={cn(
          "inline-flex h-14 items-center justify-center gap-2.5 rounded-xl px-4 text-lg font-bold shadow-sm transition-colors",
          PRINCIPAL[tono],
        )}
      >
        <Download className="h-6 w-6" aria-hidden />
        Descargar
      </a>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ver ${queEs} en otra pestaña`}
        className={cn(
          "inline-flex h-14 items-center justify-center gap-2 rounded-xl px-5 text-lg font-bold transition-colors",
          SECUNDARIO[tono],
        )}
      >
        <Eye className="h-6 w-6" aria-hidden />
        Ver
      </a>
    </div>
  );
}
