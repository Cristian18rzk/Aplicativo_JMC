"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ErrorPeticion } from "@/lib/api-cliente";

function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutos
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        // No reintentar errores de cliente (401, 403, 404, 422…)
        retry: (intentos, error) => {
          if (error instanceof ErrorPeticion && error.status < 500) return false;
          return intentos < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // Un QueryClient por sesión del navegador (no compartido entre peticiones del servidor)
  const [cliente] = useState(crearQueryClient);
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}
