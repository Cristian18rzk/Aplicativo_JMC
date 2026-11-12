import { Check } from "lucide-react";
import { MESES, cn } from "@/lib/utils";
import type { Desprendible } from "@/types/desprendible";

type EstadoMes = "cargado" | "pendiente" | "faltante" | "futuro" | "antes";

const ESTILO: Record<EstadoMes, string> = {
  cargado: "border-transparent bg-acento text-white",
  pendiente: "border-2 border-sol bg-sol-suave text-sol-oscuro",
  faltante: "border-[#F6CFA8] bg-sol-suave/60 text-sol-oscuro",
  futuro: "border-dashed border-borde-fuerte bg-transparent text-texto-suave",
  antes: "border-transparent bg-slate-100 text-slate-400",
};

const LEYENDA: [EstadoMes, string][] = [
  ["cargado", "Cargado"],
  ["pendiente", "Mes actual pendiente"],
  ["faltante", "Sin desprendible"],
];

/**
 * Franja de 12 meses del año: qué desprendibles tiene cargados el colaborador.
 * Verde palma = cargado · naranja sol = falta · gris = antes de su ingreso o meses por venir.
 */
export function AnioDesprendibles({
  desprendibles,
  fechaIngreso,
  anio = new Date().getFullYear(),
}: {
  desprendibles: Pick<Desprendible, "periodo">[];
  fechaIngreso: string;
  anio?: number;
}) {
  const hoy = new Date();
  const mesActual = hoy.getFullYear() === anio ? hoy.getMonth() : anio < hoy.getFullYear() ? 12 : -1;
  const ingreso = fechaIngreso ? fechaIngreso.slice(0, 7) : "";

  const porMes = new Map<number, number>();
  for (const d of desprendibles) {
    if (d.periodo.startsWith(`${anio}-`)) {
      const mes = Number(d.periodo.slice(5)) - 1;
      porMes.set(mes, (porMes.get(mes) ?? 0) + 1);
    }
  }

  const estado = (mes: number): EstadoMes => {
    const periodo = `${anio}-${String(mes + 1).padStart(2, "0")}`;
    if (porMes.has(mes)) return "cargado";
    if (ingreso && periodo < ingreso) return "antes";
    if (mes > mesActual) return "futuro";
    return mes === mesActual ? "pendiente" : "faltante";
  };

  const cargados = porMes.size;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-sm font-semibold text-texto">
          En {anio}, {cargados} {cargados === 1 ? "mes" : "meses"} con desprendible
        </p>
        <ul className="flex flex-wrap gap-3 text-xs text-texto-suave">
          {LEYENDA.map(([e, texto]) => (
            <li key={e} className="flex items-center gap-1.5">
              <span className={cn("h-3 w-3 rounded border", ESTILO[e])} aria-hidden />
              {texto}
            </li>
          ))}
        </ul>
      </div>
      <ol className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {MESES.map((nombre, mes) => {
          const e = estado(mes);
          const cantidad = porMes.get(mes) ?? 0;
          return (
            <li
              key={nombre}
              className={cn("flex h-14 flex-col items-center justify-center rounded-lg border text-xs font-semibold capitalize", ESTILO[e])}
              title={`${nombre} ${anio}: ${
                e === "cargado"
                  ? `${cantidad} desprendible${cantidad > 1 ? "s" : ""}`
                  : e === "antes"
                    ? "antes del ingreso"
                    : e === "futuro"
                      ? "aún no llega"
                      : "sin desprendible"
              }`}
            >
              <span>{nombre.slice(0, 3)}</span>
              {e === "cargado" ? (
                cantidad > 1 ? (
                  <span className="text-[11px] opacity-90">×{cantidad}</span>
                ) : (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                )
              ) : null}
              <span className="sr-only">
                {e === "cargado" ? "cargado" : e === "antes" ? "antes del ingreso" : e === "futuro" ? "por venir" : "sin desprendible"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
