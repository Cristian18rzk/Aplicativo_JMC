"use client";

import { ArrowLeft, CircleCheck, TriangleExclamationPoint } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DesprendibleUpload } from "@/components/desprendibles/desprendible-upload";
import { Button, clasesBoton } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useBulkUpload } from "@/hooks/use-desprendibles";
import { useToast } from "@/hooks/use-toast";
import { mensajeDeError } from "@/lib/api-cliente";
import type { DesprendibleBulkRow, ResultadoBulk } from "@/types/desprendible";

export default function PaginaCargueMasivo() {
  const toast = useToast();
  const cargue = useBulkUpload();
  const [resultado, setResultado] = useState<ResultadoBulk | null>(null);
  const [reinicio, setReinicio] = useState(0);

  const confirmar = async (filas: DesprendibleBulkRow[], calcularAportes: boolean) => {
    try {
      const respuesta = await cargue.mutateAsync({ filas, calcularAportes });
      setResultado(respuesta);
      if (respuesta.creados > 0) {
        toast.success(`${respuesta.creados} desprendibles creados`, {
          descripcion: respuesta.errores.length ? `${respuesta.errores.length} filas con errores` : undefined,
        });
      } else {
        toast.error("No se creó ningún desprendible", { descripcion: "Revise los errores reportados" });
      }
    } catch (error) {
      toast.error("Error en el cargue masivo", { descripcion: mensajeDeError(error) });
    }
  };

  const nuevoCargue = () => {
    setResultado(null);
    setReinicio((n) => n + 1);
  };

  return (
    <div className="space-y-4">
      <Link href="/admin/desprendibles" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-acento">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a desprendibles
      </Link>

      {resultado ? (
        <Card>
          <CardHeader>
            <CardTitle>Resultado del cargue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
                <CircleCheck className="h-8 w-8 text-exito" aria-hidden />
                <div>
                  <p className="text-2xl font-bold text-exito">{resultado.creados}</p>
                  <p className="text-sm text-texto-suave">Desprendibles creados</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-4">
                <TriangleExclamationPoint className="h-8 w-8 text-alerta" aria-hidden />
                <div>
                  <p className="text-2xl font-bold text-amber-700">{resultado.errores.length}</p>
                  <p className="text-sm text-texto-suave">Filas rechazadas</p>
                </div>
              </div>
            </div>

            {resultado.errores.length > 0 ? (
              <div className="max-h-96 overflow-auto rounded-lg border border-borde">
                <Table>
                  <TableHeader className="sticky top-0">
                    <tr>
                      <TableHead>Fila</TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Motivo</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {resultado.errores.map((e) => (
                      <TableRow key={`${e.fila}-${e.cedula}`}>
                        <TableCell>{e.fila}</TableCell>
                        <TableCell className="font-mono text-xs">{e.cedula || "—"}</TableCell>
                        <TableCell className="text-sm text-error">{e.mensaje}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variante="secondary" onClick={nuevoCargue}>
                Realizar otro cargue
              </Button>
              <Link href="/admin/desprendibles" className={clasesBoton("primary")}>
                Ver desprendibles
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DesprendibleUpload key={reinicio} onConfirmar={confirmar} enviando={cargue.isPending} />
      )}
    </div>
  );
}
