import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { CargandoPagina } from "@/components/ui/loading-spinner";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function PaginaLogin() {
  return (
    // useSearchParams (mensajes de reset/expiración y redirección) requiere un límite de Suspense
    <Suspense fallback={<CargandoPagina />}>
      <LoginForm />
    </Suspense>
  );
}
