"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { clasesCampo } from "./input";

export interface OpcionSelect {
  valor: string;
  etiqueta: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  error?: string;
  opciones: readonly (OpcionSelect | string)[];
  /** Texto de la opción vacía (si se omite no se muestra). */
  placeholder?: string;
}

/** Select nativo estilizado con etiqueta y error. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, opciones, placeholder, id, className, required, ...props },
  ref,
) {
  const idGenerado = useId();
  const idCampo = id ?? idGenerado;

  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={idCampo} className="block text-sm font-medium text-texto">
          {label}
          {required ? <span className="ml-0.5 text-error">*</span> : null}
        </label>
      ) : null}
      <div className="relative">
        <select
          ref={ref}
          id={idCampo}
          required={required}
          aria-invalid={error ? true : undefined}
          className={cn(clasesCampo(Boolean(error)), "h-11 appearance-none pr-9", className)}
          {...props}
        >
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {opciones.map((opcion) => {
            const { valor, etiqueta } = typeof opcion === "string" ? { valor: opcion, etiqueta: opcion } : opcion;
            return (
              <option key={valor} value={valor}>
                {etiqueta}
              </option>
            );
          })}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-texto-suave"
        />
      </div>
      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
