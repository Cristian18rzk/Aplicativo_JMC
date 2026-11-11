"use client";

import { useState } from "react";
import { CertificadoGenerator } from "@/components/certificados/certificado-generator";
import { CertificadoTable } from "@/components/certificados/certificado-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CargandoPagina } from "@/components/ui/loading-spinner";
import { Pagination } from "@/components/ui/pagination";
import { useCertificados } from "@/hooks/use-certificados";
import { useColaboradores } from "@/hooks/use-colaboradores";
import { mensajeDeError } from "@/lib/api-cliente";

export default function PaginaCertificados() {
  const [pagina, setPagina] = useState(1);

  // Incluye todos los estados: se pueden certificar colaboradores retirados
  const colaboradores = useColaboradores({ porPagina: 1000 });
  const certificados = useCertificados({ pagina, porPagina: 10 });

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
        <CardHeader>
          <CardTitle>Historial de certificados laborales</CardTitle>
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
