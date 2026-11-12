"use client";

import { useQuery } from "@tanstack/react-query";
import { peticion } from "@/lib/api-cliente";
import type { ResumenAdmin } from "@/types/resumen";

/** Indicadores del panel del administrador. Se invalida junto con desprendibles y colaboradores. */
export function useResumenAdmin() {
  return useQuery({
    queryKey: ["resumen-admin"],
    queryFn: () => peticion<ResumenAdmin>("/api/admin/resumen"),
    staleTime: 60 * 1000,
  });
}
