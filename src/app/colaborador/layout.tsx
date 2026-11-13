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
  { href: "/colaborador/desprendibles", etiqueta: "Mis pagos", icono: FileText },
  { href: "/colaborador/certificados", etiqueta: "Certificado", icono: Award },
];

/**
 * Layout del colaborador. En el celular el menú va abajo, al alcance del pulgar, con íconos grandes
 * y su nombre debajo; en pantallas anchas va como pestañas bajo el encabezado.
 */
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

  const esActivo = (href: string) => (href === "/colaborador" ? ruta === href : ruta.startsWith(href));

  return (
    <div className="flex min-h-screen flex-col bg-fondo">
      <header className="sticky top-0 z-30 bg-[#12301C] text-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4">
          <Link href="/colaborador" className="flex min-w-0 items-center gap-2.5">
            <Logo tamano={40} decorativo className="border-white/30" />
            <span className="min-w-0 leading-tight">
              <span className="block font-display text-base font-bold tracking-tight text-[#FFF8EC]">Portal JMC</span>
              {usuario ? <span className="block truncate text-xs text-palma-200/90">{usuario.nombre}</span> : null}
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {usuario ? (
              <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#FFC35C] text-xs font-bold text-palma-950 sm:flex">
                {iniciales(usuario.nombre)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={salir}
              disabled={saliendo}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 px-3 text-sm font-semibold text-palma-50 transition-colors hover:bg-white/10 disabled:opacity-60"
            >
              <LogOut className="h-5 w-5" aria-hidden />
              {saliendo ? "Saliendo…" : "Salir"}
            </button>
          </div>
        </div>
        {/* Pestañas: solo en pantallas anchas */}
        <nav className="mx-auto hidden max-w-3xl gap-1 px-4 sm:flex" aria-label="Secciones">
          {ENLACES.map(({ href, etiqueta, icono: Icono }) => {
            const activo = esActivo(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={activo ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-[3px] px-4 py-3 text-base font-semibold whitespace-nowrap transition-colors",
                  activo ? "border-[#FFC35C] text-[#FFE3A8]" : "border-transparent text-palma-100/80 hover:text-white",
                )}
              >
                <Icono className="h-5 w-5" aria-hidden />
                {etiqueta}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 p-4 pb-28 sm:p-6 sm:pb-10">{children}</main>

      {/* Menú inferior: solo en el celular */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#D5DFD0] bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
        aria-label="Secciones"
      >
        <ul className="grid grid-cols-3">
          {ENLACES.map(({ href, etiqueta, icono: Icono }) => {
            const activo = esActivo(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={activo ? "page" : undefined}
                  className={cn(
                    "flex h-[72px] flex-col items-center justify-center gap-1 text-sm font-semibold transition-colors",
                    activo ? "text-palma-900" : "text-texto-suave",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                      activo ? "bg-palma-200" : "bg-transparent",
                    )}
                  >
                    <Icono className="h-6 w-6" aria-hidden />
                  </span>
                  {etiqueta}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
