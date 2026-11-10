"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useMemo, type ReactNode } from "react";
import { ErrorPeticion, peticion } from "@/lib/api-cliente";
import type { AuthUser, LoginResponse } from "@/types/auth";

export const CLAVE_USUARIO = ["auth", "me"] as const;

export interface ContextoAuth {
  usuario: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  /** Paso 1: solicita el código de verificación para una cédula. */
  login: (cedula: string) => Promise<LoginResponse>;
  /** Paso 2: valida el código, crea la sesión y redirige según el rol. */
  verify: (cedula: string, codigo: string, redirigir?: string | null) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refrescar: () => Promise<unknown>;
}

export const AuthContext = createContext<ContextoAuth | null>(null);

async function obtenerUsuarioActual(): Promise<AuthUser | null> {
  try {
    const { usuario } = await peticion<{ usuario: AuthUser }>("/api/auth/me");
    return usuario;
  } catch (error) {
    if (error instanceof ErrorPeticion && error.status === 401) return null;
    throw error;
  }
}

/** Ruta interna segura a la que redirigir después del login (evita redirecciones abiertas). */
function destinoSeguro(redirigir: string | null | undefined, usuario: AuthUser): string {
  const inicio = usuario.rol === "admin" ? "/admin" : "/colaborador";
  if (!redirigir || !redirigir.startsWith("/") || redirigir.startsWith("//")) return inicio;
  return redirigir.startsWith(inicio) ? redirigir : inicio;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: usuario = null, isLoading, refetch } = useQuery({
    queryKey: CLAVE_USUARIO,
    queryFn: obtenerUsuarioActual,
    staleTime: 5 * 60 * 1000,
  });

  const login = useCallback(
    (cedula: string) =>
      peticion<LoginResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ cedula }) }),
    [],
  );

  const verify = useCallback(
    async (cedula: string, codigo: string, redirigir?: string | null) => {
      const { usuario: nuevo } = await peticion<{ usuario: AuthUser }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ cedula, codigo }),
      });
      queryClient.clear();
      queryClient.setQueryData(CLAVE_USUARIO, nuevo);
      router.replace(destinoSeguro(redirigir, nuevo));
      router.refresh();
      return nuevo;
    },
    [queryClient, router],
  );

  const logout = useCallback(async () => {
    try {
      await peticion("/api/auth/logout", { method: "POST" });
    } finally {
      queryClient.clear();
      queryClient.setQueryData(CLAVE_USUARIO, null);
      router.replace("/login");
      router.refresh();
    }
  }, [queryClient, router]);

  const valor = useMemo<ContextoAuth>(
    () => ({
      usuario,
      isAdmin: usuario?.rol === "admin",
      isLoading,
      login,
      verify,
      logout,
      refrescar: refetch,
    }),
    [usuario, isLoading, login, verify, logout, refetch],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
