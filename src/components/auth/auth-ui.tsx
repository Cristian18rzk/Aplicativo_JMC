"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { IconoOjo, IconoOjoCerrado } from "./iconos-auth";

/*
 * Primitivas visuales de las pantallas de autenticación — Sistema de Diseño JMC v2, con modo oscuro.
 * "slate" está redefinido en globals.css con los neutros cálidos (Arena → Tinta).
 * Contraste WCAG 2.1 AA: Tinta #2B2D2C sobre blanco (14:1), Piedra #6B6862 sobre blanco (5.5:1),
 * blanco sobre Verde Palma #2E6B3F (6.4:1); en oscuro, Arena #FAF8F4 sobre Tinta (13:1)
 * y Palma 400 #7FB08C sobre Tinta (5.6:1).
 */

// ─── Tarjeta ──────────────────────────────────────────────────────────

export function TarjetaAuth({
  titulo,
  descripcion,
  icono,
  children,
}: {
  titulo: string;
  descripcion?: ReactNode;
  icono?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="titulo-auth"
      className={cn(
        "relative overflow-hidden rounded-[28px] p-6 text-slate-900 sm:p-9",
        // Superficie Arena cálida sobre la escena; en oscuro, vidrio ahumado
        "bg-[#FFFDF9]/[0.97] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.5)_inset]",
        "dark:bg-slate-950/80 dark:text-slate-100 dark:shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.08)_inset] dark:backdrop-blur-xl",
      )}
    >
      {/* Filete superior: sol → oro → palma (los tres colores de la marca) */}
      <div
        className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#F2A042_0%,#B8955A_50%,#2E6B3F_100%)]"
        aria-hidden
      />
      <header className="mb-7">
        {icono ? (
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FDEEE0_0%,#F5EEE2_100%)] text-sol-oscuro ring-1 ring-sol/20 dark:bg-[linear-gradient(135deg,rgba(232,120,42,0.18)_0%,rgba(184,149,90,0.12)_100%)] dark:text-sol-claro dark:ring-sol/30">
            {icono}
          </div>
        ) : null}
        <h1
          id="titulo-auth"
          tabIndex={-1}
          className="font-display text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900 outline-none dark:text-slate-50"
        >
          {titulo}
        </h1>
        {descripcion ? (
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{descripcion}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

// ─── Campo ────────────────────────────────────────────────────────────

export interface CampoAuthProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  ayuda?: ReactNode;
  /** Muestra el botón para ver/ocultar la contraseña. */
  conmutarVisibilidad?: boolean;
  /** Ícono decorativo al inicio del campo. */
  icono?: ReactNode;
}

export const CampoAuth = forwardRef<HTMLInputElement, CampoAuthProps>(function CampoAuth(
  { label, error, ayuda, conmutarVisibilidad, icono, type = "text", className, onKeyUp, ...props },
  ref,
) {
  const id = useId();
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;
  const idMayus = `${id}-mayus`;
  const [visible, setVisible] = useState(false);
  const [mayusculas, setMayusculas] = useState(false);
  const reducir = useReducedMotion();

  const esPassword = type === "password";
  const describedBy =
    [error ? idError : null, ayuda ? idAyuda : null, mayusculas ? idMayus : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <div className="group relative">
        {icono ? (
          <span
            className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-slate-400 transition-colors group-focus-within:text-palma-600 dark:text-slate-500 dark:group-focus-within:text-palma-400"
            aria-hidden
          >
            {icono}
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          type={esPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onKeyUp={(e) => {
            if (esPassword) setMayusculas(e.getModifierState("CapsLock"));
            onKeyUp?.(e);
          }}
          className={cn(
            // Foco del sistema: borde 1.5px Verde Palma + halo de 4px
            "block h-11 w-full rounded-xl border bg-slate-50 px-3 text-base text-slate-900 transition-[border-color,box-shadow,background-color] sm:text-sm",
            "placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4",
            "dark:bg-white/5 dark:text-slate-50 dark:placeholder:text-slate-500 dark:focus:bg-white/[0.08]",
            error
              ? "border-error focus:border-error focus:ring-error/15 dark:border-red-400 dark:focus:ring-red-400/25"
              : "border-slate-200 hover:border-slate-300 focus:border-palma-600 focus:shadow-[0_0_0_0.5px_var(--color-palma-600)] focus:ring-palma-100 dark:border-white/10 dark:hover:border-white/20 dark:focus:border-palma-400 dark:focus:ring-palma-400/20",
            icono && "pl-12",
            conmutarVisibilidad && "pr-12",
            className,
          )}
          {...props}
        />
        {conmutarVisibilidad ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            aria-controls={id}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-palma-600 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {visible ? <IconoOjoCerrado className="h-[22px] w-[22px]" /> : <IconoOjo className="h-[22px] w-[22px]" />}
          </button>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="error"
            id={idError}
            initial={reducir ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducir ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="flex items-start gap-1.5 text-sm text-error dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </motion.p>
        ) : null}
      </AnimatePresence>
      {mayusculas ? (
        <p id={idMayus} className="text-xs font-medium text-sol-oscuro dark:text-sol-claro">
          Bloq Mayús está activado
        </p>
      ) : null}
      {ayuda ? (
        <div id={idAyuda} className="text-xs text-slate-600 dark:text-slate-400">
          {ayuda}
        </div>
      ) : null}
    </div>
  );
});

// ─── Botón ────────────────────────────────────────────────────────────

export function BotonAuth({
  cargando,
  textoCargando = "Procesando…",
  children,
  className,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { cargando?: boolean; textoCargando?: string }) {
  return (
    <button
      type="submit"
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      aria-disabled={disabled || cargando || undefined}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white",
        "bg-[linear-gradient(180deg,#357a48_0%,#2E6B3F_100%)] shadow-[0_10px_24px_-10px_rgba(46,107,63,0.8),inset_0_1px_0_rgba(255,255,255,0.18)]",
        "hover:bg-[linear-gradient(180deg,#2E6B3F_0%,#1F4D2C_100%)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palma-600 dark:focus-visible:outline-palma-400",
        "disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {cargando ? (
        <>
          <LoadingSpinner tamano="sm" etiqueta={textoCargando} className="text-white" />
          <span>{textoCargando}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ─── Alerta ───────────────────────────────────────────────────────────

const ESTILOS_ALERTA = {
  error: {
    clase: "border-error/25 bg-error/[0.07] text-[#8f2a21] dark:border-error/50 dark:bg-error/20 dark:text-red-200",
    icono: AlertCircle,
  },
  exito: {
    clase: "border-palma-200 bg-palma-100 text-palma-800 dark:border-palma-800 dark:bg-palma-950/60 dark:text-palma-100",
    icono: CheckCircle2,
  },
  // Avisos con Naranja Sol (p. ej. "tu sesión expiró")
  info: {
    clase: "border-sol/30 bg-sol-suave text-sol-oscuro dark:border-sol/40 dark:bg-sol/15 dark:text-sol-claro",
    icono: Info,
  },
} as const;

/**
 * Mensaje anunciado por lectores de pantalla. Los errores usan role="alert" (interrumpe) y reciben el
 * foco para que el usuario de teclado sepa qué pasó; en cada nuevo error se anima con un leve "shake".
 */
export function AlertaAuth({
  tipo,
  children,
  enfocar = tipo === "error",
  clave,
}: {
  tipo: keyof typeof ESTILOS_ALERTA;
  children: ReactNode;
  enfocar?: boolean;
  /** Cambiarla re-dispara la animación (p. ej. un contador de intentos). */
  clave?: string | number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reducir = useReducedMotion();
  const { clase, icono: Icono } = ESTILOS_ALERTA[tipo];

  useEffect(() => {
    if (enfocar) ref.current?.focus();
  }, [enfocar, clave]);

  return (
    <motion.div
      key={clave}
      ref={ref}
      tabIndex={-1}
      role={tipo === "error" ? "alert" : "status"}
      aria-live={tipo === "error" ? "assertive" : "polite"}
      initial={reducir ? false : { opacity: 0, y: -6 }}
      animate={
        reducir
          ? { opacity: 1 }
          : tipo === "error"
            ? { opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }
            : { opacity: 1, y: 0 }
      }
      transition={{ duration: tipo === "error" ? 0.4 : 0.2 }}
      className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm outline-none", clase)}
    >
      <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </motion.div>
  );
}
