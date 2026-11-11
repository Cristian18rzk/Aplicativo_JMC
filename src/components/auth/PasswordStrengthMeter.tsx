"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { useMemo } from "react";
import { REQUISITOS, evaluarFortaleza, type DatosPersonales } from "@/lib/auth/fortaleza";
import { cn } from "@/lib/utils";

const COLORES = [
  "bg-red-600 dark:bg-red-500",
  "bg-orange-500 dark:bg-orange-400",
  "bg-amber-500 dark:bg-amber-400",
  "bg-green-600 dark:bg-green-500",
  "bg-emerald-700 dark:bg-emerald-400",
] as const;

const TEXTO_NIVEL = [
  "text-red-700 dark:text-red-400",
  "text-orange-700 dark:text-orange-400",
  "text-amber-700 dark:text-amber-400",
  "text-green-700 dark:text-green-400",
  "text-emerald-800 dark:text-emerald-300",
] as const;

/**
 * Medidor de fortaleza en tiempo real + lista de requisitos de la política.
 * El nivel se anuncia con aria-live="polite" (sin interrumpir mientras el usuario escribe).
 */
export function PasswordStrengthMeter({ password, datos, id }: { password: string; datos?: DatosPersonales; id?: string }) {
  const reducir = useReducedMotion();
  const fortaleza = useMemo(() => evaluarFortaleza(password, datos), [password, datos]);
  const vacia = password.length === 0;
  const porcentaje = vacia ? 0 : ((fortaleza.nivel + 1) / 5) * 100;

  return (
    <div id={id} className="space-y-3">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300">Fortaleza</span>
          <span aria-live="polite" className={cn("font-semibold", vacia ? "text-slate-500 dark:text-slate-400" : TEXTO_NIVEL[fortaleza.nivel])}>
            {vacia ? "—" : fortaleza.etiqueta}
          </span>
        </div>
        <div
          role="meter"
          aria-label="Fortaleza de la contraseña"
          aria-valuemin={0}
          aria-valuemax={4}
          aria-valuenow={vacia ? 0 : fortaleza.nivel}
          aria-valuetext={vacia ? "Sin contraseña" : fortaleza.etiqueta}
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        >
          <motion.div
            className={cn("h-full rounded-full", COLORES[fortaleza.nivel])}
            initial={false}
            animate={{ width: `${porcentaje}%` }}
            transition={reducir ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
          />
        </div>
        {!vacia && fortaleza.sugerencias.length ? (
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">{fortaleza.sugerencias[0]}</p>
        ) : null}
      </div>

      <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Requisitos de la contraseña">
        {REQUISITOS.map((r) => {
          const cumple = r.cumple(password);
          return (
            <li
              key={r.id}
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                cumple ? "text-green-700 dark:text-green-400" : "text-slate-600 dark:text-slate-400",
              )}
            >
              {cumple ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <X className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              <span>
                {r.etiqueta}
                <span className="sr-only">{cumple ? ": cumplido" : ": pendiente"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
