"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema, type LoginSchema } from "@/lib/validators/auth";
import { ErrorLogin } from "@/providers/auth-provider";
import { AlertaAuth, BotonAuth, CampoAuth, TarjetaAuth } from "./auth-ui";

export function LoginForm() {
  const { iniciarSesion } = useAuth();
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
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  const enviar = handleSubmit(async ({ email, password }) => {
    setErrorServidor(null);
    try {
      await iniciarSesion(email, password, redirigir);
    } catch (error) {
      const mensaje = error instanceof ErrorLogin ? error.message : "Credenciales inválidas";
      setErrorServidor((previo) => ({ mensaje, intento: (previo?.intento ?? 0) + 1 }));
      resetField("password");
      // Re-lanzar marca el envío como no exitoso para RHF (mantiene el botón habilitado)
      throw error;
    }
  });

  const avisoInicial =
    parametros.get("reset") === "ok"
      ? { tipo: "exito" as const, texto: "Tu contraseña fue actualizada. Ya puedes iniciar sesión." }
      : parametros.get("expirada") === "1"
        ? { tipo: "info" as const, texto: "Tu sesión expiró. Inicia sesión nuevamente." }
        : null;

  const redirigiendo = isSubmitSuccessful && !errorServidor;

  return (
    <TarjetaAuth
      titulo="Iniciar sesión"
      descripcion="Ingresa con tu correo corporativo para consultar tus desprendibles y certificados."
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
              {errorServidor.mensaje === "Credenciales inválidas" ? (
                <p className="mt-0.5">
                  Verifica tus datos. Tras varios intentos fallidos la cuenta se bloquea temporalmente.
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
          label="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="nombre@empresa.com"
          autoFocus
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="space-y-2">
          <CampoAuth
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            conmutarVisibilidad
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex justify-end">
            <Link
              href="/auth/forgot-password"
              className="rounded text-sm font-medium text-blue-800 underline-offset-4 hover:underline dark:text-blue-400"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>

        <BotonAuth cargando={isSubmitting || redirigiendo} textoCargando={redirigiendo ? "Entrando…" : "Verificando…"}>
          Iniciar sesión
        </BotonAuth>
      </form>
    </TarjetaAuth>
  );
}
