"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck, KeyRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ErrorPeticion, mensajeDeError, peticion } from "@/lib/api-cliente";
import { forgotPasswordSchema, type ForgotPasswordSchema } from "@/lib/validators/auth";
import { obtenerCsrf } from "@/providers/auth-provider";
import { AlertaAuth, BotonAuth, CampoAuth, TarjetaAuth } from "./auth-ui";

const ESPERA_SEGUNDOS = 60;

function enlaceVolver() {
  return (
    <Link
      href="/auth/login"
      className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-blue-800 underline-offset-4 hover:underline dark:text-blue-400"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Volver a iniciar sesión
    </Link>
  );
}

export function ForgotPasswordForm() {
  const [enviado, setEnviado] = useState<string | null>(null);
  const [error, setError] = useState<{ mensaje: string; intento: number } | null>(null);
  const [segundos, setSegundos] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordSchema>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  // Cooldown visual entre reenvíos
  useEffect(() => {
    if (segundos <= 0) return;
    const t = window.setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [segundos]);

  const solicitar = async ({ email }: ForgotPasswordSchema) => {
    setError(null);
    try {
      const { mensaje } = await peticion<{ mensaje: string }>("/api/auth/forgot-password", {
        method: "POST",
        headers: { "X-CSRF-Token": await obtenerCsrf() },
        body: JSON.stringify({ email }),
      });
      setEnviado(mensaje);
      setSegundos(ESPERA_SEGUNDOS);
    } catch (e) {
      const mensaje = e instanceof ErrorPeticion && e.status === 429 ? e.message : mensajeDeError(e);
      setError((p) => ({ mensaje, intento: (p?.intento ?? 0) + 1 }));
    }
  };

  if (enviado) {
    return (
      <TarjetaAuth
        titulo="Revisa tu correo"
        icono={<MailCheck className="h-5 w-5" aria-hidden />}
        descripcion={
          <>
            {enviado} El enlace vence en 1 hora. Revisa también la carpeta de correo no deseado.
          </>
        }
      >
        <div className="space-y-5">
          {error ? (
            <AlertaAuth tipo="error" clave={error.intento}>
              {error.mensaje}
            </AlertaAuth>
          ) : null}
          <BotonAuth
            type="button"
            cargando={isSubmitting}
            textoCargando="Reenviando…"
            disabled={segundos > 0}
            onClick={handleSubmit(solicitar)}
            className="bg-white text-blue-800 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-blue-300 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            {segundos > 0 ? (
              <span>
                Reenviar en <span className="tabular-nums">{segundos}</span> s
              </span>
            ) : (
              "Reenviar instrucciones"
            )}
          </BotonAuth>
          <p className="sr-only" aria-live="polite">
            {segundos === 0 ? "Ya puedes reenviar las instrucciones" : ""}
          </p>
          <div className="text-center">{enlaceVolver()}</div>
        </div>
      </TarjetaAuth>
    );
  }

  return (
    <TarjetaAuth
      titulo="¿Olvidaste tu contraseña?"
      descripcion="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva."
      icono={<KeyRound className="h-5 w-5" aria-hidden />}
    >
      <form onSubmit={handleSubmit(solicitar)} noValidate className="space-y-5">
        {error ? (
          <AlertaAuth tipo="error" clave={error.intento}>
            {error.mensaje}
          </AlertaAuth>
        ) : null}
        <CampoAuth
          label="Correo electrónico"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="nombre@empresa.com"
          autoFocus
          error={errors.email?.message}
          {...register("email")}
        />
        <BotonAuth cargando={isSubmitting} textoCargando="Enviando…">
          Enviar instrucciones
        </BotonAuth>
        <div className="text-center">{enlaceVolver()}</div>
      </form>
    </TarjetaAuth>
  );
}
