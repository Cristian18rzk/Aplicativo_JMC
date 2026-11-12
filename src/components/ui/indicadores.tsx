import { cn, formatNumber } from "@/lib/utils";

/*
 * Indicadores del sistema JMC. Los colores tienen un papel fijo en toda la aplicación:
 *   palma → completo / estructura · sol → pendiente / requiere atención · oro → destacado.
 */

export type Tono = "palma" | "sol" | "oro" | "claro";

const TRAZO: Record<Tono, string> = {
  palma: "stroke-acento",
  sol: "stroke-sol",
  oro: "stroke-oro",
  claro: "stroke-[#FFC35C]",
};
const PISTA: Record<Tono, string> = {
  palma: "stroke-palma-100",
  sol: "stroke-[#F8DCC4]",
  oro: "stroke-[#EADBC0]",
  claro: "stroke-white/15",
};

/** Porcentaje entero seguro (0 si no hay total). */
export const porcentaje = (valor: number, total: number) => (total > 0 ? Math.round((valor / total) * 100) : 0);

/** Anillo de avance con el porcentaje en el centro. */
export function AnilloAvance({
  valor,
  total,
  tono = "palma",
  tamano = 72,
  grosor = 8,
  etiqueta,
  className,
}: {
  valor: number;
  total: number;
  tono?: Tono;
  tamano?: number;
  grosor?: number;
  /** Texto para lectores de pantalla. */
  etiqueta: string;
  className?: string;
}) {
  const radio = (tamano - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const pct = porcentaje(valor, total);
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: tamano, height: tamano }}>
      <svg
        width={tamano}
        height={tamano}
        viewBox={`0 0 ${tamano} ${tamano}`}
        className="-rotate-90"
        role="img"
        aria-label={`${etiqueta}: ${pct}%`}
      >
        <circle cx={tamano / 2} cy={tamano / 2} r={radio} fill="none" strokeWidth={grosor} className={PISTA[tono]} />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="none"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - pct / 100)}
          className={cn(TRAZO[tono], "transition-[stroke-dashoffset] duration-700 ease-out")}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-display text-sm font-bold tabular-nums",
          tono === "claro" ? "text-white" : "text-texto",
        )}
        aria-hidden
      >
        {pct}%
      </span>
    </div>
  );
}

/** Barra horizontal de avance simple. */
export function BarraAvance({ valor, total, tono = "palma", className }: { valor: number; total: number; tono?: Tono; className?: string }) {
  const RELLENO: Record<Tono, string> = { palma: "bg-acento", sol: "bg-sol", oro: "bg-oro", claro: "bg-[#FFC35C]" };
  const FONDO: Record<Tono, string> = { palma: "bg-palma-100", sol: "bg-[#F8DCC4]", oro: "bg-[#EADBC0]", claro: "bg-white/15" };
  return (
    <div className={cn("h-2 overflow-hidden rounded-full", FONDO[tono], className)} aria-hidden>
      <div className={cn("h-full rounded-full transition-[width] duration-700", RELLENO[tono])} style={{ width: `${porcentaje(valor, total)}%` }} />
    </div>
  );
}

export interface Segmento {
  etiqueta: string;
  valor: number;
  /** Clase de fondo del segmento (bg-…). */
  clase: string;
}

/** Barra dividida en segmentos con su leyenda (p. ej. colaboradores por área). */
export function BarraSegmentada({ segmentos, claro = false }: { segmentos: Segmento[]; claro?: boolean }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0);
  return (
    <div>
      <div className={cn("flex h-2.5 gap-0.5 overflow-hidden rounded-full", claro ? "bg-white/10" : "bg-slate-100")} aria-hidden>
        {segmentos.map((s) =>
          s.valor > 0 ? <div key={s.etiqueta} className={cn("h-full", s.clase)} style={{ width: `${(s.valor / total) * 100}%` }} /> : null,
        )}
      </div>
      <ul className={cn("mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs", claro ? "text-white/85" : "text-texto-suave")}>
        {segmentos.map((s) => (
          <li key={s.etiqueta} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", s.clase)} aria-hidden />
            {s.etiqueta} <span className={cn("font-semibold tabular-nums", claro ? "text-white" : "text-texto")}>{formatNumber(s.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Gráfico de barras verticales compacto (p. ej. desprendibles por periodo). */
export function BarrasHistorial({
  datos,
  descripcion,
}: {
  datos: { etiqueta: string; valor: number; destacado?: boolean }[];
  descripcion: string;
}) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <figure>
      <div className="flex h-36 items-end gap-2 sm:gap-3" role="img" aria-label={descripcion}>
        {datos.map((d) => (
          <div key={d.etiqueta} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className={cn("text-xs font-semibold tabular-nums", d.destacado ? "text-sol-oscuro" : "text-texto-suave")}>
              {formatNumber(d.valor)}
            </span>
            <div
              className={cn(
                "w-full max-w-10 rounded-t-md transition-[height] duration-700",
                d.destacado ? "bg-[linear-gradient(180deg,#F2A042,#E8782A)]" : "bg-[linear-gradient(180deg,#4F8C60,#2E6B3F)]",
                d.valor === 0 && "bg-none bg-slate-200",
              )}
              style={{ height: `${Math.max(4, (d.valor / maximo) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t border-borde pt-2 sm:gap-3" aria-hidden>
        {datos.map((d) => (
          <span key={d.etiqueta} className={cn("flex-1 text-center text-xs capitalize", d.destacado ? "font-semibold text-texto" : "text-texto-suave")}>
            {d.etiqueta}
          </span>
        ))}
      </div>
    </figure>
  );
}
