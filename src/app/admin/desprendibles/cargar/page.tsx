"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CargueMasivo } from "@/components/desprendibles/cargue-masivo";
import { EmptyState } from "@/components/ui/empty-state";
import { CargandoPagina } from "@/components/ui/loading-spinner";
import { useColaboradores } from "@/hooks/use-colaboradores";
import { mensajeDeError } from "@/lib/api-cliente";

export default function PaginaCargueMasivo() {
  // Todos los colaboradores (también inactivos: puede cargarse un periodo anterior a su retiro)
  const colaboradores = useColaboradores({ porPagina: 1000 });

  return (
    <div className="space-y-4">
      <Link href="/admin/desprendibles" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-acento">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a desprendibles
      </Link>

      {colaboradores.isLoading ? (
        <CargandoPagina mensaje="Cargando colaboradores…" />
      ) : colaboradores.isError ? (
        <EmptyState titulo="No fue posible cargar los colaboradores" descripcion={mensajeDeError(colaboradores.error)} />
      ) : (
        <CargueMasivo colaboradores={colaboradores.data?.datos ?? []} />
      )}
    </div>
  );
}
