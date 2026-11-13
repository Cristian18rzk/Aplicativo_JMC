"use client";

import { Award, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { FranjaPlantacion } from "@/components/auth/escena-amanecer";
import { ColaboradorCard } from "@/components/colaboradores/colaborador-card";
import { AnioDesprendibles } from "@/components/desprendibles/anio-desprendibles";
import { AccionesPdf, nombrePeriodo } from "@/components/portal/acciones-pdf";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CargandoPagina } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { useColaborador } from "@/hooks/use-colaboradores";
import { useMisDesprendibles } from "@/hooks/use-desprendibles";
import { mensajeDeError } from "@/lib/api-cliente";
import { formatPeriodo } from "@/lib/utils";

const sinSuscripcion = () => () => undefined;
function saludo(): string {
  const hora = new Date().getHours();
  return hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
}

export default function InicioColaborador() {
  const { usuario } = useAuth();
  const texto = useSyncExternalStore(sinSuscripcion, saludo, () => "Hola");
  const { data: colaborador, isLoading, isError, error } = useColaborador(usuario?.id);
  const todos = useMisDesprendibles({ porPagina: 100 });
  const ultimo = todos.data?.datos[0];

  if (isLoading || !usuario) return <CargandoPagina mensaje="Cargando tu información…" />;
  if (isError || !colaborador) {
    return <EmptyState titulo="No pudimos cargar tu información" descripcion={mensajeDeError(error)} />;
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[20px] bg-[#12301C] text-white">
        <FranjaPlantacion className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full" />
        <div className="relative px-5 pt-5 pb-14 sm:px-7">
          <h1 className="font-display text-[1.75rem] leading-tight font-extrabold tracking-tight text-[#FFF8EC] sm:text-4xl">
            {texto}, {colaborador.nombres.split(" ")[0]}
          </h1>
          <p className="mt-1.5 text-[17px] text-palma-100">¿Qué necesitas hoy?</p>
        </div>
      </section>

      {/* Puerta 1: el pago. Descarga el último desprendible con un solo toque. */}
      <section aria-labelledby="puerta-pago" className="overflow-hidden rounded-[20px] border-2 border-palma-300 bg-white">
        <div className="flex items-start gap-4 bg-palma-50 px-5 py-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-acento text-white">
            <FileText className="h-9 w-9" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="puerta-pago" className="font-display text-2xl font-bold tracking-tight text-palma-900">
              Mi desprendible de pago
            </h2>
            {todos.isLoading ? (
              <span className="mt-2 block h-6 w-44 animate-pulse rounded bg-palma-100" />
            ) : ultimo ? (
              <p className="mt-1 text-[17px] text-texto">
                El último es de <strong className="font-bold">{formatPeriodo(ultimo.periodo)}</strong>
                <span className="block text-base text-texto-suave">{nombrePeriodo(ultimo.tipo_periodo)}</span>
              </p>
            ) : (
              <p className="mt-1 text-[17px] text-texto-suave">Todavía no hay desprendibles. Cuando la empresa los suba, aparecen aquí.</p>
            )}
          </div>
        </div>
        <div className="space-y-3 px-5 py-4">
          {ultimo?.tieneArchivo ? (
            <AccionesPdf
              url={`/api/desprendibles/${ultimo.id}/pdf`}
              queEs={`el desprendible de ${formatPeriodo(ultimo.periodo)}`}
            />
          ) : ultimo ? (
            <p className="rounded-xl bg-sol-suave px-4 py-3 text-base text-sol-oscuro">
              El archivo de este pago se está preparando. Vuelve a mirar más tarde.
            </p>
          ) : null}
          <Link
            href="/colaborador/desprendibles"
            className="flex h-12 items-center justify-between rounded-xl px-1 text-base font-semibold text-palma-800 hover:bg-palma-50"
          >
            Ver todos mis desprendibles
            <ChevronRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Puerta 2: el certificado laboral */}
      <Link
        href="/colaborador/certificados"
        className="flex items-center gap-4 rounded-[20px] border-2 border-oro-claro bg-oro-suave px-5 py-5 transition-colors hover:bg-[#EFE4D0]"
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-oro-oscuro text-white">
          <Award className="h-9 w-9" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-2xl font-bold tracking-tight text-[#5C4520]">Mi certificado laboral</span>
          <span className="mt-1 block text-[17px] text-texto">Constancia de que trabajas en JMC. Sale al instante.</span>
        </span>
        <ChevronRight className="h-8 w-8 shrink-0 text-oro-oscuro" aria-hidden />
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Mis pagos de este año</CardTitle>
        </CardHeader>
        <div className="px-5 py-4">
          <AnioDesprendibles desprendibles={todos.data?.datos ?? []} fechaIngreso={colaborador.fecha_ingreso} />
        </div>
      </Card>

      <ColaboradorCard colaborador={colaborador} />
    </div>
  );
}
