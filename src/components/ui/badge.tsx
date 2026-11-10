import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const VARIANTES = {
  default: "bg-acento-suave text-acento ring-acento/20",
  success: "bg-green-50 text-exito ring-exito/20",
  warning: "bg-amber-50 text-amber-700 ring-alerta/30",
  destructive: "bg-red-50 text-error ring-error/20",
  neutral: "bg-slate-100 text-texto-suave ring-slate-300/50",
} as const;

export type VarianteBadge = keyof typeof VARIANTES;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variante?: VarianteBadge;
}

export function Badge({ variante = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        VARIANTES[variante],
        className,
      )}
      {...props}
    />
  );
}

/** Variante de badge según el estado del colaborador. */
export function varianteEstado(estado: string): VarianteBadge {
  if (estado === "Activo") return "success";
  if (estado === "Inactivo") return "warning";
  if (estado === "Retirado") return "destructive";
  return "neutral";
}
