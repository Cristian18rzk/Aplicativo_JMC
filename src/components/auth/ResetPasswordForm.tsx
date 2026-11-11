"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { ErrorPeticion, mensajeDeError, peticion } from "@/lib/api-cliente";
import { contieneDatosPersonales, type DatosPersonales } from "@/lib/auth/fortaleza";
import { resetPasswordFormSchema, type ResetPasswordFormSchema } from "@/lib/validators/auth";
import { obtenerCsrf } from "@/providers/auth-provider";
import { AlertaAuth, BotonAuth, CampoAuth, TarjetaAuth } from "./auth-ui";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";

const SEGUNDOS_REDIRECCION = 5;

export function ResetPasswordForm({
  token,
  esInvitacion,
  datosPersonales,
}: {
  token: string;
  esInvitacion: boolean;
  /** Email y nombre del titular: la contraseña no puede contenerlos (el servidor lo vuelve a verificar). */
  datosPersonales: DatosPersonales;
}) {
  const router = useRouter();
  const [exito, setExito] = useState(false);
  const [segundos, setSegundos] = useState(SEGUNDOS_REDIRECCION);
  const [error, setError] = useState<{ mensaje: string; detalles: string[]; intento: number; enlaceInvalido: boolean } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError: marcarError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormSchema>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onTouched",
    criteriaMode: "firstError",
  });
  const password = useWatch({ control, name: "password" });
  const confirmacion = useWatch({ control, name: "confirmPassword" });

  // Redirección automática al login tras el éxito
  useEffect(() => {
    if (!exito) return;
    if (segundos <= 0) {
      router.replace("/auth/login?reset=ok");
      return;
    }
    const t = window.setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [exito, segundos, router]);

  const enviar = async (datos: ResetPasswordFormSchema) => {
    setError(null);
    if (contieneDatosPersonales(datos.password, datosPersonales)) {
      marcarError("password", { message: "No puede contener tu correo ni tu nombre" }, { shouldFocus: true });
      return;
    }
    try {
      await peticion("/api/auth/reset-password", {
        method: "POST",
        headers: { "X-CSRF-Token": await obtenerCsrf() },
        body: JSON.stringify({ token, ...datos }),
      });
      setExito(true);
    } catch (e) {
      const detalles = e instanceof ErrorPeticion ? (e.detalles?.password ?? []) : [];
      if (detalles.length) marcarError("password", { message: detalles[0] });
      setError((p) => ({
        mensaje: e instanceof ErrorPeticion ? e.message : mensajeDeError(e),
        detalles,
        intento: (p?.intento ?? 0) + 1,
        enlaceInvalido: e instanceof ErrorPeticion && e.status === 400 && detalles.length === 0,
      }));
    }
  };

  if (exito) {
    return (
      <TarjetaAuth
        titulo="Contraseña actualizada"
        icono={<CheckCircle2 className="h-5 w-5" aria-hidden />}
        descripcion="Por seguridad cerramos todas tus sesiones abiertas."
      >
        <AlertaAuth tipo="exito" enfocar>
          Te llevaremos a iniciar sesión en <span className="tabular-nums font-semibold">{segundos}</span> s.
        </AlertaAuth>
        <Link
          href="/auth/login?reset=ok"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-800 text-sm font-semibold text-white hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          Ir a iniciar sesión ahora
        </Link>
      </TarjetaAuth>
    );
  }

  const coinciden = confirmacion.length > 0 && confirmacion === password;

  return (
    <TarjetaAuth
      titulo={esInvitacion ? "Crea tu contraseña" : "Crea una nueva contraseña"}
      descripcion="Usa una contraseña que no uses en otros sitios. Una frase de varias palabras es fácil de recordar y difícil de adivinar."
      icono={<ShieldCheck className="h-5 w-5" aria-hidden />}
    >
      <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5">
        {error ? (
          <AlertaAuth tipo="error" clave={error.intento}>
            <p className="font-medium">{error.mensaje}</p>
            {error.detalles.length > 1 ? (
              <ul className="mt-1 list-disc pl-4">
                {error.detalles.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : null}
            {error.enlaceInvalido ? (
              <Link href="/auth/forgot-password" className="mt-1 inline-block font-semibold underline underline-offset-4">
                Solicitar un enlace nuevo
              </Link>
            ) : null}
          </AlertaAuth>
        ) : null}

        <CampoAuth
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          conmutarVisibilidad
          autoFocus
          maxLength={128}
          error={errors.password?.message}
          ayuda={<PasswordStrengthMeter password={password} datos={datosPersonales} />}
          {...register("password")}
        />

        <CampoAuth
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          conmutarVisibilidad
          maxLength={128}
          error={errors.confirmPassword?.message}
          ayuda={
            coinciden ? (
              <span className="font-medium text-green-700 dark:text-green-400" aria-live="polite">
                Las contraseñas coinciden
              </span>
            ) : undefined
          }
          {...register("confirmPassword")}
        />

        <BotonAuth cargando={isSubmitting} textoCargando="Guardando…">
          Guardar contraseña
        </BotonAuth>
      </form>
    </TarjetaAuth>
  );
}
