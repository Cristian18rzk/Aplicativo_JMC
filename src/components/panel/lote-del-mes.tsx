"use client";

import { CircleCheck, FileUp, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn, formatNumber } from "@/lib/utils";
import { NOMBRES_PLANTILLA, PLANTILLAS_DESPRENDIBLE } from "@/types/desprendible";
import type { PalmaLote } from "@/types/resumen";

/*
 * Planilla del mes: todos los colaboradores activos con su situación en el periodo, con nombre visible.
 * Dos lentes sobre la misma planilla (desprendibles y acceso al portal), filtro por situación y búsqueda.
 * Arriba, una frase dice cómo va el mes y qué hacer; cada grupo muestra "x de y" con una barra fina.
 */

type Lente = "desprendibles" | "acceso";
type Estado = "listo" | "pendiente" | "temporal" | "bloqueado" | "admin";
type Filtro = "faltan" | "listos" | "todos";

const COLOR: Record<Estado, string> = {
  listo: "#2E6B3F",
  temporal: "#B8955A",
  bloqueado: "#B3362B",
  admin: "#7FB08C",
  pendiente: "#DCE5D8",
};

/** Etiqueta junto al nombre solo para las situaciones que piden atención especial. */
const ETIQUETA: Partial<Record<Estado, { texto: string; clase: string }>> = {
  temporal: { texto: "PIN temporal", clase: "bg-oro-suave text-oro-oscuro" },
  bloqueado: { texto: "Bloqueado", clase: "bg-[#F8E1DE] text-error" },
  admin: { texto: "Administrador", clase: "bg-palma-100 text-palma-700" },
};

function estadoDe(p: PalmaLote, lente: Lente): Estado {
  if (lente === "desprendibles") return p.cargado ? "listo" : "pendiente";
  if (p.acceso === "admin") return "admin";
  if (p.acceso === "con_pin") return "listo";
  if (p.acceso === "pin_temporal") return "temporal";
  if (p.acceso === "bloqueado") return "bloqueado";
  return "pendiente";
}

/** En la lente de acceso, "faltan" incluye a quien aún no tiene acceso normal (sin PIN, temporal o bloqueado). */
const falta = (e: Estado) => e === "pendiente" || e === "temporal" || e === "bloqueado";
const cuenta = (e: Estado) => e !== "admin";

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function LoteDelMes({ lote, mes }: { lote: PalmaLote[]; mes: string }) {
  const [lente, setLente] = useState<Lente>("desprendibles");
  const [filtro, setFiltro] = useState<Filtro>("faltan");
  const [busqueda, setBusqueda] = useState("");

  const conEstado = useMemo(() => lote.map((p) => ({ ...p, estado: estadoDe(p, lente) })), [lote, lente]);
  const contables = conEstado.filter((p) => cuenta(p.estado));
  const listos = contables.filter((p) => p.estado === "listo").length;
  const faltan = contables.filter((p) => falta(p.estado)).length;
  const total = contables.length;

  const grupos = PLANTILLAS_DESPRENDIBLE.map((plantilla) => {
    const personas = conEstado.filter((p) => p.plantilla === plantilla);
    const cuentan = personas.filter((p) => cuenta(p.estado));
    return {
      plantilla,
      personas,
      listos: cuentan.filter((p) => p.estado === "listo").length,
      total: cuentan.length,
    };
  })
    .filter((g) => g.personas.length > 0)
    .sort((a, b) => b.personas.length - a.personas.length);

  const consulta = normalizar(busqueda.trim());
  const visibles = (personas: typeof conEstado) =>
    personas.filter(
      (p) =>
        (filtro === "todos" || (filtro === "faltan" ? falta(p.estado) : p.estado === "listo")) &&
        (!consulta || normalizar(p.nombre).includes(consulta)),
    );
  const hayVisibles = grupos.some((g) => visibles(g.personas).length > 0);

  const completo = total > 0 && faltan === 0;
  const resumen: { titulo: string; detalle: string; accion?: { href: string; texto: string } } =
    lente === "desprendibles"
      ? listos === 0
        ? {
            titulo: `Aún no hay desprendibles de ${mes}`,
            detalle: "Cargue el PDF del programa de nómina y el aplicativo le entrega a cada persona el suyo.",
            accion: { href: "/admin/desprendibles/cargar", texto: "Cargar desprendibles" },
          }
        : completo
          ? { titulo: `Todos tienen su desprendible de ${mes}`, detalle: `${formatNumber(total)} de ${formatNumber(total)} personas.` }
          : {
              titulo: `Faltan ${formatNumber(faltan)} desprendibles de ${mes}`,
              detalle: `${formatNumber(listos)} de ${formatNumber(total)} personas ya tienen el suyo.`,
              accion: { href: "/admin/desprendibles/cargar", texto: "Cargar los que faltan" },
            }
      : completo
        ? { titulo: "Todos ya entran al portal", detalle: `${formatNumber(total)} de ${formatNumber(total)} personas crearon su PIN.` }
        : {
            titulo: `Faltan ${formatNumber(faltan)} personas por entrar al portal`,
            detalle: "Genere un PIN temporal desde la ficha de cada persona y entrégueselo; con él crean su propio PIN.",
          };
  const vacio = consulta
    ? `Nadie coincide con «${busqueda.trim()}» en esta vista.`
    : filtro === "faltan"
      ? lente === "desprendibles"
        ? `Todos tienen su desprendible de ${mes}.`
        : "Todos ya crearon su PIN."
      : lente === "desprendibles"
        ? `Aún no hay desprendibles cargados en ${mes}.`
        : "Nadie ha creado su PIN todavía.";

  const filtros: [Filtro, string, number][] = [
    ["faltan", "Faltan", faltan],
    ["listos", "Listos", listos],
    ["todos", "Todos", lote.length],
  ];

  return (
    <section aria-labelledby="titulo-lote" className="rounded-[20px] border border-[#D5DFD0] bg-white">
      {/* Encabezado y lente */}
      <div className="flex flex-col gap-4 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="titulo-lote" className="font-display text-lg font-bold tracking-tight text-palma-900">
            Planilla de {mes}
          </h3>
        </div>
        <div role="radiogroup" aria-label="Qué revisar en la planilla" className="inline-flex shrink-0 self-start rounded-xl bg-[#EEF3EC] p-1">
          {(
            [
              ["desprendibles", "Desprendibles"],
              ["acceso", "Acceso al portal"],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={lente === valor}
              onClick={() => setLente(valor)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                lente === valor ? "bg-white text-palma-900 shadow-sm" : "text-texto-suave hover:text-palma-900",
              )}
            >
              {texto}
            </button>
          ))}
        </div>
      </div>

      {/* Cómo va el mes, en palabras, y el avance de cada grupo */}
      <div className="grid gap-5 px-5 pt-4 pb-5 md:grid-cols-[minmax(0,1fr)_minmax(0,380px)] md:items-center">
        <div aria-live="polite">
          <p className="flex items-center gap-2 font-display text-[1.375rem] leading-snug font-bold tracking-tight text-palma-900">
            {completo ? <CircleCheck className="h-6 w-6 shrink-0 text-acento" aria-hidden /> : null}
            {resumen.titulo}
          </p>
          <p className="mt-1 max-w-md text-sm text-texto-suave">{resumen.detalle}</p>
          {resumen.accion ? (
            <Link
              href={resumen.accion.href}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-sol px-4 text-sm font-semibold text-[#2B1606] hover:bg-sol-claro"
            >
              <FileUp className="h-4 w-4" aria-hidden />
              {resumen.accion.texto}
            </Link>
          ) : null}
        </div>

        <ul className="space-y-3.5 rounded-2xl bg-[#F4F7F2] px-4 py-4">
          {grupos.map((g) => {
            const pendientes = g.total - g.listos;
            const porcentaje = g.total ? Math.round((g.listos / g.total) * 100) : 0;
            return (
              <li key={g.plantilla}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-texto">{NOMBRES_PLANTILLA[g.plantilla]}</span>
                  <span className="text-texto-suave tabular-nums">
                    <span className="font-semibold text-palma-900">{formatNumber(g.listos)}</span> de {formatNumber(g.total)}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#DCE5D8]"
                  role="progressbar"
                  aria-label={NOMBRES_PLANTILLA[g.plantilla]}
                  aria-valuemin={0}
                  aria-valuemax={g.total}
                  aria-valuenow={g.listos}
                >
                  <div className="h-full rounded-full bg-acento transition-[width] duration-500" style={{ width: `${porcentaje}%` }} />
                </div>
                <p className={cn("mt-1 text-xs", pendientes ? "text-texto-suave" : "font-medium text-acento")}>
                  {pendientes ? `Faltan ${formatNumber(pendientes)}` : "Completo"}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Filtro y búsqueda */}
      <div className="flex flex-col gap-3 border-y border-[#E3EAE0] bg-[#F7FAF6] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="radiogroup" aria-label="Filtrar colaboradores" className="flex flex-wrap gap-1.5">
          {filtros.map(([valor, texto, n]) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={filtro === valor}
              onClick={() => setFiltro(valor)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors",
                filtro === valor
                  ? "border-palma-900 bg-palma-900 text-white"
                  : "border-[#D5DFD0] bg-white text-texto hover:border-palma-400",
              )}
            >
              {texto}
              <span className={cn("tabular-nums", filtro === valor ? "text-palma-200" : "text-texto-suave")}>{formatNumber(n)}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative block w-full sm:w-60">
            <span className="sr-only">Buscar por nombre</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-texto-suave" aria-hidden />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre"
              className="h-9 w-full rounded-lg border border-[#D5DFD0] bg-white pr-3 pl-9 text-sm text-texto focus:border-acento"
            />
          </label>
        </div>
      </div>

      {/* Nombres */}
      <div className="max-h-[440px] overflow-y-auto px-5 py-4">
        {!hayVisibles ? (
          <p className="rounded-xl bg-palma-50 px-4 py-6 text-center text-sm font-medium text-acento">{vacio}</p>
        ) : (
          <div className="space-y-5">
            {grupos.map((g) => {
              const personas = visibles(g.personas);
              if (!personas.length) return null;
              return (
                <div key={g.plantilla}>
                  {grupos.length > 1 ? (
                    <h4 className="mb-2 text-sm font-semibold text-texto-suave">
                      {NOMBRES_PLANTILLA[g.plantilla]} <span className="font-normal tabular-nums">({personas.length})</span>
                    </h4>
                  ) : null}
                  <ul className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 xl:grid-cols-3">
                    {personas.map((p) => {
                      const etiqueta = ETIQUETA[p.estado];
                      return (
                        <li key={p.id} className="min-w-0 border-b border-[#EEF2EC]">
                          <Link
                            href={`/admin/colaboradores/${p.id}`}
                            title={`Abrir la ficha de ${p.nombre}`}
                            className="group flex items-center gap-2.5 rounded-md px-1.5 py-2 hover:bg-[#F3F7F1]"
                          >
                            <span
                              className={cn(
                                "h-2.5 w-2.5 shrink-0 rounded-full",
                                p.estado === "pendiente" && "border-2 border-sol bg-white",
                              )}
                              style={p.estado === "pendiente" ? undefined : { background: COLOR[p.estado] }}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate text-sm text-texto group-hover:text-palma-900">{p.nombre}</span>
                            {etiqueta ? (
                              <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold", etiqueta.clase)}>
                                {etiqueta.texto}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
