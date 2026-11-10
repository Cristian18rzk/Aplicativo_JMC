"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { ContenidoNavegacion } from "./sidebar";

/** Navegación en overlay para pantallas móviles. */
export function MobileNav({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
      <div className="absolute inset-0 animate-aparecer bg-slate-900/50" onClick={onCerrar} aria-hidden />
      <div className="relative flex h-full w-72 max-w-[85vw] animate-deslizar-izquierda flex-col bg-acento shadow-xl">
        <button
          type="button"
          onClick={onCerrar}
          className="absolute top-4 right-3 z-10 rounded-lg p-1.5 text-blue-100 hover:bg-white/10 hover:text-white"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
        <ContenidoNavegacion onNavegar={onCerrar} />
      </div>
    </div>
  );
}
