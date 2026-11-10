import { Briefcase, Building, CalendarDays, IdCard, Mail, Phone, Wallet, type LucideIcon } from "lucide-react";
import { Badge, varianteEstado } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { describirAntiguedad, formatCurrency, formatDate, iniciales } from "@/lib/utils";
import type { Colaborador } from "@/types/colaborador";

function Dato({ icono: Icono, etiqueta, valor }: { icono: LucideIcon; etiqueta: string; valor: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icono className="mt-0.5 h-4 w-4 shrink-0 text-texto-suave" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-texto-suave">{etiqueta}</dt>
        <dd className="truncate text-sm font-medium text-texto">{valor || "—"}</dd>
      </div>
    </div>
  );
}

/** Tarjeta resumen del colaborador (dashboard del colaborador y detalle). */
export function ColaboradorCard({ colaborador: c, mostrarSalario = true }: { colaborador: Colaborador; mostrarSalario?: boolean }) {
  const nombre = `${c.nombres} ${c.apellidos}`;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-4 bg-linear-to-r from-acento to-blue-600 px-5 py-5 text-white">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-semibold">
          {iniciales(nombre)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{nombre}</p>
          <p className="truncate text-sm text-blue-100">{c.cargo}</p>
        </div>
        <Badge variante={varianteEstado(c.estado)} className="bg-white">
          {c.estado}
        </Badge>
      </div>
      <CardContent>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Dato icono={IdCard} etiqueta="Cédula" valor={c.cedula} />
          <Dato icono={Building} etiqueta="Área" valor={c.area} />
          <Dato icono={Briefcase} etiqueta="Tipo de contrato" valor={c.tipo_contrato} />
          <Dato
            icono={CalendarDays}
            etiqueta="Fecha de ingreso"
            valor={`${formatDate(c.fecha_ingreso)} · ${describirAntiguedad(c.fecha_ingreso)}`}
          />
          {mostrarSalario ? <Dato icono={Wallet} etiqueta="Salario base" valor={formatCurrency(c.salario_base)} /> : null}
          <Dato icono={Mail} etiqueta="Correo" valor={c.email} />
          <Dato icono={Phone} etiqueta="Teléfono" valor={c.telefono} />
        </dl>
      </CardContent>
    </Card>
  );
}
