import { cn } from "@/lib/utils";

const TAMANOS = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
} as const;

interface LoadingSpinnerProps {
  tamano?: keyof typeof TAMANOS;
  className?: string;
  etiqueta?: string;
}

/** Spinner SVG animado. */
export function LoadingSpinner({ tamano = "md", className, etiqueta = "Cargando" }: LoadingSpinnerProps) {
  return (
    <svg
      className={cn("animate-spin text-acento", TAMANOS[tamano], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label={etiqueta}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"
      />
    </svg>
  );
}

/** Spinner centrado para estados de carga de página completa. */
export function CargandoPagina({ mensaje = "Cargando…" }: { mensaje?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-texto-suave">
      <LoadingSpinner tamano="lg" />
      <p className="text-sm">{mensaje}</p>
    </div>
  );
}
