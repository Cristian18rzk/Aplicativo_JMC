"use client";

import { Award, Download, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import type { Certificado } from "@/types/certificado";

/** Historial de certificados con acciones de ver y descargar PDF. */
export function CertificadoTable({
  certificados,
  cargando,
  mostrarColaborador = true,
}: {
  certificados: Certificado[];
  cargando: boolean;
  mostrarColaborador?: boolean;
}) {
  if (!cargando && certificados.length === 0) {
    return <EmptyState icono={Award} titulo="No hay certificados" descripcion="Los certificados generados aparecerán aquí." />;
  }

  return (
    <Table>
      <TableHeader>
        <tr>
          {mostrarColaborador ? <TableHead>Colaborador</TableHead> : null}
          <TableHead>Tipo</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead className="hidden lg:table-cell">Generado por</TableHead>
          <TableHead className="text-right">PDF</TableHead>
        </tr>
      </TableHeader>
      {cargando ? (
        <TableSkeleton columnas={mostrarColaborador ? 5 : 4} filas={4} />
      ) : (
        <TableBody>
          {certificados.map((c) => (
            <TableRow key={c.id}>
              {mostrarColaborador ? (
                <TableCell>
                  <p className="font-medium">{c.colaboradorNombre}</p>
                  <p className="text-xs text-texto-suave">C.C. {c.colaboradorCedula}</p>
                </TableCell>
              ) : null}
              <TableCell>
                <Badge variante={c.tipo === "Laboral" ? "default" : "warning"}>{c.tipo}</Badge>
                {c.contenido?.ingresos ? (
                  <span className="ml-1.5 text-xs text-texto-suave">Año {c.contenido.ingresos.anio}</span>
                ) : null}
              </TableCell>
              <TableCell className="whitespace-nowrap">{formatDate(c.fecha_generacion)}</TableCell>
              <TableCell className="hidden text-sm text-texto-suave lg:table-cell">{c.generado_por || "—"}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-0.5">
                  <a
                    href={`/api/certificados/${c.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-texto-suave hover:bg-slate-100 hover:text-acento"
                    aria-label="Ver PDF"
                    title="Ver PDF"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <a
                    href={`/api/certificados/${c.id}/pdf?descargar=1`}
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
  );
}
