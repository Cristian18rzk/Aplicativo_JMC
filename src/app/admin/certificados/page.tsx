"use client";

import { useState } from "react";
import { CertificadoGenerator } from "@/components/certificados/certificado-generator";
import { CertificadoTable } from "@/components/certificados/certificado-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CargandoPagina } from "@/components/ui/loading-spinner";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { useCertificados } from "@/hooks/use-certificados";
import { useColaboradores } from "@/hooks/use-colaboradores";
import { mensajeDeError } from "@/lib/api-cliente";
import { TIPOS_CERTIFICADO, type TipoCertificado } from "@/types/certificado";

export default function PaginaCertificados() {
  const [pagina, setPagina] = useState(1);
  const [tipo, setTipo] = useState<TipoCertificado | "">("");

  // Incluye todos los estados: se pueden certificar colaboradores retirados
  const colaboradores = useColaboradores({ porPagina: 1000 });
  const certificados = useCertificados({ pagina, porPagina: 10, tipo });

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="h-fit xl:col-span-2">
        <CardHeader>
          <CardTitle>Generar certificado</CardTitle>
          <CardDescription>Se genera con los datos actuales del colaborador y queda registrado en el historial.</CardDescription>
        </CardHeader>
        <CardContent>
          {colaboradores.isLoading ? (
            <CargandoPagina mensaje="Cargando colaboradores…" />
          ) : (
            <CertificadoGenerator colaboradores={colaboradores.data?.datos ?? []} permitirTextoAdicional />
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Historial de certificados</CardTitle>
          <div className="w-full sm:w-56">
            <Select
              aria-label="Filtrar por tipo"
              placeholder="Todos los tipos"
              opciones={TIPOS_CERTIFICADO}
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoCertificado | "");
                setPagina(1);
              }}
            />
          </div>
        </CardHeader>
        {certificados.isError ? (
          <EmptyState titulo="Error al cargar el historial" descripcion={mensajeDeError(certificados.error)} />
        ) : (
          <CertificadoTable certificados={certificados.data?.datos ?? []} cargando={certificados.isLoading} />
        )}
        {certificados.data && certificados.data.total > 0 ? (
          <div className="border-t border-borde">
            <Pagination
              pagina={certificados.data.pagina}
              totalPaginas={certificados.data.totalPaginas}
              total={certificados.data.total}
              porPagina={certificados.data.porPagina}
              onCambiar={setPagina}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
