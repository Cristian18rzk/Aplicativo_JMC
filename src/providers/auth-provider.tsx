"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCsrfToken, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useMemo, type ReactNode } from "react";
import { ErrorPeticion, peticion } from "@/lib/api-cliente";
import { destinoSeguro } from "@/lib/auth/rutas";
import type { AuthUser } from "@/types/auth";

export const CLAVE_USUARIO = ["auth", "me"] as const;

const MENSAJES_LOGIN = {
  credenciales: "Cédula o PIN incorrectos",
  limite: "Demasiados intentos desde esta red. Espera 15 minutos e inténtalo de nuevo.",
  servicio: "El servicio no está disponible en este momento. Inténtalo de nuevo en unos minutos.",
  red: "No fue posible conectar con el servidor. Revisa tu conexión.",
  cambiar_pin: "Ahora crea tu PIN personal.",
  pin_vencido: "Tu PIN temporal ya venció. Pide uno nuevo al administrador.",
} as const;

export type CodigoLogin = keyof typeof MENSAJES_LOGIN;

/** Error de login con un código genérico (nunca indica si la cédula existe). */
export class ErrorLogin extends Error {
  constructor(public readonly codigo: CodigoLogin) {
    super(MENSAJES_LOGIN[codigo]);
    this.name = "ErrorLogin";
  }
}

const CODIGOS_SERVIDOR = new Set<string>(["limite", "servicio", "cambiar_pin", "pin_vencido"]);

export interface ContextoAuth {
  usuario: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  /** Valida cédula + PIN (o contraseña del admin) con Auth.js, carga el usuario y redirige según el rol. */
  iniciarSesion: (cedula: string, password: string, redirigir?: string | null) => Promise<AuthUser>;
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

/** Token CSRF de Auth.js para los endpoints propios (logout, crear PIN, PIN temporal). */
export async function obtenerCsrf(): Promise<string> {
  return getCsrfToken();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: usuario = null, isLoading, refetch } = useQuery({
    queryKey: CLAVE_USUARIO,
    queryFn: obtenerUsuarioActual,
    staleTime: 5 * 60 * 1000,
  });

  const iniciarSesion = useCallback(
    async (cedula: string, password: string, redirigir?: string | null) => {
      let resultado: Awaited<ReturnType<typeof signIn>> | undefined;
      try {
        // signIn obtiene el token CSRF de Auth.js y lo envía junto con las credenciales
        resultado = await signIn("credentials", { cedula, password, redirect: false });
      } catch {
        throw new ErrorLogin("red");
      }
      if (!resultado || resultado.error) {
        const codigo = resultado?.code ?? "";
        throw new ErrorLogin(CODIGOS_SERVIDOR.has(codigo) ? (codigo as CodigoLogin) : "credenciales");
      }

      queryClient.clear();
      const nuevo = await obtenerUsuarioActual();
      if (!nuevo) throw new ErrorLogin("credenciales");
      queryClient.setQueryData(CLAVE_USUARIO, nuevo);
      router.replace(destinoSeguro(redirigir, nuevo.rol));
      router.refresh();
      return nuevo;
    },
    [queryClient, router],
  );

  const logout = useCallback(async () => {
    try {
      await peticion("/api/auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": await obtenerCsrf() },
      });
    } finally {
      queryClient.clear();
      queryClient.setQueryData(CLAVE_USUARIO, null);
      router.replace("/auth/login");
      router.refresh();
    }
  }, [queryClient, router]);

  const valor = useMemo<ContextoAuth>(
    () => ({
      usuario,
      isAdmin: usuario?.rol === "admin",
      isLoading,
      iniciarSesion,
      logout,
      refrescar: refetch,
    }),
    [usuario, isLoading, iniciarSesion, logout, refetch],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
