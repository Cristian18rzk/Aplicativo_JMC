"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ColaboradorTable } from "@/components/colaboradores/colaborador-table";
import { clasesBoton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { useColaboradores } from "@/hooks/use-colaboradores";
import { mensajeDeError } from "@/lib/api-cliente";
import { AREAS, ESTADOS_COLABORADOR, type Area, type EstadoColaborador } from "@/types/colaborador";

const POR_PAGINA = 10;

export default function PaginaColaboradores() {
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [area, setArea] = useState<Area | "">("");
  const [estado, setEstado] = useState<EstadoColaborador | "">("");

  const { data, isLoading, isFetching, isError, error } = useColaboradores({
    pagina,
    porPagina: POR_PAGINA,
    busqueda,
    area,
    estado,
  });

  const botonNuevo = (
    <Link href="/admin/colaboradores/nuevo" className={clasesBoton("primary", "md")}>
      <UserPlus className="h-4 w-4" aria-hidden />
      Nuevo colaborador
    </Link>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-texto-suave">Gestione los datos de cada colaborador y sus documentos.</p>
        {botonNuevo}
      </div>

      <Card>
        <div className="grid gap-3 border-b border-borde p-4 sm:grid-cols-2 lg:grid-cols-4">
          <SearchInput
            className="sm:col-span-2"
            placeholder="Buscar por nombre o cédula…"
            onBuscar={(valor) => {
              setBusqueda(valor);
              setPagina(1);
            }}
          />
          <Select
            aria-label="Filtrar por área"
            placeholder="Todas las áreas"
            opciones={AREAS}
            value={area}
            onChange={(e) => {
              setArea(e.target.value as Area | "");
              setPagina(1);
            }}
          />
          <Select
            aria-label="Filtrar por estado"
            placeholder="Todos los estados"
            opciones={ESTADOS_COLABORADOR}
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoColaborador | "");
              setPagina(1);
            }}
          />
        </div>

        {isError ? (
          <EmptyState titulo="Error al cargar colaboradores" descripcion={mensajeDeError(error)} />
        ) : (
          <div className={isFetching && !isLoading ? "opacity-60 transition-opacity" : undefined}>
            <ColaboradorTable colaboradores={data?.datos ?? []} cargando={isLoading} accionVacio={botonNuevo} />
          </div>
        )}

        {data && data.total > 0 ? (
          <div className="border-t border-borde">
            <Pagination
              pagina={data.pagina}
              totalPaginas={data.totalPaginas}
              total={data.total}
              porPagina={data.porPagina}
              onCambiar={setPagina}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
