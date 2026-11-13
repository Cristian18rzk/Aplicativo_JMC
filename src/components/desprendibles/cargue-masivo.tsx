"use client";

import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, clasesBoton } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGenerarDesprendible, useLeerNomina } from "@/hooks/use-desprendibles";
import { mensajeDeError } from "@/lib/api-cliente";
import type { EstadoPagina, PaginaClasificada } from "@/lib/lector/tipos";
import { cn, formatCurrency, formatPeriodo } from "@/lib/utils";
import { NOMBRES_PLANTILLA } from "@/types/desprendible";
import { ZonaArchivos } from "./zona-archivos";

/**
 * Cargue masivo con el lector: se sube el PDF del programa de nómina (el de campo y/o los de las
 * nóminas 220/221), el lector dice a quién corresponde cada página y, al confirmar, se genera el
 * desprendible de cada persona con su plantilla y se guarda en su ficha.
 */

const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`;

type Guardado = "pendiente" | "guardando" | "guardado" | "error";

interface Fila extends PaginaClasificada {
  clave: string;
  archivo: string;
  incluir: boolean;
  guardado: Guardado;
  error: string;
}

const ESTADOS: Record<EstadoPagina, { texto: string; variante: "success" | "warning" | "neutral" | "destructive" | "default" }> = {
  listo: { texto: "Lista", variante: "success" },
  sin_ficha: { texto: "Sin ficha", variante: "warning" },
  revisar: { texto: "Revisar", variante: "destructive" },
  ya_cargado: { texto: "Ya cargado", variante: "neutral" },
  omitido: { texto: "Omitida", variante: "neutral" },
  ilegible: { texto: "No se pudo leer", variante: "destructive" },
};

/** Orden de la tabla: lo que se va a cargar primero, luego lo que necesita atención. */
const ORDEN: EstadoPagina[] = ["listo", "revisar", "sin_ficha", "ilegible", "ya_cargado", "omitido"];

export function CargueMasivo() {
  const leer = useLeerNomina();
  const generar = useGenerarDesprendible();
  const [filas, setFilas] = useState<Fila[]>([]);
  const [archivos, setArchivos] = useState<string[]>([]);
  const [leyendo, setLeyendo] = useState("");
  const [errorLectura, setErrorLectura] = useState("");
  const [guardando, setGuardando] = useState(false);

  const agregar = async (nuevos: File[]) => {
    setErrorLectura("");
    for (const archivo of nuevos.filter((a) => !archivos.includes(a.name))) {
      setLeyendo(archivo.name);
      try {
        const resultado = await leer.mutateAsync(archivo);
        setArchivos((lista) => [...lista, archivo.name]);
        setFilas((lista) => [
          ...lista,
          ...resultado.paginas.map((p) => ({
            ...p,
            clave: `${archivo.name}#${p.pagina}`,
            archivo: archivo.name,
            incluir: p.estado === "listo",
            guardado: "pendiente" as const,
            error: "",
          })),
        ]);
      } catch (error) {
        setErrorLectura(`${archivo.name}: ${mensajeDeError(error)}`);
      }
    }
    setLeyendo("");
  };

  const actualizar = (clave: string, cambios: Partial<Fila>) =>
    setFilas((lista) => lista.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)));

  const porGuardar = filas.filter((f) => f.estado === "listo" && f.incluir && f.guardado !== "guardado");
  const guardados = filas.filter((f) => f.guardado === "guardado").length;
  const conError = filas.filter((f) => f.guardado === "error").length;
  const conteo = (estado: EstadoPagina) => filas.filter((f) => f.estado === estado).length;
  const periodos = [...new Set(filas.flatMap((f) => (f.periodo ? [f.periodo] : [])))];

  /** Uno por uno: cada petición genera un PDF y lo sube a Airtable, y los errores quedan por persona. */
  const guardarTodos = async () => {
    setGuardando(true);
    for (const fila of porGuardar) {
      if (!fila.colaboradorId || !fila.contenido || !fila.formato) continue;
      actualizar(fila.clave, { guardado: "guardando", error: "" });
      try {
        await generar.mutateAsync({ colaboradorId: fila.colaboradorId, formato: fila.formato, contenido: fila.contenido });
        actualizar(fila.clave, { guardado: "guardado" });
      } catch (error) {
        actualizar(fila.clave, { guardado: "error", error: mensajeDeError(error) });
      }
    }
    setGuardando(false);
  };

  const reiniciar = () => {
    setFilas([]);
    setArchivos([]);
    setErrorLectura("");
  };

  const ordenadas = [...filas].sort(
    (a, b) => ORDEN.indexOf(a.estado) - ORDEN.indexOf(b.estado) || a.archivo.localeCompare(b.archivo) || a.pagina - b.pagina,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Suba el PDF del programa de nómina</CardTitle>
          <CardDescription>
            El de campo y los de las nóminas de administrativos y operadores (220 y 221). Puede subir varios a la vez. El
            lector reconoce cada página y busca la ficha por la cédula; todavía no se guarda nada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ZonaArchivos multiple onArchivos={agregar} deshabilitado={Boolean(leyendo) || guardando} />
          {leyendo ? (
            <p className="inline-flex items-center gap-2 text-sm text-texto-suave" aria-live="polite">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Leyendo {leyendo}…
            </p>
          ) : null}
          {errorLectura ? <p className="text-sm text-error">{errorLectura}</p> : null}
          {archivos.length ? (
            <p className="text-sm text-texto-suave">
              Leídos: {archivos.join(", ")}
              {periodos.length ? `. Periodo: ${periodos.map(formatPeriodo).join(", ")}` : ""}.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {filas.length ? (
        <Card>
          <CardHeader>
            <CardTitle>2. Revise a quién corresponde cada página</CardTitle>
            <CardDescription>
              Las páginas listas se generan con la plantilla de su grupo y se guardan en la ficha de cada persona. Puede
              quitar las que no quiera cargar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variante="neutral">{plural(filas.length, "página", "páginas")}</Badge>
              {ORDEN.map((estado) =>
                conteo(estado) ? (
                  <Badge key={estado} variante={ESTADOS[estado].variante}>
                    {ESTADOS[estado].texto}: {conteo(estado)}
                  </Badge>
                ) : null,
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-borde">
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead className="w-10">
                      <span className="sr-only">Cargar</span>
                    </TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead>En el PDF</TableHead>
                    <TableHead>Ficha y plantilla</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead>Estado</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {ordenadas.map((f) => {
                    const seCarga = f.estado === "listo";
                    return (
                      <TableRow key={f.clave} className={cn(!seCarga && "bg-slate-50/60")}>
                        <TableCell>
                          {seCarga ? (
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-acento"
                              checked={f.incluir}
                              disabled={guardando || f.guardado === "guardado"}
                              onChange={(e) => actualizar(f.clave, { incluir: e.target.checked })}
                              aria-label={`Cargar el desprendible de ${f.nombre}`}
                            />
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <p className="text-sm font-medium tabular-nums">Pág. {f.pagina}</p>
                          <p className="max-w-40 truncate text-xs text-texto-suave" title={f.archivo}>
                            {f.archivo}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{f.nombre || "—"}</p>
                          {f.documento ? <p className="text-xs text-texto-suave tabular-nums">{f.documento}</p> : null}
                        </TableCell>
                        <TableCell>
                          {f.colaboradorId ? (
                            <>
                              <Link href={`/admin/colaboradores/${f.colaboradorId}`} className="text-sm font-medium text-acento hover:underline">
                                {f.colaboradorNombre}
                              </Link>
                              {f.plantilla ? <p className="text-xs text-texto-suave">{NOMBRES_PLANTILLA[f.plantilla]}</p> : null}
                            </>
                          ) : (
                            <span className="text-sm text-texto-suave">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {f.neto !== undefined ? formatCurrency(f.neto) : "—"}
                        </TableCell>
                        <TableCell className="min-w-56">
                          {f.guardado === "guardado" ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-exito">
                              <CircleCheck className="h-4 w-4" aria-hidden /> Guardado
                            </span>
                          ) : f.guardado === "guardando" ? (
                            <span className="inline-flex items-center gap-1 text-sm text-texto-suave">
                              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> Guardando
                            </span>
                          ) : f.guardado === "error" ? (
                            <>
                              <span className="inline-flex items-center gap-1 text-sm text-error">
                                <CircleX className="h-4 w-4" aria-hidden /> Error
                              </span>
                              <p className="mt-0.5 text-xs text-error">{f.error}</p>
                            </>
                          ) : (
                            <>
                              <Badge variante={ESTADOS[f.estado].variante}>{ESTADOS[f.estado].texto}</Badge>
                              {f.mensaje ? <p className="mt-1 text-xs text-texto-suave">{f.mensaje}</p> : null}
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-2 border-t border-borde pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-texto-suave" aria-live="polite">
                {guardando
                  ? `Guardando… ${guardados} de ${guardados + porGuardar.length}`
                  : porGuardar.length
                    ? `${plural(porGuardar.length, "desprendible", "desprendibles")} para generar y guardar.`
                    : guardados
                      ? `${plural(guardados, "desprendible guardado", "desprendibles guardados")}${conError ? `, ${conError} con error` : ""}.`
                      : "No hay páginas listas para cargar."}
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variante="ghost" onClick={reiniciar} disabled={guardando}>
                  Empezar de nuevo
                </Button>
                {guardados && !guardando ? (
                  <Link href="/admin/desprendibles" className={clasesBoton("secondary")}>
                    Ver desprendibles
                  </Link>
                ) : null}
                <Button onClick={guardarTodos} disabled={!porGuardar.length} cargando={guardando}>
                  {porGuardar.length ? `Guardar ${plural(porGuardar.length, "desprendible", "desprendibles")}` : "Guardar desprendibles"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
