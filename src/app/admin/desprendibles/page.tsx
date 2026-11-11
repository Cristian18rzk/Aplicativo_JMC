"use client";

import { Download, ExternalLink, FileText, FileUp, Pencil, Trash, Upload, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DesprendibleForm } from "@/components/desprendibles/desprendible-form";
import { Badge } from "@/components/ui/badge";
import { Button, clasesBoton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { CargandoPagina } from "@/components/ui/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from "@/components/ui/table";
import { useColaboradores } from "@/hooks/use-colaboradores";
import {
  useDeleteDesprendible,
  useDesprendibles,
  useSubirDesprendible,
  useUpdateDesprendible,
} from "@/hooks/use-desprendibles";
import { useToast } from "@/hooks/use-toast";
import { mensajeDeError } from "@/lib/api-cliente";
import { formatDate, formatPeriodo, formatTamano } from "@/lib/utils";
import type { Desprendible, DesprendibleInput } from "@/types/desprendible";

const POR_PAGINA = 15;

type Dialogo = { tipo: "nuevo" } | { tipo: "editar" | "eliminar"; desprendible: Desprendible } | null;

const claseAccion = "rounded-lg p-2 text-texto-suave hover:bg-slate-100 hover:text-acento";

export default function PaginaDesprendibles() {
  const toast = useToast();
  const [pagina, setPagina] = useState(1);
  const [periodo, setPeriodo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  const { data, isLoading, isFetching, isError, error } = useDesprendibles({
    pagina,
    porPagina: POR_PAGINA,
    periodo,
    busqueda,
  });

  const necesitaColaboradores = dialogo?.tipo === "nuevo" || dialogo?.tipo === "editar";
  const colaboradores = useColaboradores({ porPagina: 1000 }, necesitaColaboradores);

  const subir = useSubirDesprendible();
  const actualizar = useUpdateDesprendible();
  const eliminar = useDeleteDesprendible();
  const cerrar = () => setDialogo(null);

  const guardarNuevo = async (datos: DesprendibleInput, archivo: File | null) => {
    if (!archivo) return;
    try {
      await subir.mutateAsync({ datos, archivo });
      toast.success("Desprendible cargado");
      cerrar();
    } catch (err) {
      toast.error("No fue posible cargar el desprendible", { descripcion: mensajeDeError(err) });
    }
  };

  const guardarEdicion = async (id: string, datos: DesprendibleInput, archivo: File | null) => {
    try {
      await actualizar.mutateAsync({ id, datos, archivo });
      toast.success(archivo ? "Desprendible actualizado y archivo reemplazado" : "Desprendible actualizado");
      cerrar();
    } catch (err) {
      toast.error("No fue posible actualizar", { descripcion: mensajeDeError(err) });
    }
  };

  const confirmarEliminar = async (id: string) => {
    try {
      await eliminar.mutateAsync(id);
      toast.success("Desprendible eliminado");
      cerrar();
    } catch (err) {
      toast.error("No fue posible eliminar", { descripcion: mensajeDeError(err) });
    }
  };

  const listaColaboradores = colaboradores.data?.datos ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-texto-suave">Cargue y administre los desprendibles de pago de cada colaborador.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/desprendibles/cargar" className={clasesBoton("secondary")}>
            <FileUp className="h-4 w-4" aria-hidden />
            Cargue masivo
          </Link>
          <Button onClick={() => setDialogo({ tipo: "nuevo" })}>
            <Upload className="h-4 w-4" aria-hidden />
            Subir desprendible
          </Button>
        </div>
      </div>

      <Card>
        <div className="grid gap-3 border-b border-borde p-4 sm:grid-cols-3">
          <SearchInput
            className="sm:col-span-2"
            placeholder="Buscar por colaborador o cédula…"
            onBuscar={(v) => {
              setBusqueda(v);
              setPagina(1);
            }}
          />
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="month"
                aria-label="Filtrar por periodo"
                value={periodo}
                onChange={(e) => {
                  setPeriodo(e.target.value);
                  setPagina(1);
                }}
              />
            </div>
            {periodo ? (
              <Button variante="ghost" tamano="sm" onClick={() => setPeriodo("")} aria-label="Quitar filtro de periodo">
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        {isError ? (
          <EmptyState titulo="Error al cargar desprendibles" descripcion={mensajeDeError(error)} />
        ) : !isLoading && data?.datos.length === 0 ? (
          <EmptyState
            icono={FileText}
            titulo="No hay desprendibles"
            descripcion={
              periodo || busqueda
                ? "No hay resultados para los filtros aplicados."
                : "Suba un desprendible individual o use el cargue masivo de PDF."
            }
          />
        ) : (
          <div className={isFetching && !isLoading ? "opacity-60 transition-opacity" : undefined}>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="hidden lg:table-cell">Archivo</TableHead>
                  <TableHead className="hidden md:table-cell">Cargado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </tr>
              </TableHeader>
              {isLoading ? (
                <TableSkeleton columnas={5} filas={6} />
              ) : (
                <TableBody>
                  {data?.datos.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <p className="font-medium">{d.colaboradorNombre}</p>
                        <p className="text-xs text-texto-suave">C.C. {d.colaboradorCedula}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p>{formatPeriodo(d.periodo)}</p>
                        <Badge variante={d.tipo_periodo === "Mensual" ? "default" : "neutral"}>{d.tipo_periodo}</Badge>
                      </TableCell>
                      <TableCell className="hidden max-w-64 lg:table-cell">
                        {d.tieneArchivo ? (
                          <>
                            <p className="truncate text-sm" title={d.nombre_archivo}>
                              {d.nombre_archivo || "desprendible.pdf"}
                            </p>
                            <p className="text-xs text-texto-suave">{formatTamano(d.tamano_bytes)}</p>
                          </>
                        ) : (
                          <Badge variante="warning">Sin archivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm">{formatDate(d.fecha_carga)}</p>
                        {d.cargado_por ? <p className="text-xs text-texto-suave">{d.cargado_por}</p> : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-0.5">
                          {d.tieneArchivo ? (
                            <>
                              <a
                                href={`/api/desprendibles/${d.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={claseAccion}
                                aria-label="Ver PDF en otra pestaña"
                                title="Ver PDF"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <a
                                href={`/api/desprendibles/${d.id}/pdf?descargar=1`}
                                className={claseAccion}
                                aria-label="Descargar PDF"
                                title="Descargar PDF"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setDialogo({ tipo: "editar", desprendible: d })}
                            className={claseAccion}
                            aria-label="Editar o reemplazar archivo"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDialogo({ tipo: "eliminar", desprendible: d })}
                            className="rounded-lg p-2 text-texto-suave hover:bg-error/10 hover:text-error"
                            aria-label="Eliminar desprendible"
                            title="Eliminar"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </div>
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

      {/* Subir */}
      <Modal abierto={dialogo?.tipo === "nuevo"} onCerrar={cerrar} titulo="Subir desprendible" ancho="lg">
        {colaboradores.isLoading ? (
          <CargandoPagina mensaje="Cargando colaboradores…" />
        ) : (
          <DesprendibleForm
            colaboradores={listaColaboradores}
            onEnviar={guardarNuevo}
            onCancelar={cerrar}
            enviando={subir.isPending}
          />
        )}
      </Modal>

      {/* Editar */}
      {dialogo?.tipo === "editar" ? (
        <Modal abierto onCerrar={cerrar} titulo="Editar desprendible" descripcion={dialogo.desprendible.colaboradorNombre} ancho="lg">
          {colaboradores.isLoading ? (
            <CargandoPagina mensaje="Cargando colaboradores…" />
          ) : (
            <DesprendibleForm
              key={dialogo.desprendible.id}
              colaboradores={listaColaboradores}
              valoresIniciales={dialogo.desprendible}
              onEnviar={(datos, archivo) => guardarEdicion(dialogo.desprendible.id, datos, archivo)}
              onCancelar={cerrar}
              enviando={actualizar.isPending}
            />
          )}
        </Modal>
      ) : null}

      {/* Eliminar */}
      {dialogo?.tipo === "eliminar" ? (
        <Modal
          abierto
          onCerrar={cerrar}
          titulo="Eliminar desprendible"
          ancho="sm"
          pie={
            <>
              <Button variante="secondary" onClick={cerrar} disabled={eliminar.isPending}>
                Cancelar
              </Button>
              <Button
                variante="destructive"
                onClick={() => confirmarEliminar(dialogo.desprendible.id)}
                cargando={eliminar.isPending}
              >
                Eliminar
              </Button>
            </>
          }
        >
          <p className="text-sm">
            ¿Eliminar el desprendible {dialogo.desprendible.tipo_periodo} de {formatPeriodo(dialogo.desprendible.periodo)} de{" "}
            <span className="font-semibold">{dialogo.desprendible.colaboradorNombre}</span> y su archivo PDF? Esta acción
            no se puede deshacer.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
