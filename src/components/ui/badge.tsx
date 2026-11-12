import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const VARIANTES = {
  default: "bg-acento-suave text-palma-800 ring-acento/20",
  success: "bg-acento-suave text-palma-800 ring-acento/20",
  warning: "bg-sol-suave text-sol-oscuro ring-sol/30",
  destructive: "bg-error/10 text-error ring-error/20",
  neutral: "bg-slate-100 text-texto-suave ring-slate-300/50",
  /** Oro Ala: certificados, sellos y distinciones */
  oro: "bg-oro-suave text-oro-oscuro ring-oro/30",
} as const;

export type VarianteBadge = keyof typeof VARIANTES;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variante?: VarianteBadge;
  /** Punto de color antes del texto (estados). */
  punto?: boolean;
}

export function Badge({ variante = "default", punto = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        VARIANTES[variante],
        className,
      )}
      {...props}
    >
      {punto ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Variante de badge según el estado del colaborador. */
export function varianteEstado(estado: string): VarianteBadge {
  if (estado === "Activo") return "success";
  if (estado === "Inactivo") return "warning";
  if (estado === "Retirado") return "destructive";
  return "neutral";
}
