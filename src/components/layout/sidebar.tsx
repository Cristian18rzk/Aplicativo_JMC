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
  { href: "/admin", etiqueta: "Inicio", icono: LayoutDashboard },
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
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className={cn("relative flex h-20 items-center gap-3 px-5", colapsado && "justify-center px-2")}>
        <Logo tamano={40} decorativo={!colapsado} className="border-white/30 shadow-[0_0_0_3px_rgba(255,255,255,0.08)]" />
        {!colapsado ? (
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold tracking-tight text-[#FFF8EC]">Portal JMC</p>
            <p className="text-xs text-palma-200/80">Jairo Martínez JMC S.A.S.</p>
          </div>
        ) : null}
      </div>

      <nav className="relative flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegación principal">
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
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                colapsado && "justify-center px-2",
                activo
                  ? "bg-white/12 text-[#FFE3A8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-palma-100/80 hover:bg-white/6 hover:text-white",
              )}
            >
              {/* Marca oro de la opción activa */}
              {activo ? <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-[#FFC35C]" aria-hidden /> : null}
              <Icono className={cn("h-5 w-5 shrink-0", activo && "text-[#FFC35C]")} aria-hidden />
              {!colapsado ? <span>{etiqueta}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-white/10 p-3">
        {usuario ? (
          <div className={cn("mb-2 flex items-center gap-3 px-2 py-1", colapsado && "justify-center px-0")}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFC35C] text-xs font-bold text-palma-950">
              {iniciales(usuario.nombre)}
            </div>
            {!colapsado ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{usuario.nombre}</p>
                {/* Un administrador sin ficha de colaborador es el superadministrador (no figura en la nómina) */}
                <p className="text-xs text-palma-200/80">{usuario.id ? "Administrador" : "Superadministrador"}</p>
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
            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-palma-100/80 transition-colors hover:bg-white/6 hover:text-[#FFB4A8] disabled:opacity-60",
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
        "sticky top-0 hidden h-screen shrink-0 flex-col bg-[#12301C] transition-[width] duration-200 lg:flex",
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
