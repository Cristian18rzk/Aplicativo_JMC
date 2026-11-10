"use client";

import { Download, Eye, FileText, X } from "lucide-react";
import { useState } from "react";
import { DesprendibleViewer } from "@/components/desprendibles/desprendible-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from "@/components/ui/table";
import { useMisDesprendibles } from "@/hooks/use-desprendibles";
import { mensajeDeError } from "@/lib/api-cliente";
import { formatCurrency, formatDate, formatPeriodo } from "@/lib/utils";
import type { Desprendible } from "@/types/desprendible";

export default function MisDesprendibles() {
  const [pagina, setPagina] = useState(1);
  const [periodo, setPeriodo] = useState("");
  const [seleccionado, setSeleccionado] = useState<Desprendible | null>(null);

  const { data, isLoading, isError, error } = useMisDesprendibles({ pagina, porPagina: 12, periodo });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-texto">Mis desprendibles</h1>
          <p className="text-sm text-texto-suave">Comprobantes de pago de nómina por periodo.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-full sm:w-48">
            <Input
              type="month"
              label="Periodo"
              value={periodo}
              onChange={(e) => {
                setPeriodo(e.target.value);
                setPagina(1);
              }}
            />
          </div>
          {periodo ? (
            <Button variante="ghost" onClick={() => setPeriodo("")} aria-label="Quitar filtro">
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        {isError ? (
          <EmptyState titulo="Error al cargar" descripcion={mensajeDeError(error)} />
        ) : !isLoading && data?.datos.length === 0 ? (
          <EmptyState
            icono={FileText}
            titulo="Sin desprendibles"
            descripcion={periodo ? "No hay desprendibles para el periodo seleccionado." : "Aún no tiene desprendibles registrados."}
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Periodo</TableHead>
                <TableHead className="hidden sm:table-cell">Generado</TableHead>
                <TableHead className="hidden text-right md:table-cell">Devengado</TableHead>
                <TableHead className="text-right">Neto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </tr>
            </TableHeader>
            {isLoading ? (
              <TableSkeleton columnas={5} />
            ) : (
              <TableBody>
                {data?.datos.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <p className="font-medium">{formatPeriodo(d.periodo)}</p>
                      <Badge variante={d.tipo_periodo === "Mensual" ? "default" : "neutral"}>{d.tipo_periodo}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(d.fecha_generacion)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">{formatCurrency(d.total_devengado)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(d.neto_a_pagar)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => setSeleccionado(d)}
                          className="rounded-lg p-2 text-texto-suave hover:bg-slate-100 hover:text-acento"
                          aria-label="Ver detalle"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={`/api/desprendibles/${d.id}/pdf?descargar=1`}
                          className="rounded-lg p-2 text-texto-suave hover:bg-slate-100 hover:text-acento"
                          aria-label="Descargar PDF"
                          title="Descargar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        )}
        {data && data.total > 0 ? (
          <div className="border-t border-borde">
            <Pagination
              pagina={data.pagina}
              totalPaginas={data.totalPaginas}
              total={data.total}
              porPagina={data.porPagina}
              onCambiar={setPagina}
            />
          </div>
        ) : null}
      </Card>

      {seleccionado ? (
        <Modal abierto onCerrar={() => setSeleccionado(null)} titulo="Desprendible de nómina" ancho="lg">
          <DesprendibleViewer desprendible={seleccionado} />
        </Modal>
      ) : null}
    </div>
  );
}
