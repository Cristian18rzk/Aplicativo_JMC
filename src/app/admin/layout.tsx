"use client";

import { useCallback, useState, useSyncExternalStore, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

const CLAVE_COLAPSADO = "jmc_sidebar_colapsado";
const EVENTO_CAMBIO = "jmc-sidebar-cambio";

// Preferencia del sidebar guardada en localStorage, leída sin desajustes de hidratación
function suscribir(alCambiar: () => void) {
  window.addEventListener("storage", alCambiar);
  window.addEventListener(EVENTO_CAMBIO, alCambiar);
  return () => {
    window.removeEventListener("storage", alCambiar);
    window.removeEventListener(EVENTO_CAMBIO, alCambiar);
  };
}

function leerColapsado(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_COLAPSADO) === "1";
  } catch {
    return false;
  }
}

function guardarColapsado(valor: boolean) {
  try {
    window.localStorage.setItem(CLAVE_COLAPSADO, valor ? "1" : "0");
  } catch {
    // almacenamiento no disponible: se ignora
  }
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
}

/** Layout del administrador: sidebar colapsable (escritorio) + menú overlay (móvil). */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const colapsado = useSyncExternalStore(suscribir, leerColapsado, () => false);
  const [menuMovil, setMenuMovil] = useState(false);

  const alternar = useCallback(() => guardarColapsado(!leerColapsado()), []);
  const cerrarMenu = useCallback(() => setMenuMovil(false), []);

  return (
    <div className="flex min-h-screen bg-fondo">
      <Sidebar colapsado={colapsado} onAlternar={alternar} />
      <MobileNav abierto={menuMovil} onCerrar={cerrarMenu} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onAbrirMenu={() => setMenuMovil(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
