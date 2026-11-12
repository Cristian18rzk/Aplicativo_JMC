"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useAuth } from "@/hooks/use-auth";
import { ErrorPeticion, mensajeDeError, peticion } from "@/lib/api-cliente";
import { LONGITUD_PIN, erroresPin } from "@/lib/auth/pin";
import { crearPinSchema, type CrearPinSchema } from "@/lib/validators/auth";
import { obtenerCsrf } from "@/providers/auth-provider";
import { AlertaAuth, BotonAuth, CampoAuth, TarjetaAuth } from "./auth-ui";
import { IconoEscudoPin, IconoPin } from "./iconos-auth";

const CLASE_PIN = "h-14 text-2xl tracking-[0.5em] sm:text-2xl";

export function CrearPinForm({ cedula, nombre }: { cedula: string; nombre: string }) {
  const { iniciarSesion } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<{ mensaje: string; intento: number } | null>(null);
  const [entrando, setEntrando] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setError: marcarError,
    formState: { errors, isSubmitting },
  } = useForm<CrearPinSchema>({
    resolver: zodResolver(crearPinSchema),
    defaultValues: { pin: "", confirmPin: "" },
    mode: "onTouched",
  });
  const pin = useWatch({ control, name: "pin" });
  const confirmacion = useWatch({ control, name: "confirmPin" });

  const enviar = async (datos: CrearPinSchema) => {
    setError(null);
    // La regla de la cédula solo se puede verificar aquí (el esquema no la conoce); el servidor la repite
    const [errorCedula] = erroresPin(datos.pin, cedula);
    if (errorCedula) {
      marcarError("pin", { message: errorCedula }, { shouldFocus: true });
      return;
    }
    try {
      await peticion("/api/auth/crear-pin", {
        method: "POST",
        headers: { "X-CSRF-Token": await obtenerCsrf() },
        body: JSON.stringify(datos),
      });
    } catch (e) {
      const detalle = e instanceof ErrorPeticion ? e.detalles?.pin?.[0] : undefined;
      if (detalle) {
        marcarError("pin", { message: detalle }, { shouldFocus: true });
        return;
      }
      setError((p) => ({ mensaje: e instanceof ErrorPeticion ? e.message : mensajeDeError(e), intento: (p?.intento ?? 0) + 1 }));
      return;
    }

    // PIN guardado: entra directamente con el PIN nuevo (no se le pide escribirlo otra vez)
    setEntrando(true);
    try {
      await iniciarSesion(cedula, datos.pin);
    } catch {
      router.replace("/auth/login");
    }
  };

  const coinciden = confirmacion.length === LONGITUD_PIN && confirmacion === pin;

  return (
    <TarjetaAuth
      titulo={nombre ? `Hola, ${nombre}. Crea tu PIN` : "Crea tu PIN"}
      descripcion={`Elige ${LONGITUD_PIN} números que puedas recordar. Con tu cédula y este PIN vas a ingresar de ahora en adelante.`}
      icono={<IconoEscudoPin className="h-6 w-6" />}
    >
      <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5">
        {error ? (
          <AlertaAuth tipo="error" clave={error.intento}>
            {error.mensaje}
          </AlertaAuth>
        ) : null}

        <CampoAuth
          label={`Nuevo PIN (${LONGITUD_PIN} números)`}
          icono={<IconoPin className="h-[22px] w-[22px]" />}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="new-password"
          conmutarVisibilidad
          autoFocus
          maxLength={LONGITUD_PIN}
          className={CLASE_PIN}
          error={errors.pin?.message}
          ayuda="No uses números repetidos (1111), seguidos (1234), un año ni números de tu cédula."
          {...register("pin")}
        />

        <CampoAuth
          label="Repite el PIN"
          icono={<IconoPin className="h-[22px] w-[22px]" />}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="new-password"
          conmutarVisibilidad
          maxLength={LONGITUD_PIN}
          className={CLASE_PIN}
          error={errors.confirmPin?.message}
          ayuda={
            coinciden ? (
              <span className="text-sm font-medium text-acento dark:text-palma-400" aria-live="polite">
                Los PIN coinciden
              </span>
            ) : undefined
          }
          {...register("confirmPin")}
        />

        <BotonAuth
          cargando={isSubmitting || entrando}
          textoCargando={entrando ? "Entrando…" : "Guardando…"}
          className="h-14 text-lg"
        >
          Guardar mi PIN
        </BotonAuth>
      </form>
    </TarjetaAuth>
  );
}
