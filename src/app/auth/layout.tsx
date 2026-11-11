import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // Las URLs de /auth pueden llevar un token de un solo uso: no se envía el Referer a ningún sitio
  referrer: "no-referrer",
};

const empresa = process.env.EMPRESA_NOMBRE ?? "JMC";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-900 scheme-light dark:bg-slate-950 dark:text-slate-100 dark:scheme-dark">
      <a
        href="#contenido-auth"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-blue-800 focus:shadow"
      >
        Saltar al contenido
      </a>
      <header className="px-4 pt-8 pb-2 sm:pt-12">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-800 text-sm font-bold text-white dark:bg-blue-600"
            aria-hidden
          >
            JMC
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">{empresa}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">Portal de nómina</p>
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
  );
}
