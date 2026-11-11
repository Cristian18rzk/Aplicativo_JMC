"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { LONGITUD_MAXIMA_SECRETO, LONGITUD_PIN, LONGITUD_PIN_TEMPORAL } from "@/lib/auth/pin";
import { loginSchema, type LoginSchema } from "@/lib/validators/auth";
import { ErrorLogin } from "@/providers/auth-provider";
import { AlertaAuth, BotonAuth, CampoAuth, TarjetaAuth } from "./auth-ui";

/** Campos grandes: la mayoría de usuarios son personal de campo, muchos de edad. */
const CLASE_CAMPO_GRANDE = "h-14 text-xl sm:text-xl";

export function LoginForm() {
  const { iniciarSesion } = useAuth();
  const router = useRouter();
  const parametros = useSearchParams();
  const redirigir = parametros.get("redirigir");
  const [errorServidor, setErrorServidor] = useState<{ mensaje: string; intento: number; codigo: string } | null>(null);
  const [modoAdmin, setModoAdmin] = useState(false);

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { cedula: "", password: "" },
    mode: "onTouched",
  });

  const enviar = handleSubmit(async ({ cedula, password }) => {
    setErrorServidor(null);
    try {
      await iniciarSesion(cedula, password, redirigir);
    } catch (error) {
      if (error instanceof ErrorLogin && error.codigo === "cambiar_pin") {
        router.push("/auth/crear-pin");
        return;
      }
      const codigo = error instanceof ErrorLogin ? error.codigo : "credenciales";
      const mensaje = error instanceof ErrorLogin ? error.message : "Cédula o PIN incorrectos";
      setErrorServidor((previo) => ({ mensaje, codigo, intento: (previo?.intento ?? 0) + 1 }));
      resetField("password");
      // Re-lanzar marca el envío como no exitoso para RHF (mantiene el botón habilitado)
      throw error;
    }
  });

  const avisoInicial =
    parametros.get("expirada") === "1" ? { tipo: "info" as const, texto: "Tu sesión expiró. Ingresa nuevamente." } : null;

  const redirigiendo = isSubmitSuccessful && !errorServidor;

  return (
    <TarjetaAuth
      titulo="Ingresar"
      descripcion="Escribe tu número de cédula y tu PIN para ver tus desprendibles y certificados."
      icono={<LogIn className="h-5 w-5" aria-hidden />}
    >
      <form
        onSubmit={(e) => {
          enviar(e).catch(() => undefined);
        }}
        noValidate
        className="space-y-5"
        aria-describedby={errorServidor ? "error-login" : undefined}
      >
        {errorServidor ? (
          <div id="error-login">
            <AlertaAuth tipo="error" clave={errorServidor.intento}>
              <p className="font-medium">{errorServidor.mensaje}</p>
              {errorServidor.codigo === "credenciales" ? (
                <p className="mt-0.5">
                  Revisa los números. Si te equivocas varias veces, la cuenta se bloquea por 30 minutos. Si nunca
                  has creado tu PIN, usa «Es mi primera vez».
                </p>
              ) : null}
            </AlertaAuth>
          </div>
        ) : avisoInicial ? (
          <AlertaAuth tipo={avisoInicial.tipo} enfocar={false}>
            {avisoInicial.texto}
          </AlertaAuth>
        ) : null}

        <CampoAuth
          label="Número de cédula"
          type="text"
          inputMode="numeric"
          autoComplete="username"
          spellCheck={false}
          placeholder="Sin puntos ni espacios"
          maxLength={15}
          autoFocus
          className={CLASE_CAMPO_GRANDE}
          error={errors.cedula?.message}
          {...register("cedula")}
        />

        <div className="space-y-2">
          {modoAdmin ? (
            <CampoAuth
              key="contrasena"
              label="Contraseña de administrador"
              type="password"
              autoComplete="current-password"
              conmutarVisibilidad
              maxLength={LONGITUD_MAXIMA_SECRETO}
              error={errors.password?.message}
              {...register("password")}
            />
          ) : (
            <CampoAuth
              key="pin"
              label="PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="current-password"
              conmutarVisibilidad
              maxLength={LONGITUD_PIN_TEMPORAL}
              className={`${CLASE_CAMPO_GRANDE} tracking-[0.4em]`}
              error={errors.password?.message}
              ayuda={`Tu PIN de ${LONGITUD_PIN} números (o el PIN temporal que te entregó el administrador).`}
              {...register("password")}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/auth/olvide-pin"
              className="rounded text-base font-medium text-palma-600 underline-offset-4 hover:underline dark:text-palma-400"
            >
              ¿Olvidaste tu PIN?
            </Link>
            <button
              type="button"
              onClick={() => {
                setModoAdmin((v) => !v);
                resetField("password");
              }}
              className="rounded text-sm text-slate-500 underline-offset-4 hover:underline dark:text-slate-400"
            >
              {modoAdmin ? "Ingresar con PIN" : "Soy administrador"}
            </button>
          </div>
        </div>

        <BotonAuth
          cargando={isSubmitting || redirigiendo}
          textoCargando={redirigiendo ? "Entrando…" : "Verificando…"}
          className="h-14 text-lg"
        >
          Ingresar
        </BotonAuth>

        <Link
          href="/auth/primer-ingreso"
          className="flex h-14 w-full items-center justify-center rounded-lg border-2 border-palma-600 text-lg font-semibold text-palma-700 hover:bg-palma-50 dark:border-palma-400 dark:text-palma-300 dark:hover:bg-palma-950"
        >
          Es mi primera vez: crear mi PIN
        </Link>
      </form>
    </TarjetaAuth>
  );
}
