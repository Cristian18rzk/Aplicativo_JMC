"use client";

import { useContext } from "react";
import { AuthContext, type ContextoAuth } from "@/providers/auth-provider";

/**
 * Hook de autenticación.
 * Expone: usuario actual, isAdmin, isLoading, iniciarSesion (email + contraseña) y logout.
 */
export function useAuth(): ContextoAuth {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return contexto;
}
