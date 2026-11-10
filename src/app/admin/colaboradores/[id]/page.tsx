"use client";

import { ArrowLeft, Download, FileText, Pencil, Trash } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ColaboradorCard } from "@/components/colaboradores/colaborador-card";
import { ColaboradorForm } from "@/components/colaboradores/colaborador-form";
import { Button, clasesBoton } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CargandoPagina } from "@/components/ui/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useColaborador, useDeleteColaborador, useUpdateColaborador } from "@/hooks/use-colaboradores";
import { useDesprendibles } from "@/hooks/use-desprendibles";
import { useToast } from "@/hooks/use-toast";
import { ErrorPeticion, mensajeDeError } from "@/lib/api-cliente";
import { formatCurrency, formatPeriodo } from "@/lib/utils";
import type { ColaboradorInput } from "@/types/colaborador";

function DatoDetalle({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-texto-suave">{etiqueta}</dt>
      <dd className="text-sm font-medium text-texto">{valor || "—"}</dd>
    </div>
  );
}

function DetalleColaborador() {
  const { id } = useParams<{ id: string }>();
  const parametros = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const [editando, setEditando] = useState(parametros.get("editar") === "1");
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const { data: colaborador, isLoading, isError, error } = useColaborador(id);
  const desprendibles = useDesprendibles({ colaboradorId: id, porPagina: 6 });
  const actualizar = useUpdateColaborador();
  const eliminar = useDeleteColaborador();

  if (isLoading) return <CargandoPagina mensaje="Cargando colaborador…" />;
  if (isError || !colaborador) {
    return (
      <EmptyState
        titulo="Colaborador no encontrado"
        descripcion={isError ? mensajeDeError(error) : "El registro no existe o fue eliminado."}
        accion={
          <Link href="/admin/colaboradores" className={clasesBoton("secondary")}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver a la lista
          </Link>
        }
      />
    );
  }

  const guardar = async (datos: ColaboradorInput) => {
    try {
      await actualizar.mutateAsync({ id, datos });
      toast.success("Cambios guardados");
      setEditando(false);
      router.replace(`/admin/colaboradores/${id}`);
    } catch (err) {
      toast.error("No fue posible guardar los cambios", { descripcion: mensajeDeError(err) });
    }
  };

  const confirmarEliminacion = async () => {
    try {
      await eliminar.mutateAsync(id);
      toast.success("Colaborador eliminado");
      router.push("/admin/colaboradores");
    } catch (err) {
      toast.error("No fue posible eliminar", { descripcion: mensajeDeError(err) });
      setConfirmarEliminar(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/admin/colaboradores" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-acento">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a colaboradores
        </Link>
        {!editando ? (
          <div className="flex gap-2">
            <Button variante="secondary" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" aria-hidden />
              Editar
            </Button>
            <Button variante="destructive" onClick={() => setConfirmarEliminar(true)}>
              <Trash className="h-4 w-4" aria-hidden />
              Eliminar
            </Button>
          </div>
        ) : null}
      </div>

      {editando ? (
        <ColaboradorForm
          key={colaborador.id}
          valoresIniciales={colaborador}
          onEnviar={guardar}
          enviando={actualizar.isPending}
          textoBoton="Guardar cambios"
          onCancelar={() => {
            setEditando(false);
            router.replace(`/admin/colaboradores/${id}`);
          }}
          erroresServidor={actualizar.error instanceof ErrorPeticion ? actualizar.error.detalles : undefined}
        />
      ) : (
        <>
          <ColaboradorCard colaborador={colaborador} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Seguridad social</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <DatoDetalle etiqueta="EPS" valor={colaborador.eps} />
                  <DatoDetalle etiqueta="Fondo de pensiones" valor={colaborador.fondo_pensiones} />
                  <DatoDetalle etiqueta="ARL" valor={colaborador.arl} />
                  <DatoDetalle etiqueta="Caja de compensación" valor={colaborador.caja_compensacion} />
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Datos bancarios y acceso</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <DatoDetalle etiqueta="Banco" valor={colaborador.banco} />
                  <DatoDetalle etiqueta="Número de cuenta" valor={colaborador.cuenta_bancaria} />
                  <DatoDetalle etiqueta="Rol" valor={colaborador.rol === "admin" ? "Administrador" : "Colaborador"} />
                  <DatoDetalle etiqueta="Salario base" valor={formatCurrency(colaborador.salario_base)} />
                </dl>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Últimos desprendibles</CardTitle>
              <Link href="/admin/desprendibles" className="text-sm font-medium text-acento hover:underline">
                Ir a desprendibles
              </Link>
            </CardHeader>
            {desprendibles.data && desprendibles.data.datos.length > 0 ? (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-right">Neto a pagar</TableHead>
                    <TableHead className="text-right">PDF</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {desprendibles.data.datos.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {formatPeriodo(d.periodo)} <span className="text-texto-suave">· {d.tipo_periodo}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(d.neto_a_pagar)}</TableCell>
                      <TableCell className="text-right">
                        <a
                          href={`/api/desprendibles/${d.id}/pdf?descargar=1`}
                          className="inline-flex rounded-lg p-2 text-texto-suave hover:bg-slate-100 hover:text-acento"
                          aria-label="Descargar PDF"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                icono={FileText}
                titulo={desprendibles.isLoading ? "Cargando…" : "Sin desprendibles"}
                descripcion={desprendibles.isLoading ? undefined : "Este colaborador aún no tiene desprendibles."}
              />
            )}
          </Card>
        </>
      )}

      <Modal
        abierto={confirmarEliminar}
        onCerrar={() => setConfirmarEliminar(false)}
        titulo="Eliminar colaborador"
        ancho="sm"
        pie={
          <>
            <Button variante="secondary" onClick={() => setConfirmarEliminar(false)} disabled={eliminar.isPending}>
              Cancelar
            </Button>
            <Button variante="destructive" onClick={confirmarEliminacion} cargando={eliminar.isPending}>
              Eliminar definitivamente
            </Button>
          </>
        }
      >
        <p className="text-sm text-texto">
          ¿Está seguro de eliminar a{" "}
          <span className="font-semibold">
            {colaborador.nombres} {colaborador.apellidos}
          </span>
          ? Esta acción no se puede deshacer. Si el colaborador ya no trabaja en la empresa, considere cambiar su estado a
          &quot;Retirado&quot; para conservar el historial.
        </p>
      </Modal>
    </div>
  );
}

export default function PaginaDetalleColaborador() {
  return (
    <Suspense fallback={<CargandoPagina />}>
      <DetalleColaborador />
    </Suspense>
  );
}
