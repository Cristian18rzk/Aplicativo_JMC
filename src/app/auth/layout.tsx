import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // Las URLs de /auth pueden llevar un token de un solo uso: no se envía el Referer a ningún sitio
  referrer: "no-referrer",
};

const empresa = process.env.EMPRESA_NOMBRE ?? "Jairo Martínez JMC S.A.S.";

/**
 * Portada del Sistema de Diseño JMC v2: el sol sale detrás de la franja Verde Palma.
 * Solo decorativa (aria-hidden); en pantallas pequeñas se omite para priorizar el formulario.
 */
function Portada() {
  return (
    <div className="relative hidden min-h-dvh overflow-hidden bg-[#FAF8F4] text-[#2B2D2C] lg:flex lg:flex-col" aria-hidden>
      <div className="absolute bottom-0 left-1/2 aspect-square w-[min(760px,120%)] -translate-x-1/2 animate-amanecer rounded-full bg-[radial-gradient(circle_at_50%_35%,#F9C46B_0%,#F2A042_38%,#E8782A_72%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[150px] bg-acento" />

      <div className="relative flex items-center gap-3 px-10 pt-8">
        <Logo tamano={48} decorativo />
        <span className="text-sm font-semibold">{empresa}</span>
      </div>

      <div className="relative flex flex-1 flex-col justify-center gap-4 px-10 pb-[190px]">
        <span className="font-mono text-[13px]">Colaboradores · Desprendibles · Certificados</span>
        <p className="font-display text-[clamp(56px,7vw,112px)] leading-[0.88] font-extrabold tracking-[-0.025em]">
          Sale el sol,
          <br />
          llega el pago.
        </p>
      </div>

      <p className="absolute right-10 bottom-9 left-10 max-w-md text-[17px] leading-normal text-white">
        Consulta tus desprendibles de pago y descarga tus certificados laborales.
      </p>
    </div>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-slate-50 text-slate-900 scheme-light lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] dark:bg-slate-950 dark:text-slate-100 dark:scheme-dark">
      <a
        href="#contenido-auth"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-palma-600 focus:shadow"
      >
        Saltar al contenido
      </a>

      <Portada />

      <div className="flex min-h-dvh flex-col">
        {/* En móvil y tablet la marca va arriba del formulario */}
        <header className="px-4 pt-8 pb-2 sm:pt-12 lg:hidden">
          <div className="mx-auto flex w-full max-w-md items-center gap-3">
            <Logo tamano={44} decorativo />
            <div className="leading-tight">
              <p className="font-display text-base font-bold tracking-tight">JMC Nómina</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{empresa}</p>
            </div>
          </div>
        </header>
        <main id="contenido-auth" className="flex flex-1 items-start justify-center px-4 py-6 sm:items-center sm:py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <footer className="px-4 pb-8 text-center text-xs text-slate-600 dark:text-slate-400">
          ¿Problemas para ingresar? Comunícate con el área de Talento Humano.
        </footer>
      </div>
    </div>
  );
}
