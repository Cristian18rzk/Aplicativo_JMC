"use client";

import { Award, FileText, FileUp, UserPlus, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useCertificados } from "@/hooks/use-certificados";
import { useColaboradores } from "@/hooks/use-colaboradores";
import { useDesprendibles } from "@/hooks/use-desprendibles";
import { cn, formatDate, formatNumber, formatPeriodo, periodoActual } from "@/lib/utils";

function TarjetaContador({
  titulo,
  valor,
  detalle,
  icono: Icono,
  cargando,
  href,
}: {
  titulo: string;
  valor: number | undefined;
  detalle: string;
  icono: LucideIcon;
  cargando: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="transition-shadow group-hover:shadow-md">
        <CardContent className="flex items-center gap-4 py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-acento-suave">
            <Icono className="h-6 w-6 text-acento" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-texto-suave">{titulo}</p>
            {cargando ? (
              <div className="mt-1 h-7 w-16 animate-pulse rounded bg-slate-200" />
            ) : (
              <p className="text-2xl font-bold text-texto tabular-nums">{formatNumber(valor ?? 0)}</p>
            )}
            <p className="truncate text-xs text-texto-suave">{detalle}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AccesoRapido({ href, icono: Icono, titulo, descripcion }: { href: string; icono: LucideIcon; titulo: string; descripcion: string }) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-lg border border-borde bg-white p-4 shadow-sm transition-all hover:border-acento hover:shadow-md"
    >
      <Icono className="mt-0.5 h-5 w-5 shrink-0 text-acento" aria-hidden />
      <div>
        <p className="text-sm font-semibold text-texto">{titulo}</p>
        <p className="text-xs text-texto-suave">{descripcion}</p>
      </div>
    </Link>
  );
}

export default function DashboardAdmin() {
  const { usuario } = useAuth();
  const [periodo] = useState(periodoActual);

  const colaboradores = useColaboradores({ porPagina: 1 });
  const activos = useColaboradores({ porPagina: 1, estado: "Activo" });
  const desprendiblesMes = useDesprendibles({ porPagina: 1, periodo });
  const certificados = useCertificados({ porPagina: 5 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-texto">Hola, {usuario?.nombre.split(" ")[0] ?? "administrador"}</h2>
        <p className="text-sm text-texto-suave">Resumen de la nómina · {formatPeriodo(periodo)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TarjetaContador
          titulo="Total colaboradores"
          valor={colaboradores.data?.total}
          detalle={activos.data ? `${formatNumber(activos.data.total)} activos` : "Cargando activos…"}
          icono={Users}
          cargando={colaboradores.isLoading}
          href="/admin/colaboradores"
        />
        <TarjetaContador
          titulo="Desprendibles del mes"
          valor={desprendiblesMes.data?.total}
          detalle={formatPeriodo(periodo)}
          icono={FileText}
          cargando={desprendiblesMes.isLoading}
          href="/admin/desprendibles"
        />
        <TarjetaContador
          titulo="Certificados generados"
          valor={certificados.data?.total}
          detalle="Histórico total"
          icono={Award}
          cargando={certificados.isLoading}
          href="/admin/certificados"
        />
      </div>

      <section aria-labelledby="accesos">
        <h3 id="accesos" className="mb-3 text-sm font-semibold text-texto-suave uppercase">
          Accesos rápidos
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AccesoRapido href="/admin/colaboradores/nuevo" icono={UserPlus} titulo="Nuevo colaborador" descripcion="Registrar datos personales y de nómina" />
          <AccesoRapido href="/admin/desprendibles/cargar" icono={FileUp} titulo="Cargue masivo" descripcion="Subir desprendibles desde Excel o CSV" />
          <AccesoRapido href="/admin/desprendibles" icono={FileText} titulo="Desprendibles" descripcion="Consultar y crear desprendibles" />
          <AccesoRapido href="/admin/certificados" icono={Award} titulo="Certificados" descripcion="Generar certificados laborales" />
        </div>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Últimos certificados generados</CardTitle>
          <Link href="/admin/certificados" className="text-sm font-medium text-acento hover:underline">
            Ver todos
          </Link>
        </CardHeader>
        {!certificados.isLoading && certificados.data?.datos.length === 0 ? (
          <EmptyState icono={Award} titulo="Aún no hay certificados" descripcion="Los certificados generados aparecerán aquí." />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
              </tr>
            </TableHeader>
            {certificados.isLoading ? (
              <TableSkeleton filas={3} columnas={3} />
            ) : (
              <TableBody>
                {certificados.data?.datos.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium">{c.colaboradorNombre}</p>
                      <p className="text-xs text-texto-suave">C.C. {c.colaboradorCedula}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variante={c.tipo === "Laboral" ? "default" : "warning"}>{c.tipo}</Badge>
                    </TableCell>
                    <TableCell className={cn("hidden sm:table-cell")}>{formatDate(c.fecha_generacion)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        )}
      </Card>
    </div>
  );
}
