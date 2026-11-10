"use client";

import { useContext } from "react";
import { ToastContext, type ContextoToast } from "@/components/ui/toast";

/**
 * Hook del sistema de toasts.
 * Uso: const toast = useToast(); toast.success("Guardado"); toast.error("Falló", { descripcion: "..." });
 * Los toasts se cierran automáticamente (4 s; 6 s los de error).
 */
export function useToast(): ContextoToast {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return contexto;
}
