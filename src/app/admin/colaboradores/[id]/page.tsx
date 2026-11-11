"use client";

import { ArrowLeft, Award, Download, FileText, Pencil, Trash, Upload } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AccesoColaborador } from "@/components/colaboradores/acceso-colaborador";
import { ColaboradorCard } from "@/components/colaboradores/colaborador-card";
import { ColaboradorForm } from "@/components/colaboradores/colaborador-form";
import { DesprendibleForm } from "@/components/desprendibles/desprendible-form";
import { Button, clasesBoton } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CargandoPagina } from "@/components/ui/loading-spinner";
import { Modal } from "@/components/ui/modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useColaborador, useDeleteColaborador, useUpdateColaborador } from "@/hooks/use-colaboradores";
import { useCertificados } from "@/hooks/use-certificados";
import { useDesprendibles, useSubirDesprendible } from "@/hooks/use-desprendibles";
import { useToast } from "@/hooks/use-toast";
import { ErrorPeticion, mensajeDeError } from "@/lib/api-cliente";
import { formatDate, formatPeriodo } from "@/lib/utils";
import type { ColaboradorInput } from "@/types/colaborador";
import type { DesprendibleInput } from "@/types/desprendible";

function DetalleColaborador() {
  const { id } = useParams<{ id: string }>();
  const parametros = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const [editando, setEditando] = useState(parametros.get("editar") === "1");
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const { data: colaborador, isLoading, isError, error } = useColaborador(id);
  const desprendibles = useDesprendibles({ colaboradorId: id, porPagina: 6 });
  const certificados = useCertificados({ colaboradorId: id, porPagina: 5 });
  const subir = useSubirDesprendible();
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

  const subirDesprendible = async (datos: DesprendibleInput, archivo: File | null) => {
    if (!archivo) return;
    try {
      await subir.mutateAsync({ datos, archivo });
      toast.success("Desprendible cargado");
      setSubiendo(false);
    } catch (err) {
      toast.error("No fue posible cargar el desprendible", { descripcion: mensajeDeError(err) });
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

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Desprendibles de pago</CardTitle>
                <p className="text-sm text-texto-suave">Últimos documentos publicados para este colaborador.</p>
              </div>
              <Button tamano="sm" onClick={() => setSubiendo(true)}>
                <Upload className="h-4 w-4" aria-hidden />
                Subir desprendible
              </Button>
            </CardHeader>
            {desprendibles.data && desprendibles.data.datos.length > 0 ? (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="hidden sm:table-cell">Publicado</TableHead>
                    <TableHead className="text-right">PDF</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {desprendibles.data.datos.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        {formatPeriodo(d.periodo)} <span className="text-texto-suave">· {d.tipo_periodo}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDate(d.fecha_carga)}</TableCell>
                      <TableCell className="text-right">
                        {d.tieneArchivo ? (
                          <a
                            href={`/api/desprendibles/${d.id}/pdf?descargar=1`}
                            className="inline-flex rounded-lg p-2 text-texto-suave hover:bg-slate-100 hover:text-acento"
                            aria-label={`Descargar desprendible de ${formatPeriodo(d.periodo)}`}
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        ) : (
                          <span className="text-xs text-texto-suave">Sin archivo</span>
                        )}
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
            {desprendibles.data && desprendibles.data.total > desprendibles.data.datos.length ? (
              <div className="border-t border-borde px-5 py-3 text-right">
                <Link href="/admin/desprendibles" className="text-sm font-medium text-acento hover:underline">
                  Ver los {desprendibles.data.total} desprendibles
                </Link>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Certificados laborales</CardTitle>
                <p className="text-sm text-texto-suave">Certificados generados para este colaborador.</p>
              </div>
              <Link href="/admin/certificados" className={clasesBoton("secondary", "sm")}>
                <Award className="h-4 w-4" aria-hidden />
                Generar certificado
              </Link>
            </CardHeader>
            {certificados.data && certificados.data.datos.length > 0 ? (
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="hidden sm:table-cell">Generado por</TableHead>
                    <TableHead className="text-right">PDF</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {certificados.data.datos.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{formatDate(c.fecha_generacion)}</TableCell>
                      <TableCell className="hidden text-texto-suave sm:table-cell">{c.generado_por || "—"}</TableCell>
                      <TableCell className="text-right">
                        <a
                          href={`/api/certificados/${c.id}/pdf?descargar=1`}
                          className="inline-flex rounded-lg p-2 text-texto-suave hover:bg-slate-100 hover:text-acento"
                          aria-label={`Descargar certificado del ${formatDate(c.fecha_generacion)}`}
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
                icono={Award}
                titulo={certificados.isLoading ? "Cargando…" : "Sin certificados"}
                descripcion={certificados.isLoading ? undefined : "Aún no se han generado certificados para este colaborador."}
              />
            )}
          </Card>

          <AccesoColaborador colaborador={colaborador} />
        </>
      )}

      <Modal abierto={subiendo} onCerrar={() => setSubiendo(false)} titulo="Subir desprendible" descripcion={`${colaborador.nombres} ${colaborador.apellidos}`} ancho="lg">
        <DesprendibleForm
          colaboradores={[colaborador]}
          colaboradorInicialId={colaborador.id}
          onEnviar={subirDesprendible}
          onCancelar={() => setSubiendo(false)}
          enviando={subir.isPending}
        />
      </Modal>

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
