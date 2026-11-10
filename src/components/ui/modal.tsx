"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const ANCHOS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
} as const;

export interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  pie?: ReactNode;
  ancho?: keyof typeof ANCHOS;
}

/** Modal accesible: overlay, animación, cierre con Escape y clic afuera. */
export function Modal({ abierto, onCerrar, titulo, descripcion, children, pie, ancho = "md" }: ModalProps) {
  const idTitulo = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCerrarRef = useRef(onCerrar);

  useEffect(() => {
    onCerrarRef.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    if (!abierto) return;
    const anteriorFoco = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrarRef.current();
    };
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = overflowAnterior;
      anteriorFoco?.focus();
    };
  }, [abierto]);

  if (!abierto || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-aparecer bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onCerrar}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92vh] w-full animate-subir flex-col rounded-t-xl bg-white shadow-xl outline-none sm:rounded-lg",
          ANCHOS[ancho],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-borde px-5 py-4">
          <div>
            <h2 id={idTitulo} className="text-lg font-semibold text-texto">
              {titulo}
            </h2>
            {descripcion ? <p className="mt-0.5 text-sm text-texto-suave">{descripcion}</p> : null}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-1.5 text-texto-suave transition-colors hover:bg-slate-100 hover:text-texto"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {pie ? (
          <div className="flex flex-col-reverse gap-2 border-t border-borde px-5 py-3 sm:flex-row sm:justify-end">
            {pie}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
