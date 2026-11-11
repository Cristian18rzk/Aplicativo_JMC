import { ArrowLeft, KeyRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TarjetaAuth } from "@/components/auth/auth-ui";
import { LONGITUD_PIN_TEMPORAL } from "@/lib/auth/pin";

export const metadata: Metadata = { title: "Olvidé mi PIN" };

/** Sin correo: la recuperación es presencial, con un PIN temporal que genera el administrador. */
export default function PaginaOlvidePin() {
  return (
    <TarjetaAuth
      titulo="¿Olvidaste tu PIN?"
      descripcion="No te preocupes, es fácil de recuperar."
      icono={<KeyRound className="h-5 w-5" aria-hidden />}
    >
      <ol className="space-y-4 text-base text-slate-700 dark:text-slate-200">
        {[
          "Comunícate con el administrador o con la oficina de Talento Humano.",
          `Te entregarán un PIN temporal de ${LONGITUD_PIN_TEMPORAL} números.`,
          "Ingresa con tu cédula y ese PIN temporal.",
          "El sistema te pedirá crear tu nuevo PIN.",
        ].map((paso, i) => (
          <li key={paso} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-palma-100 font-semibold text-palma-800 dark:bg-palma-950 dark:text-palma-200">
              {i + 1}
            </span>
            <span className="pt-1">{paso}</span>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-sm text-slate-600 dark:text-slate-400">
        Por tu seguridad, nadie de la empresa te pedirá tu PIN personal. No lo compartas.
      </p>
      <Link
        href="/auth/login"
        className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-palma-600 text-lg font-semibold text-white hover:bg-palma-800 dark:bg-palma-600 dark:hover:bg-palma-700"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden />
        Volver a ingresar
      </Link>
    </TarjetaAuth>
  );
}
