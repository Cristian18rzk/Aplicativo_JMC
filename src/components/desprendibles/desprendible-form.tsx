"use client";

import { Calculator, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { calcularAportesLey, calcularLiquidacion } from "@/lib/nomina";
import { formatCurrency, periodoActual } from "@/lib/utils";
import { desprendibleSchema } from "@/lib/validators/desprendible";
import type { Colaborador } from "@/types/colaborador";
import { TIPOS_PERIODO, type Desprendible, type DesprendibleInput, type ValoresDesprendible } from "@/types/desprendible";

type CampoNumerico = keyof ValoresDesprendible;

const CAMPOS_DEVENGADOS: { clave: CampoNumerico; etiqueta: string; ayuda?: string }[] = [
  { clave: "salario_base", etiqueta: "Salario base mensual" },
  { clave: "dias_trabajados", etiqueta: "Días trabajados", ayuda: "15 para quincena, 30 para mes" },
  { clave: "horas_extras_diurnas", etiqueta: "Horas extras diurnas", ayuda: "Cantidad de horas" },
  { clave: "horas_extras_nocturnas", etiqueta: "Horas extras nocturnas", ayuda: "Cantidad de horas" },
  { clave: "recargos_nocturnos", etiqueta: "Recargos nocturnos", ayuda: "Cantidad de horas" },
  { clave: "dominicales_festivos", etiqueta: "Dominicales y festivos", ayuda: "Cantidad de horas" },
  { clave: "auxilio_transporte", etiqueta: "Auxilio de transporte" },
  { clave: "otros_devengados", etiqueta: "Otros devengados" },
];

const CAMPOS_DEDUCCIONES: { clave: CampoNumerico; etiqueta: string }[] = [
  { clave: "deduccion_salud", etiqueta: "Salud" },
  { clave: "deduccion_pension", etiqueta: "Pensión" },
  { clave: "retencion_fuente", etiqueta: "Retención en la fuente" },
  { clave: "otros_descuentos", etiqueta: "Otros descuentos" },
];

interface Estado {
  colaboradorId: string;
  periodo: string;
  tipo_periodo: string;
  descripcion_otros: string;
  descripcion_descuentos: string;
  numeros: Record<CampoNumerico, string>;
}

function estadoInicial(d?: Desprendible | null): Estado {
  const numeros = {} as Record<CampoNumerico, string>;
  for (const { clave } of [...CAMPOS_DEVENGADOS, ...CAMPOS_DEDUCCIONES]) {
    numeros[clave] = d ? String(d[clave] ?? 0) : clave === "dias_trabajados" ? "30" : "0";
  }
  return {
    colaboradorId: d?.colaboradorId ?? "",
    periodo: d?.periodo ?? periodoActual(),
    tipo_periodo: d?.tipo_periodo ?? "Mensual",
    descripcion_otros: d?.descripcion_otros ?? "",
    descripcion_descuentos: d?.descripcion_descuentos ?? "",
    numeros,
  };
}

/** "1.234.567" → 1234567 (miles con punto); "7,5" o "7.5" → 7.5 (decimal). */
const aNumero = (texto: string) => {
  const limpio = texto.replace(/[$\s]/g, "");
  const normalizado = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(limpio)
    ? limpio.replace(/\./g, "").replace(",", ".")
    : limpio.replace(",", ".");
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
};

interface DesprendibleFormProps {
  colaboradores: Colaborador[];
  valoresIniciales?: Desprendible | null;
  onEnviar: (datos: DesprendibleInput) => Promise<unknown>;
  onCancelar?: () => void;
  enviando?: boolean;
}

/** Formulario de desprendible individual con cálculo en vivo de totales. */
export function DesprendibleForm({ colaboradores, valoresIniciales, onEnviar, onCancelar, enviando }: DesprendibleFormProps) {
  const [estado, setEstado] = useState<Estado>(() => estadoInicial(valoresIniciales));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const valoresNumericos = useMemo(() => {
    const v = {} as ValoresDesprendible;
    for (const clave of Object.keys(estado.numeros) as CampoNumerico[]) v[clave] = aNumero(estado.numeros[clave]);
    return v;
  }, [estado.numeros]);

  const liquidacion = calcularLiquidacion(valoresNumericos);

  const cambiarNumero = (clave: CampoNumerico, valor: string) =>
    setEstado((e) => ({ ...e, numeros: { ...e.numeros, [clave]: valor } }));

  const seleccionarColaborador = (id: string) => {
    const colaborador = colaboradores.find((c) => c.id === id);
    setEstado((e) => ({
      ...e,
      colaboradorId: id,
      numeros: colaborador ? { ...e.numeros, salario_base: String(colaborador.salario_base) } : e.numeros,
    }));
  };

  const cambiarTipo = (tipo: string) =>
    setEstado((e) => ({
      ...e,
      tipo_periodo: tipo,
      numeros: { ...e.numeros, dias_trabajados: tipo === "Mensual" ? "30" : "15" },
    }));

  const calcularAportes = () => {
    const { salud, pension } = calcularAportesLey(valoresNumericos);
    setEstado((e) => ({
      ...e,
      numeros: { ...e.numeros, deduccion_salud: String(salud), deduccion_pension: String(pension) },
    }));
  };

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = desprendibleSchema.safeParse({
      colaboradorId: estado.colaboradorId,
      periodo: estado.periodo,
      tipo_periodo: estado.tipo_periodo,
      descripcion_otros: estado.descripcion_otros,
      descripcion_descuentos: estado.descripcion_descuentos,
      ...valoresNumericos,
    });
    if (!resultado.success) {
      const porCampo = z.flattenError(resultado.error).fieldErrors as Record<string, string[] | undefined>;
      setErrores(Object.fromEntries(Object.entries(porCampo).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setErrores({});
    await onEnviar(resultado.data);
  };

  const opcionesColaboradores = colaboradores.map((c) => ({
    valor: c.id,
    etiqueta: `${c.apellidos} ${c.nombres} — ${c.cedula}`,
  }));

  return (
    <form onSubmit={enviar} noValidate className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Select
            label="Colaborador"
            required
            placeholder="Seleccione un colaborador…"
            opciones={opcionesColaboradores}
            value={estado.colaboradorId}
            onChange={(e) => seleccionarColaborador(e.target.value)}
            error={errores.colaboradorId}
            disabled={Boolean(valoresIniciales)}
          />
        </div>
        <Input
          label="Periodo"
          type="month"
          required
          value={estado.periodo}
          onChange={(e) => setEstado((s) => ({ ...s, periodo: e.target.value }))}
          error={errores.periodo}
        />
        <Select
          label="Tipo de periodo"
          required
          opciones={TIPOS_PERIODO}
          value={estado.tipo_periodo}
          onChange={(e) => cambiarTipo(e.target.value)}
          error={errores.tipo_periodo}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-acento">Devengados</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAMPOS_DEVENGADOS.map(({ clave, etiqueta, ayuda }) => (
            <Input
              key={clave}
              label={etiqueta}
              inputMode="decimal"
              value={estado.numeros[clave]}
              onChange={(e) => cambiarNumero(clave, e.target.value)}
              error={errores[clave]}
              ayuda={ayuda}
            />
          ))}
        </div>
        <Textarea
          label="Descripción de otros devengados"
          rows={2}
          value={estado.descripcion_otros}
          onChange={(e) => setEstado((s) => ({ ...s, descripcion_otros: e.target.value }))}
        />
      </fieldset>

      <fieldset className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-sm font-semibold text-acento">Deducciones</legend>
          <Button variante="ghost" tamano="sm" onClick={calcularAportes}>
            <Calculator className="h-4 w-4" aria-hidden />
            Calcular salud y pensión (4%)
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAMPOS_DEDUCCIONES.map(({ clave, etiqueta }) => (
            <Input
              key={clave}
              label={etiqueta}
              inputMode="decimal"
              value={estado.numeros[clave]}
              onChange={(e) => cambiarNumero(clave, e.target.value)}
              error={errores[clave]}
            />
          ))}
        </div>
        <Textarea
          label="Descripción de otros descuentos"
          rows={2}
          value={estado.descripcion_descuentos}
          onChange={(e) => setEstado((s) => ({ ...s, descripcion_descuentos: e.target.value }))}
        />
      </fieldset>

      <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-4 text-center text-sm">
        <div>
          <p className="text-xs text-texto-suave">Total devengado</p>
          <p className="font-semibold tabular-nums">{formatCurrency(liquidacion.totalDevengado)}</p>
        </div>
        <div>
          <p className="text-xs text-texto-suave">Total deducciones</p>
          <p className="font-semibold tabular-nums">{formatCurrency(liquidacion.totalDeducciones)}</p>
        </div>
        <div>
          <p className="text-xs text-texto-suave">Neto a pagar</p>
          <p className="font-bold text-acento tabular-nums">{formatCurrency(liquidacion.netoAPagar)}</p>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancelar ? (
          <Button variante="secondary" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" cargando={enviando}>
          {!enviando ? <Save className="h-4 w-4" aria-hidden /> : null}
          {valoresIniciales ? "Guardar cambios" : "Crear desprendible"}
        </Button>
      </div>
    </form>
  );
}
