"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { construirQuery, peticion } from "@/lib/api-cliente";
import type { Certificado, FiltrosCertificados, GenerarCertificadoInput } from "@/types/certificado";
import type { ListaPaginada } from "@/types/colaborador";

export const clavesCertificados = {
  todos: ["certificados"] as const,
  lista: (filtros: FiltrosCertificados) => ["certificados", "lista", filtros] as const,
};

/** Lista de certificados (el admin ve todos; el colaborador, solo los suyos). */
export function useCertificados(filtros: FiltrosCertificados = {}) {
  return useQuery({
    queryKey: clavesCertificados.lista(filtros),
    queryFn: () =>
      peticion<ListaPaginada<Certificado>>(
        `/api/certificados${construirQuery({
          pagina: filtros.pagina,
          porPagina: filtros.porPagina,
          tipo: filtros.tipo,
          colaboradorId: filtros.colaboradorId,
        })}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useGenerarCertificado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: GenerarCertificadoInput) =>
      peticion<Certificado>("/api/certificados", { method: "POST", body: JSON.stringify(datos) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesCertificados.todos }),
  });
}
