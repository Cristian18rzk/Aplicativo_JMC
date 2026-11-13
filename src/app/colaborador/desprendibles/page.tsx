"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import { AccionesPdf, nombrePeriodo } from "@/components/portal/acciones-pdf";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { useMisDesprendibles } from "@/hooks/use-desprendibles";
import { mensajeDeError } from "@/lib/api-cliente";
import { formatDate, formatPeriodo } from "@/lib/utils";

/** Un desprendible por tarjeta, del más reciente al más antiguo, con botones grandes de Descargar y Ver. */
export default function MisDesprendibles() {
  const [pagina, setPagina] = useState(1);
  const { data, isLoading, isError, error } = useMisDesprendibles({ pagina, porPagina: 12 });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-tight text-palma-900">Mis desprendibles de pago</h1>
        <p className="mt-1 text-[17px] text-texto-suave">Toca Descargar para guardar el pago en tu celular.</p>
      </div>

      {isError ? (
        <div className="rounded-[20px] bg-white">
          <EmptyState titulo="No pudimos cargar tus desprendibles" descripcion={mensajeDeError(error)} />
        </div>
      ) : isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando tus desprendibles">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-[20px] bg-white/70" />
          ))}
        </div>
      ) : !data?.datos.length ? (
        <div className="rounded-[20px] bg-white">
          <EmptyState
            icono={FileText}
            titulo="Todavía no tienes desprendibles"
            descripcion="Cuando la empresa suba tu pago, aparece aquí para que lo descargues."
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {data.datos.map((d, i) => {
            const reciente = pagina === 1 && i === 0;
            return (
              <li
                key={d.id}
                className={
                  reciente
                    ? "rounded-[20px] border-2 border-palma-300 bg-white px-5 py-4"
                    : "rounded-[20px] border border-[#D5DFD0] bg-white px-5 py-4"
                }
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-bold tracking-tight text-texto">{formatPeriodo(d.periodo)}</h2>
                    <p className="text-base text-texto-suave">{nombrePeriodo(d.tipo_periodo)}</p>
                  </div>
                  {reciente ? (
                    <span className="shrink-0 rounded-full bg-palma-100 px-3 py-1 text-sm font-semibold text-palma-800">El más nuevo</span>
                  ) : (
                    <span className="shrink-0 pt-1 text-sm text-texto-suave">Subido el {formatDate(d.fecha_carga)}</span>
                  )}
                </div>
                {d.tieneArchivo ? (
                  <AccionesPdf url={`/api/desprendibles/${d.id}/pdf`} queEs={`el desprendible de ${formatPeriodo(d.periodo)}`} />
                ) : (
                  <p className="rounded-xl bg-sol-suave px-4 py-3 text-base text-sol-oscuro">
                    El archivo se está preparando. Vuelve a mirar más tarde.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {data && data.totalPaginas > 1 ? (
        <div className="rounded-[20px] bg-white">
          <Pagination
            pagina={data.pagina}
            totalPaginas={data.totalPaginas}
            total={data.total}
            porPagina={data.porPagina}
            onCambiar={setPagina}
          />
        </div>
      ) : null}
    </div>
  );
}
