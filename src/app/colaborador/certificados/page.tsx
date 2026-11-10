"use client";

import { useState } from "react";
import { CertificadoGenerator } from "@/components/certificados/certificado-generator";
import { CertificadoTable } from "@/components/certificados/certificado-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CargandoPagina } from "@/components/ui/loading-spinner";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/hooks/use-auth";
import { useCertificados } from "@/hooks/use-certificados";
import { mensajeDeError } from "@/lib/api-cliente";

export default function MisCertificados() {
  const { usuario } = useAuth();
  const [pagina, setPagina] = useState(1);
  const certificados = useCertificados({ pagina, porPagina: 10 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-texto">Mis certificados</h1>
        <p className="text-sm text-texto-suave">Genere certificados con sus datos laborales actuales y descárguelos en PDF.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitar certificado</CardTitle>
          <CardDescription>El documento se genera al instante y queda guardado en su historial.</CardDescription>
        </CardHeader>
        <CardContent>
          {usuario ? <CertificadoGenerator colaboradorFijoId={usuario.id} /> : <CargandoPagina />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        {certificados.isError ? (
          <EmptyState titulo="Error al cargar" descripcion={mensajeDeError(certificados.error)} />
        ) : (
          <CertificadoTable
            certificados={certificados.data?.datos ?? []}
            cargando={certificados.isLoading}
            mostrarColaborador={false}
          />
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
