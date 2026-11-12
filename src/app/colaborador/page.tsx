"use client";

import { Award, Download, ExternalLink, FileText, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { FranjaPlantacion } from "@/components/auth/escena-amanecer";
import { ColaboradorCard } from "@/components/colaboradores/colaborador-card";
import { AnioDesprendibles } from "@/components/desprendibles/anio-desprendibles";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CargandoPagina } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { useColaborador } from "@/hooks/use-colaboradores";
import { useMisDesprendibles } from "@/hooks/use-desprendibles";
import { mensajeDeError } from "@/lib/api-cliente";
import { cn, formatDate, formatPeriodo } from "@/lib/utils";

const sinSuscripcion = () => () => undefined;
function saludo(): string {
  const hora = new Date().getHours();
  return hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
}

function AccesoRapido({
  href,
  icono: Icono,
  titulo,
  descripcion,
  tono,
}: {
  href: string;
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  tono: "palma" | "oro";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-4 rounded-2xl border p-4 transition-colors",
        tono === "palma" ? "border-palma-200 bg-palma-50 hover:bg-palma-100" : "border-[#EADBC0] bg-oro-suave hover:bg-[#EFE4D0]",
      )}
    >
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white",
          tono === "palma" ? "bg-acento" : "bg-oro-oscuro",
        )}
      >
        <Icono className="h-6 w-6" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display font-semibold text-texto">{titulo}</p>
        <p className="text-sm text-texto-suave">{descripcion}</p>
      </div>
    </Link>
  );
}

export default function InicioColaborador() {
  const { usuario } = useAuth();
  const texto = useSyncExternalStore(sinSuscripcion, saludo, () => "Hola");
  const { data: colaborador, isLoading, isError, error } = useColaborador(usuario?.id);
  const todos = useMisDesprendibles({ porPagina: 100 });
  const ultimo = todos.data?.datos[0];

  if (isLoading || !usuario) return <CargandoPagina mensaje="Cargando su información…" />;
  if (isError || !colaborador) {
    return <EmptyState titulo="No fue posible cargar su información" descripcion={mensajeDeError(error)} />;
  }

  return (
    <div className="space-y-5">
      {/* Bienvenida con el último desprendible */}
      <section className="relative overflow-hidden rounded-[20px] bg-[#12301C] text-white">
        <FranjaPlantacion className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" />
        <div className="relative grid gap-5 px-5 pt-6 pb-20 sm:px-7 md:grid-cols-[1fr_minmax(0,320px)] md:items-center">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#FFF8EC] sm:text-4xl">
              {texto}, {colaborador.nombres.split(" ")[0]}
            </h1>
            <p className="mt-2 text-[15px] text-palma-100/90">Aquí encuentras tus desprendibles de pago y tus certificados laborales.</p>
          </div>

          <div className="rounded-2xl bg-sol-suave p-4 text-texto">
            <p className="text-sm font-semibold text-sol-oscuro">Tu último desprendible</p>
            {todos.isLoading ? (
              <div className="mt-2 h-16 animate-pulse rounded-lg bg-white/70" />
            ) : ultimo ? (
              <>
                <p className="mt-1 font-display text-xl font-bold tracking-tight">{formatPeriodo(ultimo.periodo)}</p>
                <p className="text-sm text-texto-suave">
                  {ultimo.tipo_periodo}, publicado el {formatDate(ultimo.fecha_carga)}
                </p>
                {ultimo.tieneArchivo ? (
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`/api/desprendibles/${ultimo.id}/pdf?descargar=1`}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sol px-3 text-sm font-semibold text-[#2B1606] hover:bg-sol-claro"
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      Descargar
                    </a>
                    <a
                      href={`/api/desprendibles/${ultimo.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#F6CFA8] bg-white px-3 text-sm font-semibold text-sol-oscuro hover:bg-sol-suave"
                      aria-label="Ver el desprendible en otra pestaña"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      Ver
                    </a>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-texto-suave">El archivo está en preparación.</p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-texto-suave">Aún no tienes desprendibles publicados.</p>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <AccesoRapido
          href="/colaborador/desprendibles"
          icono={FileText}
          titulo="Mis desprendibles"
          descripcion="Todos tus comprobantes de pago"
          tono="palma"
        />
        <AccesoRapido
          href="/colaborador/certificados"
          icono={Award}
          titulo="Mis certificados"
          descripcion="Genera tu certificado laboral"
          tono="oro"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tu año en desprendibles</CardTitle>
        </CardHeader>
        <div className="px-5 py-4">
          <AnioDesprendibles desprendibles={todos.data?.datos ?? []} fechaIngreso={colaborador.fecha_ingreso} />
        </div>
      </Card>

      <ColaboradorCard colaborador={colaborador} />
    </div>
  );
}
