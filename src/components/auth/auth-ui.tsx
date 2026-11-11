"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info } from "lucide-react";
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

/*
 * Primitivas visuales de las pantallas de autenticación (con modo oscuro).
 * Contraste verificado WCAG 2.1 AA: texto #0f172a/#475569 sobre blanco y #f1f5f9/#cbd5e1 sobre #0f172a;
 * botón blanco sobre #1e40af (8.6:1) / #2563eb (5.2:1).
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
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
    >
      <header className="mb-6">
        {icono ? (
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            {icono}
          </div>
        ) : null}
        <h1 id="titulo-auth" tabIndex={-1} className="text-xl font-semibold text-slate-900 outline-none dark:text-slate-50">
          {titulo}
        </h1>
        {descripcion ? <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{descripcion}</p> : null}
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
}

export const CampoAuth = forwardRef<HTMLInputElement, CampoAuthProps>(function CampoAuth(
  { label, error, ayuda, conmutarVisibilidad, type = "text", className, onKeyUp, ...props },
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
      <label htmlFor={id} className="block text-sm font-medium text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
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
            "block h-11 w-full rounded-lg border bg-white px-3 text-base text-slate-900 shadow-sm transition-colors sm:text-sm",
            "placeholder:text-slate-400 focus:outline-none focus:ring-2",
            "dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-500",
            error
              ? "border-red-600 focus:border-red-600 focus:ring-red-600/25 dark:border-red-400 dark:focus:ring-red-400/30"
              : "border-slate-300 focus:border-blue-700 focus:ring-blue-700/20 dark:border-slate-700 dark:focus:border-blue-400 dark:focus:ring-blue-400/25",
            conmutarVisibilidad && "pr-11",
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
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-700 dark:text-slate-400 dark:hover:text-slate-100"
          >
            {visible ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
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
            className="flex items-start gap-1.5 text-sm text-red-700 dark:text-red-400"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </motion.p>
        ) : null}
      </AnimatePresence>
      {mayusculas ? (
        <p id={idMayus} className="text-xs font-medium text-amber-700 dark:text-amber-400">
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
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-colors",
        "bg-blue-800 hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800",
        "dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:outline-blue-400",
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
    clase: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200",
    icono: AlertCircle,
  },
  exito: {
    clase: "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-200",
    icono: CheckCircle2,
  },
  info: {
    clase: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-100",
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
