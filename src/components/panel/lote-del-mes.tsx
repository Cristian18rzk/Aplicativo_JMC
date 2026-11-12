"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { cn, formatNumber } from "@/lib/utils";
import { NOMBRES_PLANTILLA, PLANTILLAS_DESPRENDIBLE } from "@/types/desprendible";
import type { PalmaLote } from "@/types/resumen";

/*
 * "El lote del mes": cada colaborador activo es una palma vista desde arriba, sembrada en tresbolillo
 * (hileras escalonadas, como se siembra la palma de aceite). Dos lentes sobre el mismo lote:
 * desprendibles del periodo y acceso al portal. Cada palma lleva a la ficha del colaborador.
 */

type Lente = "desprendibles" | "acceso";
type Estado = "listo" | "pendiente" | "temporal" | "bloqueado" | "admin";

/**
 * relleno/trazo de las hojas y color del centro. Lo pendiente es una palma apagada con el centro en
 * Naranja Sol: el lote se va llenando de verde a medida que se completa, sin saturar de naranja.
 */
const ESTILO: Record<Estado, { relleno: string; trazo: string; centro: string }> = {
  listo: { relleno: "#2E6B3F", trazo: "#1F4D2C", centro: "#FFC35C" },
  pendiente: { relleno: "#DCE5D8", trazo: "#A9BBA3", centro: "#E8782A" },
  temporal: { relleno: "#EADBC0", trazo: "#B8955A", centro: "#8A6B37" },
  bloqueado: { relleno: "#F2D3CE", trazo: "#B3362B", centro: "#B3362B" },
  admin: { relleno: "#CFE3D4", trazo: "#7FB08C", centro: "#4F8C60" },
};

const DESCRIPCION: Record<Estado, string> = {
  listo: "",
  pendiente: "",
  temporal: "con PIN temporal",
  bloqueado: "bloqueado",
  admin: "administrador",
};

function estadoDe(p: PalmaLote, lente: Lente): Estado {
  if (lente === "desprendibles") return p.cargado ? "listo" : "pendiente";
  if (p.acceso === "admin") return "admin";
  if (p.acceso === "con_pin") return "listo";
  if (p.acceso === "pin_temporal") return "temporal";
  if (p.acceso === "bloqueado") return "bloqueado";
  return "pendiente";
}

function textoEstado(estado: Estado, lente: Lente): string {
  if (estado === "listo") return lente === "desprendibles" ? "desprendible cargado" : "ya creó su PIN";
  if (estado === "pendiente") return lente === "desprendibles" ? "falta el desprendible" : "aún no entra al portal";
  return DESCRIPCION[estado];
}

// Copa de la palma vista desde arriba: 10 hojas delgadas y curvas, de largo alterno
const HOJA_LARGA = "M0 0C1.7-3.6 1.9-7.6 0.6-12.4C-0.9-7.8-1.3-3.8 0 0Z";
const HOJA_CORTA = "M0 0C1.5-3 1.6-6.2 0.5-10C-0.8-6.4-1.1-3.1 0 0Z";
const ANGULOS = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];
const hoja = (i: number) => (i % 2 ? HOJA_CORTA : HOJA_LARGA);

const PASO_X = 30;
const PASO_Y = 26;

function Plantacion({ palmas, lente, columnas, inicio }: { palmas: PalmaLote[]; lente: Lente; columnas: number; inicio: number }) {
  const router = useRouter();
  const filas = Math.ceil(palmas.length / columnas);
  const usadas = Math.min(columnas, palmas.length);
  const ancho = usadas * PASO_X + (filas > 1 ? PASO_X / 2 : 0);
  const anchoCompleto = columnas * PASO_X + PASO_X / 2;
  const alto = filas * PASO_Y + 8;

  return (
    // Misma escala para todos los grupos: el ancho es proporcional a las columnas usadas
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      className="block h-auto"
      style={{ width: `${(ancho / anchoCompleto) * 100}%`, maxWidth: ancho * 1.6 }}
    >
      {palmas.map((p, i) => {
        const fila = Math.floor(i / columnas);
        const col = i % columnas;
        // Tresbolillo: las filas impares se corren media posición
        const x = PASO_X / 2 + col * PASO_X + (fila % 2 ? PASO_X / 2 : 0);
        const y = PASO_Y / 2 + 4 + fila * PASO_Y;
        const estado = estadoDe(p, lente);
        const { relleno, trazo, centro } = ESTILO[estado];
        const etiqueta = `${p.nombre}: ${textoEstado(estado, lente)}`;
        return (
          <a
            key={p.id}
            href={`/admin/colaboradores/${p.id}`}
            className="palma-lote"
            aria-label={etiqueta}
            onClick={(e) => {
              e.preventDefault();
              router.push(`/admin/colaboradores/${p.id}`);
            }}
          >
            <title>{etiqueta}</title>
            <g transform={`translate(${x} ${y})`}>
              <circle r={13} className="palma-lote-foco" fill="transparent" />
              <g className="palma-lote-copa" style={{ animationDelay: `${(inicio + i) * 18}ms` }}>
                {ANGULOS.map((a, i) => (
                  <path
                    key={a}
                    d={hoja(i)}
                    transform={`rotate(${a + (fila % 2 ? 18 : 0)})`}
                    fill={relleno}
                    stroke={trazo}
                    strokeWidth={0.8}
                    strokeLinejoin="round"
                    className="transition-[fill,stroke] duration-300"
                  />
                ))}
                <circle r={2.6} fill={centro} />
              </g>
            </g>
          </a>
        );
      })}
    </svg>
  );
}

/** 8 palmas por hilera en pantallas angostas (se pueden tocar con el dedo), 16 en las anchas. */
const CONSULTA_ANGOSTA = "(max-width: 639px)";
function suscribirAncho(alCambiar: () => void) {
  const mq = window.matchMedia(CONSULTA_ANGOSTA);
  mq.addEventListener("change", alCambiar);
  return () => mq.removeEventListener("change", alCambiar);
}

export function LoteDelMes({ lote, mes }: { lote: PalmaLote[]; mes: string }) {
  const [lente, setLente] = useState<Lente>("desprendibles");
  const angosta = useSyncExternalStore(
    suscribirAncho,
    () => window.matchMedia(CONSULTA_ANGOSTA).matches,
    () => false,
  );
  const columnas = angosta ? 8 : 16;
  const conCuenta = lote.filter((p) => p.acceso !== "admin");
  const listos =
    lente === "desprendibles" ? lote.filter((p) => p.cargado).length : conCuenta.filter((p) => p.acceso === "con_pin").length;
  const total = lente === "desprendibles" ? lote.length : conCuenta.length;

  const leyenda: [Estado, string][] =
    lente === "desprendibles"
      ? [
          ["listo", "Desprendible cargado"],
          ["pendiente", "Falta el desprendible"],
        ]
      : [
          ["listo", "Ya creó su PIN"],
          ["pendiente", "Aún no entra"],
          ["temporal", "PIN temporal"],
          ["bloqueado", "Bloqueado"],
        ];

  // Colaboradores primero (el grupo grande); `desde` encadena la animación de brote entre grupos
  const grupos = PLANTILLAS_DESPRENDIBLE.map((plantilla) => ({
    plantilla,
    palmas: lote.filter((p) => p.plantilla === plantilla),
  }))
    .filter((g) => g.palmas.length > 0)
    .sort((a, b) => b.palmas.length - a.palmas.length)
    .map((g, i, todos) => ({ ...g, desde: todos.slice(0, i).reduce((s, x) => s + x.palmas.length, 0) }));

  return (
    <section aria-labelledby="titulo-lote" className="rounded-[20px] border border-[#D5DFD0] bg-white">
      <div className="flex flex-col gap-4 border-b border-[#E3EAE0] px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 id="titulo-lote" className="font-display text-lg font-bold tracking-tight text-palma-900">
            El lote de {mes}
          </h3>
          <p className="mt-0.5 max-w-xl text-sm text-texto-suave">
            Cada palma es un colaborador activo. Selecciónela para abrir su ficha.
          </p>
        </div>
        <div role="radiogroup" aria-label="Qué mostrar en el lote" className="inline-flex shrink-0 rounded-xl bg-[#EEF3EC] p-1">
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

      <div className="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_200px]">
        <div className="space-y-5">
          {grupos.map(({ plantilla, palmas, desde }) => {
            return (
              <div key={plantilla}>
                <p className="mb-1.5 text-sm font-semibold text-palma-900">
                  {NOMBRES_PLANTILLA[plantilla]} <span className="font-normal text-texto-suave">({palmas.length})</span>
                </p>
                <Plantacion palmas={palmas} lente={lente} columnas={columnas} inicio={desde} />
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-5 border-t border-[#E3EAE0] pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
          <p className="font-display text-palma-900">
            <span className="block text-5xl leading-none font-extrabold tracking-tight tabular-nums">{formatNumber(listos)}</span>
            <span className="mt-1 block text-sm font-medium text-texto-suave">
              de {formatNumber(total)} {lente === "desprendibles" ? "ya tienen su desprendible" : "ya crearon su PIN"}
            </span>
          </p>
          <ul className="space-y-2 text-sm text-texto">
            {leyenda.map(([estado, texto]) => (
              <li key={estado} className="flex items-center gap-2">
                <svg viewBox="-13 -13 26 26" className="h-5 w-5 shrink-0" aria-hidden>
                  {ANGULOS.map((a, i) => (
                    <path key={a} d={hoja(i)} transform={`rotate(${a})`} fill={ESTILO[estado].relleno} stroke={ESTILO[estado].trazo} strokeWidth={1} />
                  ))}
                  <circle r={2.8} fill={ESTILO[estado].centro} />
                </svg>
                {texto}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
