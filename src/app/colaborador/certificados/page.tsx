"use client";

import { Award, CircleCheck } from "lucide-react";
import { useState } from "react";
import { AccionesPdf } from "@/components/portal/acciones-pdf";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/hooks/use-auth";
import { useCertificados, useGenerarCertificado } from "@/hooks/use-certificados";
import { useToast } from "@/hooks/use-toast";
import { mensajeDeError } from "@/lib/api-cliente";
import { fechaLarga } from "@/lib/utils";
import type { Certificado } from "@/types/certificado";

const DIRIGIDO_POR_DEFECTO = "A QUIEN INTERESE";

/**
 * Certificado laboral en un toque: el botón grande lo genera con los datos de la ficha y enseguida
 * aparecen Descargar y Ver. "Dirigido a" es opcional y va plegado para no confundir.
 */
export default function MisCertificados() {
  const { usuario } = useAuth();
  const toast = useToast();
  const generar = useGenerarCertificado();
  const [pagina, setPagina] = useState(1);
  const certificados = useCertificados({ pagina, porPagina: 10 });
  const [dirigidoA, setDirigidoA] = useState("");
  const [nuevo, setNuevo] = useState<Certificado | null>(null);

  const sacar = async () => {
    if (!usuario) return;
    try {
      const certificado = await generar.mutateAsync({
        colaboradorId: usuario.id,
        tipo: "Laboral",
        dirigidoA: dirigidoA.trim() || DIRIGIDO_POR_DEFECTO,
        textoAdicional: "",
      });
      setNuevo(certificado);
    } catch (err) {
      toast.error("No se pudo sacar el certificado", { descripcion: mensajeDeError(err) });
    }
  };

  const anteriores = (certificados.data?.datos ?? []).filter((c) => c.id !== nuevo?.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-tight text-[#5C4520]">Mi certificado laboral</h1>
        <p className="mt-1 text-[17px] text-texto-suave">Dice que trabajas en JMC, tu cargo y desde cuándo. Sirve para el banco, un arriendo o un trámite.</p>
      </div>

      <section className="rounded-[20px] border-2 border-oro-claro bg-oro-suave px-5 py-5">
        {nuevo ? (
          <div aria-live="polite">
            <p className="flex items-center gap-2.5 font-display text-xl font-bold text-palma-800">
              <CircleCheck className="h-7 w-7 shrink-0" aria-hidden />
              Tu certificado está listo
            </p>
            <p className="mt-1 mb-4 text-base text-texto-suave">Dirigido a: {nuevo.contenido?.dirigidoA || DIRIGIDO_POR_DEFECTO}</p>
            <AccionesPdf url={`/api/certificados/${nuevo.id}/pdf`} queEs="el certificado laboral" tono="oro" />
            <button
              type="button"
              onClick={() => setNuevo(null)}
              className="mt-3 h-12 w-full rounded-xl text-base font-semibold text-oro-oscuro hover:bg-white/60"
            >
              Sacar otro certificado
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={sacar}
              disabled={!usuario || generar.isPending}
              className="inline-flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-oro-oscuro px-5 text-xl font-bold text-white shadow-sm transition-colors hover:bg-[#6F5529] disabled:opacity-70"
            >
              {generar.isPending ? <LoadingSpinner className="h-6 w-6 text-white" etiqueta="Preparando" /> : <Award className="h-7 w-7" aria-hidden />}
              {generar.isPending ? "Preparando tu certificado…" : "Sacar mi certificado"}
            </button>

            <details className="group mt-4">
              <summary className="flex h-12 cursor-pointer list-none items-center rounded-xl px-1 text-base font-semibold text-oro-oscuro [&::-webkit-details-marker]:hidden">
                <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden>
                  ›
                </span>
                ¿Te lo pidieron para una entidad en especial?
              </summary>
              <label className="mt-1 block">
                <span className="block text-base text-texto">Escribe para quién es (por ejemplo, el nombre del banco)</span>
                <input
                  value={dirigidoA}
                  onChange={(e) => setDirigidoA(e.target.value)}
                  maxLength={150}
                  placeholder={DIRIGIDO_POR_DEFECTO}
                  className="mt-2 h-14 w-full rounded-xl border-2 border-oro-claro bg-white px-4 text-lg text-texto focus:border-oro-oscuro"
                />
                <span className="mt-1.5 block text-sm text-texto-suave">Si lo dejas vacío, el certificado dice “A quien interese”.</span>
              </label>
            </details>
          </>
        )}
      </section>

      <section aria-labelledby="titulo-anteriores">
        <h2 id="titulo-anteriores" className="mb-3 font-display text-xl font-bold tracking-tight text-texto">
          Certificados que ya sacaste
        </h2>
        {certificados.isError ? (
          <div className="rounded-[20px] bg-white">
            <EmptyState titulo="No pudimos cargar tus certificados" descripcion={mensajeDeError(certificados.error)} />
          </div>
        ) : certificados.isLoading ? (
          <div className="h-36 animate-pulse rounded-[20px] bg-white/70" aria-busy="true" />
        ) : anteriores.length === 0 ? (
          <p className="rounded-[20px] bg-white px-5 py-5 text-base text-texto-suave">
            {nuevo ? "Este es tu primer certificado." : "Aún no has sacado ninguno. Usa el botón de arriba."}
          </p>
        ) : (
          <ul className="space-y-3">
            {anteriores.map((c) => (
              <li key={c.id} className="rounded-[20px] border border-[#D5DFD0] bg-white px-5 py-4">
                <p className="text-lg font-semibold text-texto">{fechaLarga(c.fecha_generacion)}</p>
                <p className="mb-3 text-base text-texto-suave">Dirigido a: {c.contenido?.dirigidoA || DIRIGIDO_POR_DEFECTO}</p>
                <AccionesPdf url={`/api/certificados/${c.id}/pdf`} queEs={`el certificado del ${fechaLarga(c.fecha_generacion)}`} tono="oro" />
              </li>
            ))}
          </ul>
        )}
        {certificados.data && certificados.data.totalPaginas > 1 ? (
          <div className="mt-3 rounded-[20px] bg-white">
            <Pagination
              pagina={certificados.data.pagina}
              totalPaginas={certificados.data.totalPaginas}
              total={certificados.data.total}
              porPagina={certificados.data.porPagina}
              onCambiar={setPagina}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
