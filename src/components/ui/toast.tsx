"use client";

import { CircleCheck, CircleX, Info, X } from "lucide-react";
import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TipoToast = "success" | "error" | "info";

export interface Toast {
  id: number;
  tipo: TipoToast;
  titulo: string;
  descripcion?: string;
  duracion: number;
}

export interface OpcionesToast {
  descripcion?: string;
  /** Duración en ms antes de cerrarse automáticamente (por defecto 4000). */
  duracion?: number;
}

export interface ContextoToast {
  toasts: Toast[];
  mostrar: (tipo: TipoToast, titulo: string, opciones?: OpcionesToast) => number;
  success: (titulo: string, opciones?: OpcionesToast) => number;
  error: (titulo: string, opciones?: OpcionesToast) => number;
  info: (titulo: string, opciones?: OpcionesToast) => number;
  cerrar: (id: number) => void;
}

export const ToastContext = createContext<ContextoToast | null>(null);

const ESTILOS: Record<TipoToast, { icono: typeof Info; clases: string; colorIcono: string }> = {
  success: { icono: CircleCheck, clases: "border-l-exito", colorIcono: "text-exito" },
  error: { icono: CircleX, clases: "border-l-error", colorIcono: "text-error" },
  info: { icono: Info, clases: "border-l-acento", colorIcono: "text-acento" },
};

function ItemToast({ toast, onCerrar }: { toast: Toast; onCerrar: (id: number) => void }) {
  const { icono: Icono, clases, colorIcono } = ESTILOS[toast.tipo];

  // Auto-cierre
  useEffect(() => {
    const temporizador = window.setTimeout(() => onCerrar(toast.id), toast.duracion);
    return () => window.clearTimeout(temporizador);
  }, [toast.id, toast.duracion, onCerrar]);

  return (
    <div
      role={toast.tipo === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full animate-deslizar-derecha items-start gap-3 rounded-lg border border-l-4 border-borde bg-white p-4 shadow-lg",
        clases,
      )}
    >
      <Icono className={cn("mt-0.5 h-5 w-5 shrink-0", colorIcono)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-texto">{toast.titulo}</p>
        {toast.descripcion ? <p className="mt-0.5 text-sm break-words text-texto-suave">{toast.descripcion}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onCerrar(toast.id)}
        className="rounded p-0.5 text-texto-suave transition-colors hover:bg-slate-100 hover:text-texto"
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Proveedor del sistema de toasts. Renderiza las notificaciones en la esquina superior derecha. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const siguienteId = useRef(1);

  const cerrar = useCallback((id: number) => {
    setToasts((actuales) => actuales.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback((tipo: TipoToast, titulo: string, opciones: OpcionesToast = {}) => {
    const id = siguienteId.current++;
    const nuevo: Toast = {
      id,
      tipo,
      titulo,
      descripcion: opciones.descripcion,
      duracion: opciones.duracion ?? (tipo === "error" ? 6000 : 4000),
    };
    // Máximo 5 toasts visibles
    setToasts((actuales) => [...actuales.slice(-4), nuevo]);
    return id;
  }, []);

  const valor = useMemo<ContextoToast>(
    () => ({
      toasts,
      mostrar,
      cerrar,
      success: (titulo, opciones) => mostrar("success", titulo, opciones),
      error: (titulo, opciones) => mostrar("error", titulo, opciones),
      info: (titulo, opciones) => mostrar("info", titulo, opciones),
    }),
    [toasts, mostrar, cerrar],
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:w-96"
      >
        {toasts.map((toast) => (
          <ItemToast key={toast.id} toast={toast} onCerrar={cerrar} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
