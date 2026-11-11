"use client";

import { ChevronRight, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

const NOMBRES_SEGMENTO: Record<string, string> = {
  admin: "Inicio",
  colaborador: "Inicio",
  colaboradores: "Colaboradores",
  desprendibles: "Desprendibles",
  certificados: "Certificados",
  nuevo: "Nuevo",
  cargar: "Cargue masivo",
};

const TITULOS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/colaboradores": "Colaboradores",
  "/admin/colaboradores/nuevo": "Nuevo colaborador",
  "/admin/desprendibles": "Desprendibles de pago",
  "/admin/desprendibles/cargar": "Cargue masivo de desprendibles (PDF)",
  "/admin/certificados": "Certificados laborales",
};

interface Miga {
  href: string;
  etiqueta: string;
}

function construirMigas(ruta: string): Miga[] {
  const segmentos = ruta.split("/").filter(Boolean);
  return segmentos.map((segmento, i) => ({
    href: `/${segmentos.slice(0, i + 1).join("/")}`,
    // IDs de Airtable (recXXXX) se muestran como "Detalle"
    etiqueta: /^rec[a-zA-Z0-9]{14}$/.test(segmento) ? "Detalle" : (NOMBRES_SEGMENTO[segmento] ?? segmento),
  }));
}

/** Header del panel: breadcrumb, título de la página y botón de menú móvil. */
export function Header({ onAbrirMenu }: { onAbrirMenu: () => void }) {
  const ruta = usePathname();
  const migas = construirMigas(ruta);
  const titulo = TITULOS[ruta] ?? (ruta.startsWith("/admin/colaboradores/") ? "Detalle del colaborador" : "");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-borde bg-white/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onAbrirMenu}
        className="-ml-1 rounded-lg p-2 text-texto hover:bg-slate-100 lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <nav aria-label="Ruta de navegación" className="hidden sm:block">
          <ol className="flex items-center gap-1 text-xs text-texto-suave">
            {migas.map((miga, i) => (
              <Fragment key={miga.href}>
                {i > 0 ? <ChevronRight className="h-3 w-3" aria-hidden /> : null}
                <li>
                  {i < migas.length - 1 ? (
                    <Link href={miga.href} className="hover:text-acento">
                      {miga.etiqueta}
                    </Link>
                  ) : (
                    <span aria-current="page" className="font-medium text-texto">
                      {miga.etiqueta}
                    </span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
        <h1 className="truncate text-base font-semibold text-texto sm:text-lg">{titulo}</h1>
      </div>
    </header>
  );
}
