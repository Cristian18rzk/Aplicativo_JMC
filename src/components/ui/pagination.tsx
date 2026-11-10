"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  total?: number;
  porPagina?: number;
  onCambiar: (pagina: number) => void;
  className?: string;
}

/** Calcula los números visibles: 1 … 4 5 6 … 20 */
function numerosVisibles(actual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const numeros: (number | "…")[] = [1];
  const inicio = Math.max(2, actual - 1);
  const fin = Math.min(total - 1, actual + 1);
  if (inicio > 2) numeros.push("…");
  for (let i = inicio; i <= fin; i++) numeros.push(i);
  if (fin < total - 1) numeros.push("…");
  numeros.push(total);
  return numeros;
}

export function Pagination({ pagina, totalPaginas, total, porPagina, onCambiar, className }: PaginationProps) {
  if (totalPaginas <= 1 && !total) return null;

  const desde = total && porPagina ? (pagina - 1) * porPagina + 1 : null;
  const hasta = total && porPagina ? Math.min(pagina * porPagina, total) : null;
  const claseBoton =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav
      aria-label="Paginación"
      className={cn("flex flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row", className)}
    >
      <p className="text-sm text-texto-suave">
        {desde && hasta ? (
          <>
            Mostrando <span className="font-medium text-texto">{desde}</span>–
            <span className="font-medium text-texto">{hasta}</span> de{" "}
            <span className="font-medium text-texto">{total}</span>
          </>
        ) : (
          <>
            Página {pagina} de {totalPaginas}
          </>
        )}
      </p>
      {totalPaginas > 1 ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={cn(claseBoton, "text-texto hover:bg-slate-100")}
            onClick={() => onCambiar(pagina - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          {numerosVisibles(pagina, totalPaginas).map((n, i) =>
            n === "…" ? (
              <span key={`e${i}`} className="px-1 text-texto-suave">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onCambiar(n)}
                aria-current={n === pagina ? "page" : undefined}
                className={cn(
                  claseBoton,
                  "hidden sm:inline-flex",
                  n === pagina ? "bg-acento text-white" : "text-texto hover:bg-slate-100",
                )}
              >
                {n}
              </button>
            ),
          )}
          <span className="px-2 text-sm text-texto-suave sm:hidden">
            {pagina}/{totalPaginas}
          </span>
          <button
            type="button"
            className={cn(claseBoton, "text-texto hover:bg-slate-100")}
            onClick={() => onCambiar(pagina + 1)}
            disabled={pagina >= totalPaginas}
            aria-label="Página siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
