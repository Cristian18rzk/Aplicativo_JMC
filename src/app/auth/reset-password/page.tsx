import { LinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { TarjetaAuth } from "@/components/auth/auth-ui";
import { validarTokenReset } from "@/lib/auth/reset";
import { tokenResetSchema } from "@/lib/validators/auth";

export const metadata: Metadata = { title: "Nueva contraseña" };

interface Props {
  searchParams: Promise<{ token?: string | string[] }>;
}

/**
 * El token se verifica en el servidor ANTES de mostrar el formulario: se hashea con SHA-256, se busca
 * el hash en Airtable y se comprueba la expiración. Esta verificación no consume el token; solo el
 * POST a /api/auth/reset-password lo invalida (single-use).
 */
export default async function PaginaResetPassword({ searchParams }: Props) {
  const { token } = await searchParams;
  const formato = tokenResetSchema.safeParse(Array.isArray(token) ? token[0] : token);
  const usuario = formato.success ? await validarTokenReset(formato.data) : null;

  if (!formato.success || !usuario) {
    return (
      <TarjetaAuth
        titulo="Enlace no válido"
        icono={<LinkIcon className="h-5 w-5" aria-hidden />}
        descripcion="Este enlace para restablecer la contraseña no es válido, ya se usó o expiró. Los enlaces vencen a la hora de solicitarlos y solo funcionan una vez."
      >
        <div className="space-y-4">
          <Link
            href="/auth/forgot-password"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-blue-800 text-sm font-semibold text-white hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Solicitar un enlace nuevo
          </Link>
          <p className="text-center">
            <Link href="/auth/login" className="rounded text-sm font-medium text-blue-800 underline-offset-4 hover:underline dark:text-blue-400">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </TarjetaAuth>
    );
  }

  return (
    <ResetPasswordForm
      token={formato.data}
      esInvitacion={!usuario.passwordHash}
      datosPersonales={{ email: usuario.email, nombre: usuario.nombre }}
    />
  );
}
