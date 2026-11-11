"use client";

import { CircleCheck, CircleX, FileText, LoaderCircle, Trash } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, clasesBoton } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSubirDesprendible } from "@/hooks/use-desprendibles";
import { mensajeDeError } from "@/lib/api-cliente";
import { formatPeriodo, formatTamano, periodoActual } from "@/lib/utils";
import { periodoSchema, validarArchivoPdf } from "@/lib/validators/desprendible";
import type { Colaborador } from "@/types/colaborador";
import { TIPOS_PERIODO, type TipoPeriodo } from "@/types/desprendible";
import { ZonaArchivos } from "./zona-archivos";

const MAXIMO_ARCHIVOS = 300;

/** "1 desprendible" / "3 desprendibles" */
const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`;

type Estado = "listo" | "subiendo" | "subido" | "error";

interface Item {
  clave: string;
  archivo: File;
  colaboradorId: string;
  /** Error de validación local o el devuelto por el servidor. */
  error: string;
  estado: Estado;
}

type ColaboradorBasico = Pick<Colaborador, "id" | "nombres" | "apellidos" | "cedula">;

/**
 * Busca en el nombre del archivo una secuencia de 5 a 12 dígitos que sea la cédula de un colaborador.
 * Si hay varias candidatas, solo se acepta cuando exactamente una corresponde a un colaborador.
 */
function detectarColaborador(nombre: string, porCedula: Map<string, ColaboradorBasico>): ColaboradorBasico | null {
  const candidatas = [...new Set(nombre.replace(/\.pdf$/i, "").match(/\d{5,12}/g) ?? [])];
  const encontrados = candidatas.map((c) => porCedula.get(c)).filter(Boolean) as ColaboradorBasico[];
  return encontrados.length === 1 ? encontrados[0] : null;
}

export function CargueMasivo({ colaboradores }: { colaboradores: ColaboradorBasico[] }) {
  const subir = useSubirDesprendible();
  const [periodo, setPeriodo] = useState(periodoActual);
  const [tipo, setTipo] = useState<TipoPeriodo>("Mensual");
  const [items, setItems] = useState<Item[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [errorPeriodo, setErrorPeriodo] = useState("");

  const porCedula = useMemo(() => new Map(colaboradores.map((c) => [c.cedula, c])), [colaboradores]);
  const opciones = useMemo(
    () =>
      colaboradores
        .map((c) => ({ valor: c.id, etiqueta: `${c.nombres} ${c.apellidos}`.trim() + ` · ${c.cedula}` }))
        .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es")),
    [colaboradores],
  );

  const agregar = (archivos: File[]) => {
    setItems((actuales) => {
      const nombres = new Set(actuales.map((i) => i.archivo.name));
      const nuevos = archivos
        .filter((a) => !nombres.has(a.name))
        .map<Item>((archivo) => {
          const invalido = validarArchivoPdf(archivo);
          const colaborador = invalido ? null : detectarColaborador(archivo.name, porCedula);
          return {
            clave: `${archivo.name}-${archivo.size}-${archivo.lastModified}`,
            archivo,
            colaboradorId: colaborador?.id ?? "",
            error: invalido ?? "",
            estado: "listo",
          };
        });
      return [...actuales, ...nuevos].slice(0, MAXIMO_ARCHIVOS);
    });
  };

  const actualizar = (clave: string, cambios: Partial<Item>) =>
    setItems((lista) => lista.map((i) => (i.clave === clave ? { ...i, ...cambios } : i)));

  const pendientes = items.filter((i) => i.estado !== "subido" && !validarArchivoPdf(i.archivo));
  const listos = pendientes.filter((i) => i.colaboradorId);
  const subidos = items.filter((i) => i.estado === "subido").length;
  const fallidos = items.filter((i) => i.estado === "error").length;
  const sinAsignar = pendientes.filter((i) => !i.colaboradorId).length;

  /** Sube uno por uno: así cada petición queda bajo el límite de tamaño y los errores se reportan por archivo. */
  const subirTodos = async () => {
    const periodoValido = periodoSchema.safeParse(periodo);
    if (!periodoValido.success) {
      setErrorPeriodo(periodoValido.error.issues[0]?.message ?? "Periodo inválido");
      return;
    }
    setProcesando(true);
    for (const item of listos) {
      actualizar(item.clave, { estado: "subiendo", error: "" });
      try {
        await subir.mutateAsync({
          datos: { colaboradorId: item.colaboradorId, periodo, tipo_periodo: tipo },
          archivo: item.archivo,
        });
        actualizar(item.clave, { estado: "subido" });
      } catch (error) {
        actualizar(item.clave, { estado: "error", error: mensajeDeError(error) });
      }
    }
    setProcesando(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Periodo de los desprendibles</CardTitle>
          <CardDescription>Todos los archivos de este cargue se registran con el mismo periodo y tipo.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Periodo"
            type="month"
            required
            value={periodo}
            disabled={procesando}
            onChange={(e) => {
              setPeriodo(e.target.value);
              setErrorPeriodo("");
            }}
            error={errorPeriodo}
          />
          <Select
            label="Tipo de periodo"
            required
            opciones={TIPOS_PERIODO}
            value={tipo}
            disabled={procesando}
            onChange={(e) => setTipo(e.target.value as TipoPeriodo)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Archivos PDF</CardTitle>
          <CardDescription>
            Incluya la cédula del colaborador en el nombre de cada archivo, por ejemplo{" "}
            <span className="font-mono text-xs text-texto">1098765432.pdf</span> o{" "}
            <span className="font-mono text-xs text-texto">desprendible_1098765432_octubre.pdf</span>. Los que no se
            reconozcan se pueden asignar a mano.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ZonaArchivos multiple onArchivos={agregar} deshabilitado={procesando} />

          {items.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variante="neutral">{plural(items.length, "archivo", "archivos")}</Badge>
                {listos.length ? <Badge variante="default">{plural(listos.length, "listo", "listos")} para subir</Badge> : null}
                {sinAsignar ? <Badge variante="warning">{sinAsignar} sin colaborador</Badge> : null}
                {subidos ? <Badge variante="success">{plural(subidos, "subido", "subidos")}</Badge> : null}
                {fallidos ? <Badge variante="destructive">{fallidos} con error</Badge> : null}
              </div>

              <div className="overflow-hidden rounded-xl border border-borde">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="w-28">Estado</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Quitar</span>
                      </TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const invalido = validarArchivoPdf(item.archivo);
                      return (
                        <TableRow key={item.clave}>
                          <TableCell className="max-w-56">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-acento" aria-hidden />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium" title={item.archivo.name}>
                                  {item.archivo.name}
                                </p>
                                <p className="text-xs text-texto-suave">{formatTamano(item.archivo.size)}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-56">
                            {invalido ? (
                              <span className="text-sm text-error">{invalido}</span>
                            ) : (
                              <Select
                                aria-label={`Colaborador para ${item.archivo.name}`}
                                placeholder="Seleccione el colaborador"
                                opciones={opciones}
                                value={item.colaboradorId}
                                disabled={procesando || item.estado === "subido"}
                                onChange={(e) => actualizar(item.clave, { colaboradorId: e.target.value, estado: "listo", error: "" })}
                                className="h-9"
                              />
                            )}
                            {item.estado === "error" && item.error ? (
                              <p className="mt-1 text-xs text-error">{item.error}</p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {item.estado === "subido" ? (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-exito">
                                <CircleCheck className="h-4 w-4" aria-hidden /> Subido
                              </span>
                            ) : item.estado === "subiendo" ? (
                              <span className="inline-flex items-center gap-1 text-sm text-texto-suave">
                                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Subiendo
                              </span>
                            ) : item.estado === "error" || invalido ? (
                              <span className="inline-flex items-center gap-1 text-sm text-error">
                                <CircleX className="h-4 w-4" aria-hidden /> Error
                              </span>
                            ) : item.colaboradorId ? (
                              <span className="text-sm text-texto">Listo</span>
                            ) : (
                              <span className="text-sm text-sol-oscuro">Sin asignar</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              disabled={procesando || item.estado === "subiendo"}
                              onClick={() => setItems((lista) => lista.filter((i) => i.clave !== item.clave))}
                              className="rounded-lg p-2 text-texto-suave hover:bg-error/10 hover:text-error disabled:opacity-40"
                              aria-label={`Quitar ${item.archivo.name}`}
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-borde pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-texto-suave" aria-live="polite">
              {procesando
                ? `Subiendo… ${subidos} de ${subidos + listos.length}`
                : listos.length
                  ? `${plural(listos.length, "desprendible", "desprendibles")} de ${formatPeriodo(periodo)} · ${tipo} para subir.`
                  : subidos
                    ? `${plural(subidos, "desprendible subido", "desprendibles subidos")}.`
                    : "Agregue los archivos PDF para continuar."}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              {subidos && !procesando ? (
                <Link href="/admin/desprendibles" className={clasesBoton("secondary")}>
                  Ver desprendibles
                </Link>
              ) : null}
              <Button onClick={subirTodos} disabled={!listos.length} cargando={procesando}>
                {listos.length ? `Subir ${plural(listos.length, "desprendible", "desprendibles")}` : "Subir desprendibles"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
