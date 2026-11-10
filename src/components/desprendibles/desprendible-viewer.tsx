"use client";

import { Download, ExternalLink } from "lucide-react";
import { clasesBoton } from "@/components/ui/button";
import { calcularLiquidacion } from "@/lib/nomina";
import { cn, formatCurrency, formatDate, formatNumber, formatPeriodo } from "@/lib/utils";
import type { Desprendible, ValoresDesprendible } from "@/types/desprendible";

export type DatosVistaDesprendible = ValoresDesprendible &
  Pick<
    Desprendible,
    | "periodo"
    | "tipo_periodo"
    | "colaboradorNombre"
    | "colaboradorCedula"
    | "colaboradorCargo"
    | "descripcion_otros"
    | "descripcion_descuentos"
  > & { id?: string; fecha_generacion?: string };

interface Fila {
  concepto: string;
  cantidad?: string;
  valor: number;
}

function TablaConceptos({ titulo, filas, total, color }: { titulo: string; filas: Fila[]; total: number; color: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-borde">
      <div className={cn("flex justify-between px-4 py-2 text-xs font-semibold tracking-wide text-white uppercase", color)}>
        <span>{titulo}</span>
        <span>Valor</span>
      </div>
      <ul className="divide-y divide-borde text-sm">
        {filas.map((f) => (
          <li key={f.concepto} className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="text-texto">
              {f.concepto}
              {f.cantidad ? <span className="ml-1.5 text-xs text-texto-suave">({f.cantidad})</span> : null}
            </span>
            <span className="font-medium tabular-nums">{formatCurrency(f.valor)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between bg-slate-50 px-4 py-2 text-sm font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

/** Vista previa HTML del desprendible (antes de descargar el PDF). */
export function DesprendibleViewer({ desprendible: d, mostrarAcciones = true }: { desprendible: DatosVistaDesprendible; mostrarAcciones?: boolean }) {
  const l = calcularLiquidacion(d);

  const devengados: Fila[] = [
    { concepto: "Salario básico", cantidad: `${formatNumber(d.dias_trabajados)} días`, valor: l.valorSalario },
  ];
  if (d.horas_extras_diurnas > 0)
    devengados.push({ concepto: "Horas extras diurnas", cantidad: `${formatNumber(d.horas_extras_diurnas)} h`, valor: l.valorHorasExtrasDiurnas });
  if (d.horas_extras_nocturnas > 0)
    devengados.push({ concepto: "Horas extras nocturnas", cantidad: `${formatNumber(d.horas_extras_nocturnas)} h`, valor: l.valorHorasExtrasNocturnas });
  if (d.recargos_nocturnos > 0)
    devengados.push({ concepto: "Recargos nocturnos", cantidad: `${formatNumber(d.recargos_nocturnos)} h`, valor: l.valorRecargosNocturnos });
  if (d.dominicales_festivos > 0)
    devengados.push({ concepto: "Dominicales y festivos", cantidad: `${formatNumber(d.dominicales_festivos)} h`, valor: l.valorDominicalesFestivos });
  if (l.auxilioTransporte > 0) devengados.push({ concepto: "Auxilio de transporte", valor: l.auxilioTransporte });
  if (l.otrosDevengados > 0) devengados.push({ concepto: "Otros devengados", valor: l.otrosDevengados });

  const deducciones: Fila[] = [
    { concepto: "Salud (4%)", valor: l.deduccionSalud },
    { concepto: "Pensión (4%)", valor: l.deduccionPension },
  ];
  if (l.retencionFuente > 0) deducciones.push({ concepto: "Retención en la fuente", valor: l.retencionFuente });
  if (l.otrosDescuentos > 0) deducciones.push({ concepto: "Otros descuentos", valor: l.otrosDescuentos });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-base font-semibold text-texto">{d.colaboradorNombre}</p>
          <p className="text-sm text-texto-suave">
            C.C. {d.colaboradorCedula}
            {d.colaboradorCargo ? ` · ${d.colaboradorCargo}` : ""}
          </p>
        </div>
        <div className="text-sm sm:text-right">
          <p className="font-semibold text-acento">
            {formatPeriodo(d.periodo)} · {d.tipo_periodo}
          </p>
          <p className="text-texto-suave">
            Salario base {formatCurrency(d.salario_base)}
            {d.fecha_generacion ? ` · Generado ${formatDate(d.fecha_generacion)}` : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TablaConceptos titulo="Devengados" filas={devengados} total={l.totalDevengado} color="bg-acento" />
        <TablaConceptos titulo="Deducciones" filas={deducciones} total={l.totalDeducciones} color="bg-slate-600" />
      </div>

      <div className="flex items-center justify-between rounded-lg bg-acento px-5 py-4 text-white">
        <span className="text-sm font-semibold tracking-wide uppercase">Neto a pagar</span>
        <span className="text-2xl font-bold tabular-nums">{formatCurrency(l.netoAPagar)}</span>
      </div>

      {d.descripcion_otros || d.descripcion_descuentos ? (
        <div className="space-y-1 rounded-lg border border-borde p-4 text-sm">
          {d.descripcion_otros ? (
            <p>
              <span className="font-medium">Otros devengados:</span> {d.descripcion_otros}
            </p>
          ) : null}
          {d.descripcion_descuentos ? (
            <p>
              <span className="font-medium">Otros descuentos:</span> {d.descripcion_descuentos}
            </p>
          ) : null}
        </div>
      ) : null}

      {mostrarAcciones && d.id ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <a
            href={`/api/desprendibles/${d.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={clasesBoton("secondary", "md")}
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Ver PDF
          </a>
          <a href={`/api/desprendibles/${d.id}/pdf?descargar=1`} className={clasesBoton("primary", "md")}>
            <Download className="h-4 w-4" aria-hidden />
            Descargar PDF
          </a>
        </div>
      ) : null}
    </div>
  );
}
