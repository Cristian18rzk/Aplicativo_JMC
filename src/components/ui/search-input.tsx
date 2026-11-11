"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { clasesCampo } from "./input";

interface SearchInputProps {
  valorInicial?: string;
  /** Se llama 300 ms después de que el usuario deja de escribir. */
  onBuscar: (valor: string) => void;
  placeholder?: string;
  retardo?: number;
  className?: string;
  "aria-label"?: string;
}

/** Input de búsqueda con icono y debounce (300 ms por defecto). */
export function SearchInput({
  valorInicial = "",
  onBuscar,
  placeholder = "Buscar…",
  retardo = 300,
  className,
  "aria-label": ariaLabel = "Buscar",
}: SearchInputProps) {
  const [valor, setValor] = useState(valorInicial);
  const onBuscarRef = useRef(onBuscar);
  const primeraVez = useRef(true);

  useEffect(() => {
    onBuscarRef.current = onBuscar;
  }, [onBuscar]);

  useEffect(() => {
    // No dispara la búsqueda en el montaje inicial
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    const temporizador = window.setTimeout(() => onBuscarRef.current(valor.trim()), retardo);
    return () => window.clearTimeout(temporizador);
  }, [valor, retardo]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-texto-suave" aria-hidden />
      <input
        type="search"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(clasesCampo(false), "h-11 pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden")}
      />
      {valor ? (
        <button
          type="button"
          onClick={() => setValor("")}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-texto-suave hover:bg-slate-100 hover:text-texto"
          aria-label="Limpiar búsqueda"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
