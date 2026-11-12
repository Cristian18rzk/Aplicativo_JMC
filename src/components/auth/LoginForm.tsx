"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconoAmanecer, IconoAvanzar, IconoCedula, IconoPin } from "./iconos-auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { LONGITUD_MAXIMA_SECRETO } from "@/lib/auth/pin";
import { loginSchema, type LoginSchema } from "@/lib/validators/auth";
import { ErrorLogin } from "@/providers/auth-provider";
import { AlertaAuth, BotonAuth, CampoAuth, TarjetaAuth } from "./auth-ui";

/** Campos grandes: la mayoría de usuarios son personal de campo, muchos de edad. */
const CLASE_CAMPO_GRANDE = "h-14 text-xl sm:text-xl";

/**
 * Un solo formulario para todos: cédula + PIN. El servidor decide el destino según el rol
 * (admin → /admin, colaborador → /colaborador). Si la cuenta aún no tiene PIN, lo envía a crearlo.
 */
export function LoginForm() {
  const { iniciarSesion } = useAuth();
  const router = useRouter();
  const parametros = useSearchParams();
  const redirigir = parametros.get("redirigir");
  const [errorServidor, setErrorServidor] = useState<{ mensaje: string; intento: number } | null>(null);

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: { cedula: "", password: "" },
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
      const mensaje =
        error instanceof ErrorLogin && error.codigo !== "credenciales"
          ? error.message
          : "Cédula o PIN incorrectos. Si olvidaste tu PIN, pídele uno nuevo al administrador.";
      setErrorServidor((previo) => ({ mensaje, intento: (previo?.intento ?? 0) + 1 }));
      resetField("password");
      // Re-lanzar marca el envío como no exitoso para RHF (mantiene el botón habilitado)
      throw error;
    }
  });

  const expirada = parametros.get("expirada") === "1";
  const redirigiendo = isSubmitSuccessful && !errorServidor;

  return (
    <TarjetaAuth
      titulo="Ingresa a tu portal"
      descripcion="Con tu número de cédula y tu PIN."
      icono={<IconoAmanecer className="h-6 w-6" />}
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
              {errorServidor.mensaje}
            </AlertaAuth>
          </div>
        ) : expirada ? (
          <AlertaAuth tipo="info" enfocar={false}>
            Tu sesión expiró. Ingresa nuevamente.
          </AlertaAuth>
        ) : null}

        <CampoAuth
          label="Cédula"
          placeholder="Sin puntos ni espacios"
          type="text"
          inputMode="numeric"
          autoComplete="username"
          spellCheck={false}
          maxLength={15}
          autoFocus
          icono={<IconoCedula className="h-[22px] w-[22px]" />}
          className={CLASE_CAMPO_GRANDE}
          error={errors.cedula?.message}
          {...register("cedula")}
        />

        <CampoAuth
          label="PIN"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          conmutarVisibilidad
          maxLength={LONGITUD_MAXIMA_SECRETO}
          icono={<IconoPin className="h-[22px] w-[22px]" />}
          className={`${CLASE_CAMPO_GRANDE} tracking-[0.4em]`}
          error={errors.password?.message}
          ayuda={
            <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span>¿Primera vez? Déjalo vacío y crearás tu PIN.</span>
              <Link
                href="/auth/olvide-pin"
                className="rounded text-sm font-semibold text-palma-600 underline-offset-4 hover:underline dark:text-palma-400"
              >
                ¿Olvidaste tu PIN?
              </Link>
            </span>
          }
          {...register("password")}
        />

        <BotonAuth
          cargando={isSubmitting || redirigiendo}
          textoCargando={redirigiendo ? "Entrando…" : "Verificando…"}
          className="mt-2 h-14 text-lg"
        >
          Ingresar
          <IconoAvanzar className="h-5 w-5" />
        </BotonAuth>
      </form>
    </TarjetaAuth>
  );
}
