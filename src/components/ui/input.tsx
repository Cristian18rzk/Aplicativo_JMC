"use client";

import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const clasesCampo = (conError: boolean) =>
  cn(
    "block w-full rounded-lg border bg-white px-3 py-2 text-sm text-texto shadow-sm transition-colors",
    "placeholder:text-slate-400 focus:outline-none",
    "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-texto-suave",
    // Foco del sistema: borde 1.5px + halo de 4px
    conError
      ? "border-error focus:border-error focus:shadow-[0_0_0_0.5px_var(--error),0_0_0_4px_rgba(179,54,43,0.12)]"
      : "border-borde focus:border-acento focus:shadow-[0_0_0_0.5px_var(--acento),0_0_0_4px_var(--acento-suave)]",
  );

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  ayuda?: string;
}

/** Input con etiqueta, mensaje de error y ref reenviada. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, ayuda, id, className, required, ...props },
  ref,
) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  const idMensaje = `${idCampo}-mensaje`;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={idCampo} className="block text-sm font-medium text-texto">
          {label}
          {required ? <span className="ml-0.5 text-error">*</span> : null}
        </label>
      ) : null}
      <input
        ref={ref}
        id={idCampo}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? idMensaje : undefined}
        className={cn(clasesCampo(Boolean(error)), "h-11", className)}
        {...props}
      />
      {error ? (
        <p id={idMensaje} className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : ayuda ? (
        <p id={idMensaje} className="text-xs text-texto-suave">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/** Área de texto con el mismo estilo que Input. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, className, rows = 3, ...props },
  ref,
) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={idCampo} className="block text-sm font-medium text-texto">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={idCampo}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(clasesCampo(Boolean(error)), "resize-y", className)}
        {...props}
      />
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
});
