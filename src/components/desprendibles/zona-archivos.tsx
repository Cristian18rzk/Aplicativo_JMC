"use client";

import { FileUp } from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";
import { TAMANO_MAXIMO_PDF } from "@/types/desprendible";
import { cn } from "@/lib/utils";

/**
 * Zona para soltar o seleccionar PDF. Borde discontinuo Oro Ala (firma del cargue de archivos en el
 * sistema de diseño). Accesible por teclado: es un <label> asociado al input de archivo.
 */
export function ZonaArchivos({
  multiple = false,
  onArchivos,
  titulo,
  ayuda,
  error,
  deshabilitado,
}: {
  multiple?: boolean;
  onArchivos: (archivos: File[]) => void;
  titulo?: string;
  ayuda?: string;
  error?: string;
  deshabilitado?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);

  const recibir = (lista: FileList | null) => {
    const archivos = Array.from(lista ?? []);
    if (archivos.length) onArchivos(multiple ? archivos : archivos.slice(0, 1));
    if (input.current) input.current.value = "";
  };

  const alSoltar = (e: DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    if (!deshabilitado) recibir(e.dataTransfer.files);
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          if (!deshabilitado) setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={alSoltar}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed px-6 py-10 text-center transition-colors",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-acento",
          arrastrando
            ? "border-acento bg-acento-suave"
            : error
              ? "border-error bg-error/5"
              : "border-oro bg-[#FBF8F2] hover:border-oro-oscuro hover:bg-oro-suave",
          deshabilitado && "pointer-events-none opacity-60",
        )}
      >
        <FileUp className="h-9 w-9 text-acento" aria-hidden />
        <span>
          <span className="block font-medium text-texto">
            {titulo ?? (multiple ? "Arrastre los PDF aquí o haga clic para seleccionarlos" : "Arrastre el PDF aquí o haga clic para seleccionarlo")}
          </span>
          <span className="block text-sm text-texto-suave">
            {ayuda ?? `Solo PDF, de máximo ${TAMANO_MAXIMO_PDF / 1024 / 1024} MB por archivo`}
          </span>
        </span>
        <input
          ref={input}
          id={id}
          type="file"
          accept="application/pdf,.pdf"
          multiple={multiple}
          disabled={deshabilitado}
          onChange={(e) => recibir(e.target.files)}
          className="sr-only"
          aria-invalid={error ? true : undefined}
        />
      </label>
      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
