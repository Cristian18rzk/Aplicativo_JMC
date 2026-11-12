"use client";

import { Award, FileUp, UserPlus } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { FranjaPlantacion } from "@/components/auth/escena-amanecer";
import { LoteDelMes } from "@/components/panel/lote-del-mes";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { BarrasHistorial } from "@/components/ui/indicadores";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useCertificados } from "@/hooks/use-certificados";
import { useResumenAdmin } from "@/hooks/use-resumen";
import { mensajeDeError } from "@/lib/api-cliente";
import { MESES, formatDate, formatNumber } from "@/lib/utils";
import type { ListaPendientes, ResumenAdmin } from "@/types/resumen";

const sinSuscripcion = () => () => undefined;

function saludo(): string {
  const hora = new Date().getHours();
  return hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
}

const nombreMes = (periodo: string) => MESES[Number(periodo.slice(5)) - 1];

/** "0 de 49 desprendibles", con la forma singular cuando corresponde. */
const deTotal = (valor: number, total: number, singular: string, plural: string) =>
  `${formatNumber(valor)} de ${formatNumber(total)} ${total === 1 ? singular : plural}`;

// ─── Banda de bienvenida ─────────────────────────────────────────────

function Bienvenida({ nombre, r }: { nombre: string; r?: ResumenAdmin }) {
  // En el servidor se muestra "Hola"; en el navegador, el saludo según su hora (sin desajuste de hidratación)
  const texto = useSyncExternalStore(sinSuscripcion, saludo, () => "Hola");
  return (
    <section className="relative overflow-hidden rounded-[20px] bg-[#12301C] text-white">
      <FranjaPlantacion className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full sm:h-28" />
      <div className="relative max-w-3xl px-5 pt-6 pb-20 sm:px-8 sm:pt-7 sm:pb-24">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#FFF8EC] sm:text-[2.5rem] sm:leading-[1.1]">
          {texto}, {nombre}
        </h2>
        <p className="mt-2 text-[17px] leading-relaxed text-palma-100">
          {r
            ? `En ${nombreMes(r.periodo)} van ${deTotal(r.desprendibles.cargados, r.desprendibles.esperados, "desprendible", "desprendibles")} y ${deTotal(r.acceso.conPin, r.acceso.total, "colaborador ha", "colaboradores han")} entrado al portal.`
            : "Cargando el resumen del mes…"}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/admin/desprendibles/cargar"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-sol px-4 text-sm font-semibold text-[#2B1606] hover:bg-sol-claro"
          >
            <FileUp className="h-4 w-4" aria-hidden />
            Cargar desprendibles
          </Link>
          <Link
            href="/admin/colaboradores/nuevo"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            Nuevo colaborador
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Cifras y pendientes ─────────────────────────────────────────────

function Cifras({ r }: { r: ResumenAdmin }) {
  const filas: { titulo: string; valor: string; detalle: string }[] = [
    {
      titulo: "Colaboradores activos",
      valor: formatNumber(r.colaboradores.activos),
      detalle: r.colaboradores.porArea.map((a) => `${a.cantidad} en ${a.area}`).join(", "),
    },
    {
      titulo: "Certificados de este mes",
      valor: formatNumber(r.certificados.esteMes),
      detalle: `${formatNumber(r.certificados.total)} en total`,
    },
    {
      titulo: "Cuentas bloqueadas",
      valor: formatNumber(r.acceso.bloqueados),
      detalle: r.acceso.bloqueados ? "Restablezca el PIN desde la ficha" : "Ninguna por ahora",
    },
  ];
  return (
    <Card>
      <dl className="divide-y divide-[#E3EAE0]">
        {filas.map((f) => (
          <div key={f.titulo} className="flex items-baseline justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              <dt className="text-sm font-semibold text-texto">{f.titulo}</dt>
              <dd className="mt-0.5 text-xs text-texto-suave">{f.detalle}</dd>
            </div>
            <dd className="font-display text-3xl font-bold tracking-tight text-palma-900 tabular-nums">{f.valor}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ListaPersonas({ titulo, lista, vacio }: { titulo: string; lista: ListaPendientes; vacio: string }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-3 flex items-center gap-2 font-display text-[15px] font-semibold text-texto">
        {titulo}
        <Badge variante={lista.total ? "warning" : "success"}>{formatNumber(lista.total)}</Badge>
      </h4>
      {lista.total === 0 ? (
        <p className="rounded-xl bg-palma-50 px-3 py-3 text-sm font-medium text-acento">{vacio}</p>
      ) : (
        <ul className="divide-y divide-[#E3EAE0] overflow-hidden rounded-xl border border-[#E3EAE0]">
          {lista.personas.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/colaboradores/${p.id}`}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#F3F7F1] focus-visible:bg-[#F3F7F1]"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-sol" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-texto">{p.nombre}</span>
                  <span className="block truncate text-xs text-texto-suave">
                    {p.cargo}, {p.documento}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {lista.total > lista.personas.length ? (
            <li className="px-3 py-2 text-xs text-texto-suave">Y {formatNumber(lista.total - lista.personas.length)} más en el lote</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────

export default function InicioAdmin() {
  const { usuario } = useAuth();
  const resumen = useResumenAdmin();
  const certificados = useCertificados({ porPagina: 5 });
  const r = resumen.data;

  return (
    <div className="space-y-5">
      <Bienvenida nombre={usuario?.nombre.split(" ")[0] ?? ""} r={r} />

      {resumen.isError ? (
        <Card>
          <EmptyState titulo="No fue posible cargar el resumen del mes" descripcion={mensajeDeError(resumen.error)} />
        </Card>
      ) : !r ? (
        <div className="h-72 animate-pulse rounded-[20px] bg-white/60" aria-busy="true" aria-label="Cargando el lote del mes" />
      ) : (
        <>
          <LoteDelMes lote={r.lote} mes={nombreMes(r.periodo)} />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Card>
              <CardHeader>
                <CardTitle>Lo que falta en {nombreMes(r.periodo)}</CardTitle>
              </CardHeader>
              <div className="grid gap-6 p-5 md:grid-cols-2">
                <ListaPersonas titulo="Sin desprendible" lista={r.pendientes.sinDesprendible} vacio="Todos tienen su desprendible del mes." />
                <ListaPersonas titulo="Aún no entran al portal" lista={r.pendientes.sinAcceso} vacio="Todos ya crearon su PIN." />
              </div>
            </Card>

            <div className="space-y-5">
              <Cifras r={r} />
              <Card>
                <CardHeader>
                  <CardTitle>Desprendibles por mes</CardTitle>
                </CardHeader>
                <div className="p-5">
                  <BarrasHistorial
                    datos={r.desprendibles.historial.map((h) => ({
                      etiqueta: nombreMes(h.periodo).slice(0, 3),
                      valor: h.cantidad,
                      destacado: h.periodo === r.periodo,
                    }))}
                    descripcion={`Desprendibles cargados por mes: ${r.desprendibles.historial
                      .map((h) => `${nombreMes(h.periodo)} ${h.cantidad}`)
                      .join(", ")}`}
                  />
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Últimos certificados generados</CardTitle>
          <Link href="/admin/certificados" className="text-sm font-semibold text-acento hover:underline">
            Ver todos los certificados
          </Link>
        </CardHeader>
        {!certificados.isLoading && certificados.data?.datos.length === 0 ? (
          <EmptyState
            icono={Award}
            titulo="Aún no hay certificados"
            descripcion="Genere el primero desde Certificados o desde la ficha de un colaborador."
          />
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
                      <p className="text-xs text-texto-suave tabular-nums">{c.colaboradorCedula}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variante="oro">{c.tipo}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(c.fecha_generacion)}</TableCell>
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
