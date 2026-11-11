"use client";

import { Download, ExternalLink, FileText, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from "@/components/ui/table";
import { useMisDesprendibles } from "@/hooks/use-desprendibles";
import { mensajeDeError } from "@/lib/api-cliente";
import { formatDate, formatPeriodo } from "@/lib/utils";

const claseAccion = "rounded-lg p-2 text-texto-suave hover:bg-slate-100 hover:text-acento";

export default function MisDesprendibles() {
  const [pagina, setPagina] = useState(1);
  const [periodo, setPeriodo] = useState("");

  const { data, isLoading, isError, error } = useMisDesprendibles({ pagina, porPagina: 12, periodo });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-texto">Mis desprendibles</h1>
          <p className="text-sm text-texto-suave">Sus comprobantes de pago por periodo.</p>
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
            descripcion={periodo ? "No hay desprendibles para el periodo seleccionado." : "Aún no tiene desprendibles publicados."}
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Periodo</TableHead>
                <TableHead className="hidden sm:table-cell">Publicado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </tr>
            </TableHeader>
            {isLoading ? (
              <TableSkeleton columnas={3} />
            ) : (
              <TableBody>
                {data?.datos.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <p className="font-medium">{formatPeriodo(d.periodo)}</p>
                      <Badge variante={d.tipo_periodo === "Mensual" ? "default" : "neutral"}>{d.tipo_periodo}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(d.fecha_carga)}</TableCell>
                    <TableCell>
                      {d.tieneArchivo ? (
                        <div className="flex justify-end gap-0.5">
                          <a
                            href={`/api/desprendibles/${d.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={claseAccion}
                            aria-label={`Ver desprendible de ${formatPeriodo(d.periodo)} en otra pestaña`}
                            title="Ver"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <a
                            href={`/api/desprendibles/${d.id}/pdf?descargar=1`}
                            className={claseAccion}
                            aria-label={`Descargar desprendible de ${formatPeriodo(d.periodo)}`}
                            title="Descargar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-right text-xs text-texto-suave">En preparación</p>
                      )}
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
    </div>
  );
}
