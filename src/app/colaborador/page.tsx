"use client";

import { Award, Download, ExternalLink, FileText, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ColaboradorCard } from "@/components/colaboradores/colaborador-card";
import { clasesBoton } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CargandoPagina } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { useColaborador } from "@/hooks/use-colaboradores";
import { useMisDesprendibles } from "@/hooks/use-desprendibles";
import { mensajeDeError } from "@/lib/api-cliente";
import { formatDate, formatPeriodo } from "@/lib/utils";

function AccesoRapido({ href, icono: Icono, titulo, descripcion }: { href: string; icono: LucideIcon; titulo: string; descripcion: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-borde bg-white p-4 transition-all hover:border-acento hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-acento-suave">
        <Icono className="h-5 w-5 text-acento" aria-hidden />
      </div>
      <div>
        <p className="font-semibold text-texto">{titulo}</p>
        <p className="text-sm text-texto-suave">{descripcion}</p>
      </div>
    </Link>
  );
}

export default function DashboardColaborador() {
  const { usuario } = useAuth();
  const { data: colaborador, isLoading, isError, error } = useColaborador(usuario?.id);
  const ultimos = useMisDesprendibles({ porPagina: 1 });
  const ultimo = ultimos.data?.datos[0];

  if (isLoading || !usuario) return <CargandoPagina mensaje="Cargando su información…" />;
  if (isError || !colaborador) {
    return <EmptyState titulo="No fue posible cargar su información" descripcion={mensajeDeError(error)} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-texto">Hola, {colaborador.nombres.split(" ")[0]}</h1>
        <p className="text-sm text-texto-suave">Aquí encuentra sus datos y documentos laborales.</p>
      </div>

      <ColaboradorCard colaborador={colaborador} />

      <div className="grid gap-4 sm:grid-cols-2">
        <AccesoRapido href="/colaborador/desprendibles" icono={FileText} titulo="Mis desprendibles" descripcion="Consulte y descargue sus comprobantes de pago" />
        <AccesoRapido href="/colaborador/certificados" icono={Award} titulo="Mis certificados" descripcion="Genere y descargue certificados laborales" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Último desprendible</CardTitle>
        </CardHeader>
        <CardContent>
          {ultimos.isLoading ? (
            <div className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ) : ultimo ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-lg font-bold tracking-tight text-texto">
                  {formatPeriodo(ultimo.periodo)} · {ultimo.tipo_periodo}
                </p>
                <p className="text-sm text-texto-suave">Publicado el {formatDate(ultimo.fecha_carga)}</p>
              </div>
              {ultimo.tieneArchivo ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a
                    href={`/api/desprendibles/${ultimo.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={clasesBoton("secondary")}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    Ver
                  </a>
                  <a href={`/api/desprendibles/${ultimo.id}/pdf?descargar=1`} className={clasesBoton("primary")}>
                    <Download className="h-4 w-4" aria-hidden />
                    Descargar PDF
                  </a>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-texto-suave">Aún no tiene desprendibles registrados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
