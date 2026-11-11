"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./loading-spinner";

const VARIANTES = {
  primary: "bg-acento text-white shadow-sm hover:bg-acento-hover focus-visible:outline-acento",
  secondary: "border border-borde-fuerte bg-white text-texto hover:bg-slate-50",
  ghost: "text-texto hover:bg-slate-100",
  destructive: "bg-error text-white shadow-sm hover:bg-[#962c23] focus-visible:outline-error",
  /** Naranja Sol: acciones de énfasis puntual (no reemplaza al primario) */
  sol: "bg-sol text-texto shadow-sm hover:bg-sol-claro focus-visible:outline-sol",
} as const;

const TAMANOS = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-11 gap-2 px-[18px] text-sm",
  lg: "h-12 gap-2 px-6 text-base",
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: keyof typeof VARIANTES;
  tamano?: keyof typeof TAMANOS;
  cargando?: boolean;
}

/** Clases del botón, reutilizables en enlaces (<Link>/<a>) con apariencia de botón. */
export function clasesBoton(
  variante: keyof typeof VARIANTES = "primary",
  tamano: keyof typeof TAMANOS = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-60",
    VARIANTES[variante],
    TAMANOS[tamano],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variante = "primary", tamano = "md", cargando = false, disabled, className, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={clasesBoton(variante, tamano, className)}
      {...props}
    >
      {cargando ? (
        <LoadingSpinner
          tamano="sm"
          etiqueta="Procesando"
          className={variante === "primary" || variante === "destructive" ? "text-white" : undefined}
        />
      ) : null}
      {children}
    </button>
  );
});
