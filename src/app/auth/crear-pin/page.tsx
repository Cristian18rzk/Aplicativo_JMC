import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { CrearPinForm } from "@/components/auth/CrearPinForm";
import { TarjetaAuth } from "@/components/auth/auth-ui";
import { IconoTiempo } from "@/components/auth/iconos-auth";
import { MENSAJE_TOKEN_INVALIDO, validarTokenCambioPin } from "@/lib/auth/cambio-pin";
import { COOKIE_CAMBIO_PIN } from "@/lib/auth/constantes";

export const metadata: Metadata = { title: "Crea tu PIN" };

/**
 * Se llega aquí solo después de ingresar con un PIN temporal vigente: el login deja una cookie HttpOnly
 * con un token de un solo uso (15 min). Se verifica en el servidor antes de mostrar el formulario.
 */
export default async function PaginaCrearPin() {
  const token = (await cookies()).get(COOKIE_CAMBIO_PIN)?.value;
  const usuario = await validarTokenCambioPin(token);

  if (!usuario) {
    return (
      <TarjetaAuth titulo="Vuelve a ingresar" icono={<IconoTiempo className="h-6 w-6" />} descripcion={MENSAJE_TOKEN_INVALIDO}>
        <Link
          href="/auth/login"
          className="inline-flex h-14 w-full items-center justify-center rounded-lg bg-palma-600 text-lg font-semibold text-white hover:bg-palma-800 dark:bg-palma-600 dark:hover:bg-palma-700"
        >
          Ir a ingresar
        </Link>
      </TarjetaAuth>
    );
  }

  // El nombre de pila hace la pantalla más cercana; la cédula se usa para ingresar al terminar
  return <CrearPinForm cedula={usuario.cedula} nombre={usuario.nombre.split(" ")[0] ?? ""} />;
}
