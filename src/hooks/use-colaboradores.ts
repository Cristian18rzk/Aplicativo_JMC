"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { construirQuery, peticion } from "@/lib/api-cliente";
import type {
  Colaborador,
  ColaboradorInput,
  FiltrosColaboradores,
  ListaPaginada,
} from "@/types/colaborador";

export const clavesColaboradores = {
  todos: ["colaboradores"] as const,
  lista: (filtros: FiltrosColaboradores) => ["colaboradores", "lista", filtros] as const,
  detalle: (id: string) => ["colaboradores", "detalle", id] as const,
};

/** Lista paginada de colaboradores con filtros. */
export function useColaboradores(filtros: FiltrosColaboradores = {}, habilitado = true) {
  return useQuery({
    queryKey: clavesColaboradores.lista(filtros),
    queryFn: () =>
      peticion<ListaPaginada<Colaborador>>(
        `/api/colaboradores${construirQuery({
          pagina: filtros.pagina,
          porPagina: filtros.porPagina,
          busqueda: filtros.busqueda,
          area: filtros.area,
          estado: filtros.estado,
        })}`,
      ),
    placeholderData: keepPreviousData,
    enabled: habilitado,
  });
}

/** Un colaborador por ID. */
export function useColaborador(id: string | null | undefined) {
  return useQuery({
    queryKey: clavesColaboradores.detalle(id ?? ""),
    queryFn: () => peticion<Colaborador>(`/api/colaboradores/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateColaborador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: ColaboradorInput) =>
      peticion<Colaborador>("/api/colaboradores", { method: "POST", body: JSON.stringify(datos) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clavesColaboradores.todos }),
  });
}

export function useUpdateColaborador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: Partial<ColaboradorInput> }) =>
      peticion<Colaborador>(`/api/colaboradores/${id}`, { method: "PUT", body: JSON.stringify(datos) }),
    onSuccess: (colaborador) => {
      queryClient.setQueryData(clavesColaboradores.detalle(colaborador.id), colaborador);
      return queryClient.invalidateQueries({ queryKey: clavesColaboradores.todos });
    },
  });
}

export function useDeleteColaborador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => peticion<{ mensaje: string }>(`/api/colaboradores/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: clavesColaboradores.detalle(id) });
      return queryClient.invalidateQueries({ queryKey: clavesColaboradores.todos });
    },
  });
}
