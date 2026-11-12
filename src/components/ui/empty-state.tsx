import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icono?: LucideIcon;
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  className?: string;
}

/**
 * Estado vacío: un pequeño amanecer (sol con el ícono, colinas y una palma) en lugar de un círculo
 * genérico, con título, descripción y acción opcional.
 */
export function EmptyState({ icono: Icono = Inbox, titulo, descripcion, accion, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <div className="relative mb-4 h-[72px] w-[132px]" aria-hidden>
        <svg viewBox="0 0 132 72" className="absolute inset-0 h-full w-full">
          <defs>
            <radialGradient id="vacio-sol" cx="0.5" cy="0.45" r="0.55">
              <stop offset="0" stopColor="#FCD27E" />
              <stop offset="1" stopColor="#F2A042" />
            </radialGradient>
          </defs>
          <circle cx="66" cy="44" r="40" fill="#FDEEE0" />
          <circle cx="66" cy="40" r="22" fill="url(#vacio-sol)" />
          <path d="M0 58c22-8 40-6 60-3s42 4 72-4v21H0Z" fill="#CFE3D4" />
          <path d="M0 66c30-6 58-3 80-2s36 0 52-3v11H0Z" fill="#4F8C60" />
          {/* Palma pequeña */}
          <g stroke="#2E6B3F" strokeWidth="2" strokeLinecap="round" fill="none">
            <path d="M108 64c-1-8 0-15 2-21" />
            <path d="M110 43c-5-4-11-4-15 0M110 43c5-5 11-5 15-1M110 43c-2-5-6-8-11-8M110 43c3-5 8-7 12-6" />
          </g>
        </svg>
        <Icono className="absolute top-[28px] left-1/2 h-5 w-5 -translate-x-1/2 text-white" strokeWidth={2.25} />
      </div>
      <h3 className="font-display text-base font-semibold text-texto">{titulo}</h3>
      {descripcion ? <p className="mt-1 max-w-sm text-sm text-texto-suave">{descripcion}</p> : null}
      {accion ? <div className="mt-5">{accion}</div> : null}
    </div>
  );
}
