"use client";

import { Download, Eye, FileText, FileUp, Pencil, Plus, Trash, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DesprendibleForm } from "@/components/desprendibles/desprendible-form";
import { DesprendibleViewer } from "@/components/desprendibles/desprendible-viewer";
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
  useCreateDesprendible,
  useDeleteDesprendible,
  useDesprendibles,
  useUpdateDesprendible,
} from "@/hooks/use-desprendibles";
import { useToast } from "@/hooks/use-toast";
import { mensajeDeError } from "@/lib/api-cliente";
import { formatCurrency, formatPeriodo } from "@/lib/utils";
import type { Desprendible, DesprendibleInput } from "@/types/desprendible";

const POR_PAGINA = 15;

type Dialogo = { tipo: "nuevo" } | { tipo: "ver" | "editar" | "eliminar"; desprendible: Desprendible } | null;

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
  const colaboradores = useColaboradores({ porPagina: 1000, estado: "Activo" }, necesitaColaboradores);

  const crear = useCreateDesprendible();
  const actualizar = useUpdateDesprendible();
  const eliminar = useDeleteDesprendible();
  const cerrar = () => setDialogo(null);

  const guardarNuevo = async (datos: DesprendibleInput) => {
    try {
      await crear.mutateAsync(datos);
      toast.success("Desprendible creado");
      cerrar();
    } catch (err) {
      toast.error("No fue posible crear el desprendible", { descripcion: mensajeDeError(err) });
    }
  };

  const guardarEdicion = async (id: string, datos: DesprendibleInput) => {
    try {
      await actualizar.mutateAsync({ id, datos });
      toast.success("Desprendible actualizado");
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

  // En edición se incluye al colaborador aunque esté inactivo
  const listaColaboradores = colaboradores.data?.datos ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-texto-suave">Consulte, cree y descargue los desprendibles de nómina.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/desprendibles/cargar" className={clasesBoton("secondary")}>
            <FileUp className="h-4 w-4" aria-hidden />
            Cargue masivo
          </Link>
          <Button onClick={() => setDialogo({ tipo: "nuevo" })}>
            <Plus className="h-4 w-4" aria-hidden />
            Nuevo desprendible
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
            descripcion={periodo || busqueda ? "No hay resultados para los filtros aplicados." : "Cree uno individual o use el cargue masivo."}
          />
        ) : (
          <div className={isFetching && !isLoading ? "opacity-60 transition-opacity" : undefined}>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Devengado</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Deducciones</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </tr>
              </TableHeader>
              {isLoading ? (
                <TableSkeleton columnas={6} filas={6} />
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
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {formatCurrency(d.total_devengado)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {formatCurrency(d.total_deducciones)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(d.neto_a_pagar)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => setDialogo({ tipo: "ver", desprendible: d })}
                            className="rounded-lg p-2 text-texto-suave hover:bg-slate-100 hover:text-acento"
                            aria-label="Ver desprendible"
                            title="Ver"
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
                          <button
                            type="button"
                            onClick={() => setDialogo({ tipo: "editar", desprendible: d })}
                            className="hidden rounded-lg p-2 text-texto-suave hover:bg-slate-100 hover:text-acento sm:inline-flex"
                            aria-label="Editar desprendible"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDialogo({ tipo: "eliminar", desprendible: d })}
                            className="hidden rounded-lg p-2 text-texto-suave hover:bg-red-50 hover:text-error sm:inline-flex"
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

      {/* Nuevo */}
      <Modal abierto={dialogo?.tipo === "nuevo"} onCerrar={cerrar} titulo="Nuevo desprendible" ancho="xl">
        {colaboradores.isLoading ? (
          <CargandoPagina mensaje="Cargando colaboradores…" />
        ) : (
          <DesprendibleForm
            colaboradores={listaColaboradores}
            onEnviar={guardarNuevo}
            onCancelar={cerrar}
            enviando={crear.isPending}
          />
        )}
      </Modal>

      {/* Ver */}
      {dialogo?.tipo === "ver" ? (
        <Modal abierto onCerrar={cerrar} titulo="Desprendible de nómina" ancho="lg">
          <DesprendibleViewer desprendible={dialogo.desprendible} />
        </Modal>
      ) : null}

      {/* Editar */}
      {dialogo?.tipo === "editar" ? (
        <Modal abierto onCerrar={cerrar} titulo="Editar desprendible" descripcion={dialogo.desprendible.colaboradorNombre} ancho="xl">
          {colaboradores.isLoading ? (
            <CargandoPagina mensaje="Cargando colaboradores…" />
          ) : (
            <DesprendibleForm
              key={dialogo.desprendible.id}
              colaboradores={
                listaColaboradores.some((c) => c.id === dialogo.desprendible.colaboradorId)
                  ? listaColaboradores
                  : [
                      ...listaColaboradores,
                      {
                        id: dialogo.desprendible.colaboradorId,
                        cedula: dialogo.desprendible.colaboradorCedula,
                        nombres: dialogo.desprendible.colaboradorNombre,
                        apellidos: "",
                      } as (typeof listaColaboradores)[number],
                    ]
              }
              valoresIniciales={dialogo.desprendible}
              onEnviar={(datos) => guardarEdicion(dialogo.desprendible.id, datos)}
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
            <span className="font-semibold">{dialogo.desprendible.colaboradorNombre}</span>? Esta acción no se puede
            deshacer.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
