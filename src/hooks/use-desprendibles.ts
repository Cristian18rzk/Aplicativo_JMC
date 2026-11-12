"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { construirQuery, peticion } from "@/lib/api-cliente";
import type { ListaPaginada } from "@/types/colaborador";
import type { Desprendible, DesprendibleInput, FiltrosDesprendibles } from "@/types/desprendible";

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
    plantilla: filtros.plantilla,
  })}`;

/** Lista de desprendibles (admin) con filtros por periodo y búsqueda por colaborador. */
export function useDesprendibles(filtros: FiltrosDesprendibles = {}, habilitado = true) {
  return useQuery({
    queryKey: clavesDesprendibles.lista(filtros),
    queryFn: () => peticion<ListaPaginada<Desprendible>>(urlLista(filtros)),
    placeholderData: keepPreviousData,
    enabled: habilitado,
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

/** Arma el multipart: datos del desprendible + PDF (opcional en la edición). */
function aFormulario(datos: Partial<DesprendibleInput>, archivo?: File | null): FormData {
  const formulario = new FormData();
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor !== undefined && valor !== "") formulario.append(clave, String(valor));
  }
  if (archivo) formulario.append("archivo", archivo, archivo.name);
  return formulario;
}

/** Sube el PDF de un desprendible. */
export function useSubirDesprendible() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ datos, archivo }: { datos: DesprendibleInput; archivo: File }) =>
      peticion<Desprendible>("/api/desprendibles", { method: "POST", body: aFormulario(datos, archivo) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesDesprendibles.todos }),
  });
}

/** Cambia los datos del desprendible y, si se adjunta, reemplaza el PDF. */
export function useUpdateDesprendible() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos, archivo }: { id: string; datos: Partial<DesprendibleInput>; archivo?: File | null }) =>
      peticion<Desprendible>(`/api/desprendibles/${id}`, { method: "PUT", body: aFormulario(datos, archivo) }),
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
