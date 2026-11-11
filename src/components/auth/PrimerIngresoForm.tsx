"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorPeticion, mensajeDeError, peticion } from "@/lib/api-cliente";
import { LONGITUD_PIN } from "@/lib/auth/pin";
import { cedulaSchema } from "@/lib/validators/auth";
import { obtenerCsrf } from "@/providers/auth-provider";
import { AlertaAuth, BotonAuth, CampoAuth, TarjetaAuth } from "./auth-ui";

const esquema = z.object({ cedula: cedulaSchema });
type Datos = z.input<typeof esquema>;

/** Primer ingreso: el colaborador escribe su cédula y pasa a crear su PIN. */
export function PrimerIngresoForm() {
  const router = useRouter();
  const [error, setError] = useState<{ mensaje: string; intento: number } | null>(null);
  const [continuando, setContinuando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Datos>({ resolver: zodResolver(esquema), defaultValues: { cedula: "" }, mode: "onTouched" });

  const enviar = async ({ cedula }: Datos) => {
    setError(null);
    try {
      await peticion("/api/auth/primer-ingreso", {
        method: "POST",
        headers: { "X-CSRF-Token": await obtenerCsrf() },
        body: JSON.stringify({ cedula }),
      });
    } catch (e) {
      setError((p) => ({
        mensaje: e instanceof ErrorPeticion ? e.message : mensajeDeError(e),
        intento: (p?.intento ?? 0) + 1,
      }));
      return;
    }
    setContinuando(true);
    router.push("/auth/crear-pin");
  };

  return (
    <TarjetaAuth
      titulo="Es mi primera vez"
      descripcion={`Escribe tu número de cédula. Después vas a crear un PIN de ${LONGITUD_PIN} números para ingresar siempre.`}
      icono={<Sparkles className="h-5 w-5" aria-hidden />}
    >
      <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5">
        {error ? (
          <AlertaAuth tipo="error" clave={error.intento}>
            {error.mensaje}
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
          className="h-14 text-xl sm:text-xl"
          error={errors.cedula?.message}
          {...register("cedula")}
        />

        <BotonAuth cargando={isSubmitting || continuando} textoCargando="Verificando…" className="h-14 text-lg">
          Continuar
        </BotonAuth>

        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-2 rounded text-base font-medium text-palma-600 underline-offset-4 hover:underline dark:text-palma-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Ya tengo PIN, quiero ingresar
        </Link>
      </form>
    </TarjetaAuth>
  );
}
