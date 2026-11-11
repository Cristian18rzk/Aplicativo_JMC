"use client";

import { Award, FileText, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";
import { cn, iniciales } from "@/lib/utils";

export interface EnlaceNavegacion {
  href: string;
  etiqueta: string;
  icono: LucideIcon;
}

export const ENLACES_ADMIN: EnlaceNavegacion[] = [
  { href: "/admin", etiqueta: "Dashboard", icono: LayoutDashboard },
  { href: "/admin/colaboradores", etiqueta: "Colaboradores", icono: Users },
  { href: "/admin/desprendibles", etiqueta: "Desprendibles", icono: FileText },
  { href: "/admin/certificados", etiqueta: "Certificados", icono: Award },
];

export function esEnlaceActivo(ruta: string, href: string): boolean {
  return href === "/admin" ? ruta === "/admin" : ruta === href || ruta.startsWith(`${href}/`);
}

/** Contenido de navegación reutilizado por el sidebar de escritorio y el menú móvil. */
export function ContenidoNavegacion({
  colapsado = false,
  onNavegar,
}: {
  colapsado?: boolean;
  onNavegar?: () => void;
}) {
  const ruta = usePathname();
  const { usuario, logout } = useAuth();
  const [saliendo, setSaliendo] = useState(false);

  const cerrarSesion = async () => {
    setSaliendo(true);
    try {
      await logout();
    } finally {
      setSaliendo(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-20 items-center gap-3 px-5", colapsado && "justify-center px-2")}>
        <Logo tamano={40} decorativo={!colapsado} />
        {!colapsado ? (
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold tracking-tight text-texto">JMC Nómina</p>
            <p className="text-xs text-texto-suave">Jairo Martínez JMC S.A.S.</p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegación principal">
        {ENLACES_ADMIN.map(({ href, etiqueta, icono: Icono }) => {
          const activo = esEnlaceActivo(ruta, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavegar}
              title={colapsado ? etiqueta : undefined}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                colapsado && "justify-center px-2",
                activo ? "bg-white text-palma-800 shadow-sm" : "text-slate-700 hover:bg-white/60 hover:text-texto",
              )}
            >
              <Icono className="h-5 w-5 shrink-0" aria-hidden />
              {!colapsado ? <span>{etiqueta}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-palma-200 p-3">
        {usuario ? (
          <div className={cn("mb-2 flex items-center gap-3 px-2 py-1", colapsado && "justify-center px-0")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-acento text-xs font-semibold text-white">
              {iniciales(usuario.nombre)}
            </div>
            {!colapsado ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-texto">{usuario.nombre}</p>
                <p className="text-xs text-texto-suave">Administrador</p>
              </div>
            ) : null}
          </div>
        ) : null}
        <button
          type="button"
          onClick={cerrarSesion}
          disabled={saliendo}
          title={colapsado ? "Cerrar sesión" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-white/60 hover:text-error disabled:opacity-60",
            colapsado && "justify-center px-2",
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden />
          {!colapsado ? <span>{saliendo ? "Cerrando…" : "Cerrar sesión"}</span> : null}
        </button>
      </div>
    </div>
  );
}

/** Sidebar del administrador (escritorio). En móvil se usa MobileNav. */
export function Sidebar({ colapsado, onAlternar }: { colapsado: boolean; onAlternar: () => void }) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-palma-200 bg-acento-suave transition-[width] duration-200 lg:flex",
        colapsado ? "w-20" : "w-64",
      )}
    >
      <ContenidoNavegacion colapsado={colapsado} />
      <button
        type="button"
        onClick={onAlternar}
        className="absolute top-20 -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-borde bg-white text-texto-suave shadow-sm transition-colors hover:text-acento"
        aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
      >
        {colapsado ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}
