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

/** Estado vacío con icono, título, descripción y acción opcional. */
export function EmptyState({ icono: Icono = Inbox, titulo, descripcion, accion, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-acento-suave">
        <Icono className="h-6 w-6 text-acento" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-texto">{titulo}</h3>
      {descripcion ? <p className="mt-1 max-w-sm text-sm text-texto-suave">{descripcion}</p> : null}
      {accion ? <div className="mt-5">{accion}</div> : null}
    </div>
  );
}
