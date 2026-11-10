"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { construirQuery, peticion } from "@/lib/api-cliente";
import type { ListaPaginada } from "@/types/colaborador";
import type {
  Desprendible,
  DesprendibleBulkRow,
  DesprendibleInput,
  FiltrosDesprendibles,
  ResultadoBulk,
} from "@/types/desprendible";

export const clavesDesprendibles = {
  todos: ["desprendibles"] as const,
  lista: (filtros: FiltrosDesprendibles) => ["desprendibles", "lista", filtros] as const,
  mios: (filtros: FiltrosDesprendibles) => ["desprendibles", "mios", filtros] as const,
  detalle: (id: string) => ["desprendibles", "detalle", id] as const,
};

const urlLista = (filtros: FiltrosDesprendibles) =>
  `/api/desprendibles${construirQuery({
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
    periodo: filtros.periodo,
    busqueda: filtros.busqueda,
    colaboradorId: filtros.colaboradorId,
  })}`;

/** Lista de desprendibles (admin) con filtros por periodo y búsqueda por colaborador. */
export function useDesprendibles(filtros: FiltrosDesprendibles = {}) {
  return useQuery({
    queryKey: clavesDesprendibles.lista(filtros),
    queryFn: () => peticion<ListaPaginada<Desprendible>>(urlLista(filtros)),
    placeholderData: keepPreviousData,
  });
}

/** Desprendibles del colaborador autenticado (el servidor filtra por la sesión). */
export function useMisDesprendibles(filtros: Omit<FiltrosDesprendibles, "colaboradorId" | "busqueda"> = {}) {
  return useQuery({
    queryKey: clavesDesprendibles.mios(filtros),
    queryFn: () => peticion<ListaPaginada<Desprendible>>(urlLista(filtros)),
    placeholderData: keepPreviousData,
  });
}

export function useDesprendible(id: string | null | undefined) {
  return useQuery({
    queryKey: clavesDesprendibles.detalle(id ?? ""),
    queryFn: () => peticion<Desprendible>(`/api/desprendibles/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateDesprendible() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: DesprendibleInput) =>
      peticion<Desprendible>("/api/desprendibles", { method: "POST", body: JSON.stringify(datos) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesDesprendibles.todos }),
  });
}

export function useUpdateDesprendible() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: Partial<DesprendibleInput> }) =>
      peticion<Desprendible>(`/api/desprendibles/${id}`, { method: "PUT", body: JSON.stringify(datos) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesDesprendibles.todos }),
  });
}

export function useDeleteDesprendible() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => peticion<{ mensaje: string }>(`/api/desprendibles/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesDesprendibles.todos }),
  });
}

/** Cargue masivo de desprendibles a partir de filas ya parseadas del archivo. */
export function useBulkUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: { filas: DesprendibleBulkRow[]; calcularAportes: boolean }) =>
      peticion<ResultadoBulk>("/api/desprendibles/bulk", { method: "POST", body: JSON.stringify(datos) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesDesprendibles.todos }),
  });
}
