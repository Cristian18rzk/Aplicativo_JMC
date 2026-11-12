"use client";

import { Award, FileText, House, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/logo";
import { cn, iniciales } from "@/lib/utils";

const ENLACES = [
  { href: "/colaborador", etiqueta: "Inicio", icono: House },
  { href: "/colaborador/desprendibles", etiqueta: "Desprendibles", icono: FileText },
  { href: "/colaborador/certificados", etiqueta: "Certificados", icono: Award },
];

/** Layout simple del colaborador: header con su nombre y navegación por pestañas. */
export default function ColaboradorLayout({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const { usuario, logout } = useAuth();
  const [saliendo, setSaliendo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    try {
      await logout();
    } finally {
      setSaliendo(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-fondo">
      <header className="sticky top-0 z-30 bg-[#12301C] text-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Link href="/colaborador" className="flex items-center gap-2.5">
            <Logo tamano={40} decorativo className="border-white/30" />
            <span className="leading-tight">
              <span className="block font-display text-base font-bold tracking-tight text-[#FFF8EC]">Portal JMC</span>
              <span className="hidden text-xs text-palma-200/80 sm:block">Portal del colaborador</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            {usuario ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-right sm:block">
                  <span className="block text-sm font-medium text-white">{usuario.nombre}</span>
                  <span className="block text-xs text-palma-200/80">{usuario.cedula}</span>
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFC35C] text-xs font-bold text-palma-950">
                  {iniciales(usuario.nombre)}
                </span>
              </div>
            ) : (
              <span className="h-9 w-32 animate-pulse rounded bg-white/10" />
            )}
            <button
              type="button"
              onClick={salir}
              disabled={saliendo}
              className="rounded-lg p-2 text-palma-100 transition-colors hover:bg-white/10 hover:text-[#FFB4A8] disabled:opacity-60"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4" aria-label="Secciones">
          {ENLACES.map(({ href, etiqueta, icono: Icono }) => {
            const activo = href === "/colaborador" ? ruta === href : ruta.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-[3px] px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
                  activo ? "border-[#FFC35C] text-[#FFE3A8]" : "border-transparent text-palma-100/75 hover:text-white",
                )}
              >
                <Icono className="h-4 w-4" aria-hidden />
                {etiqueta}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
