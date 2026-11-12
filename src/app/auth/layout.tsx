import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { EscenaAmanecer } from "@/components/auth/escena-amanecer";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // Las URLs de /auth pueden llevar un token de un solo uso: no se envía el Referer a ningún sitio
  referrer: "no-referrer",
};

const empresa = process.env.EMPRESA_NOMBRE ?? "Jairo Martínez JMC S.A.S.";

/** Saludo según la hora en Colombia (el servidor puede estar en otra zona horaria). */
function saludoSegunHora(): string {
  const hora = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Bogota" }).format(new Date()),
  );
  if (hora >= 5 && hora < 12) return "Buenos días";
  if (hora >= 12 && hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Partículas de luz (polen al amanecer): posición, tamaño, duración y retraso fijos. */
const LUCES = [
  [8, 72, 4, 13, 0],
  [17, 58, 3, 11, -4],
  [26, 80, 5, 15, -8],
  [34, 66, 3, 12, -2],
  [43, 76, 4, 14, -10],
  [51, 62, 3, 10, -6],
  [58, 84, 5, 16, -3],
  [64, 70, 3, 12, -9],
  [72, 78, 4, 13, -1],
  [80, 64, 3, 11, -7],
  [88, 74, 4, 15, -5],
  [94, 60, 3, 12, -11],
] as const;

export default async function AuthLayout({ children }: { children: ReactNode }) {
  await connection(); // el saludo depende de la hora: no se prerenderiza
  const saludo = saludoSegunHora();

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-[#0B1F12] text-white scheme-light dark:scheme-dark">
      <a
        href="#contenido-auth"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-palma-600 focus:shadow"
      >
        Saltar al contenido
      </a>

      {/* ── Escena de fondo ── */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <EscenaAmanecer className="h-full w-full" />
        {/* Velo para que el texto se lea sobre el cielo */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,31,18,0.55)_0%,rgba(11,31,18,0.1)_45%,rgba(11,31,18,0)_60%)]" />
        <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(11,31,18,0.5)_0%,rgba(11,31,18,0)_55%)] lg:block" />
        {LUCES.map(([x, y, tamano, duracion, retraso]) => (
          <span
            key={`${x}-${y}`}
            className="escena-luz absolute rounded-full bg-[#FCD27E]"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: tamano,
              height: tamano,
              animationDuration: `${duracion}s`,
              animationDelay: `${retraso}s`,
            }}
          />
        ))}
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 sm:px-8 lg:px-10">
        {/* ── Marca ── */}
        <header className="flex items-center gap-3 pt-6 sm:pt-8">
          <Logo tamano={48} decorativo className="border-white/40 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]" />
          <div className="leading-tight">
            <p className="font-display text-base font-bold tracking-tight">Portal JMC</p>
            <p className="text-xs text-white/70">{empresa}</p>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:gap-16 lg:py-10">
          {/* ── Bienvenida ── */}
          <section className="relative max-w-xl self-center" aria-label="Bienvenida">
            {/* Sombra difusa detrás del texto: lo separa del cielo sin que se note un recuadro */}
            <div
              className="absolute -inset-x-16 -inset-y-12 -z-10 bg-[radial-gradient(ellipse_at_35%_50%,rgba(6,18,10,0.6)_0%,rgba(6,18,10,0.3)_45%,rgba(6,18,10,0)_72%)]"
              aria-hidden
            />
            <h2 className="animate-entrar-2 font-display text-[clamp(2.25rem,6vw,4.25rem)] leading-[0.98] font-extrabold tracking-[-0.03em] text-balance text-[#FFF8EC] [text-shadow:0_2px_18px_rgba(6,18,10,0.55)]">
              {saludo},
              <span className="block text-[#FFC35C]">cada cosecha cuenta.</span>
            </h2>
            {/* Filete de la marca bajo el titular */}
            <div className="animate-entrar-3 mt-6 flex items-center gap-1.5" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-[#FFC35C]" />
              <span className="h-1 w-4 rounded-full bg-oro-claro" />
              <span className="h-1 w-2 rounded-full bg-palma-400" />
            </div>
            <p className="animate-entrar-3 mt-5 hidden max-w-md text-lg leading-relaxed font-medium text-[#F3EBDD] [text-shadow:0_1px_12px_rgba(6,18,10,0.9)] sm:block">
              Aquí encuentras tus desprendibles de pago y tus certificados laborales, cuando los necesites.
            </p>
          </section>

          {/* ── Formulario ── */}
          <main id="contenido-auth" className="animate-entrar-tarjeta w-full lg:justify-self-end">
            {children}
          </main>
        </div>

        <footer className="pb-6 text-center text-xs text-white/65 lg:text-left">
          ¿Problemas para ingresar? Comunícate con el área de Talento Humano.
        </footer>
      </div>
    </div>
  );
}
