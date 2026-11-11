"use client";

import { Eye, Pencil, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, varianteEstado } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSkeleton } from "@/components/ui/table";
import { iniciales } from "@/lib/utils";
import type { Colaborador } from "@/types/colaborador";

interface ColaboradorTableProps {
  colaboradores: Colaborador[];
  cargando?: boolean;
  accionVacio?: ReactNode;
}

/** Tabla de colaboradores: cédula, nombre, cargo, área, estado y acciones. */
export function ColaboradorTable({ colaboradores, cargando = false, accionVacio }: ColaboradorTableProps) {
  if (!cargando && colaboradores.length === 0) {
    return (
      <EmptyState
        icono={Users}
        titulo="No se encontraron colaboradores"
        descripcion="Ajuste la búsqueda o los filtros, o registre un nuevo colaborador."
        accion={accionVacio}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <tr>
          <TableHead>Documento</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead className="hidden md:table-cell">Cargo</TableHead>
          <TableHead className="hidden sm:table-cell">Área</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </tr>
      </TableHeader>
      {cargando ? (
        <TableSkeleton columnas={6} />
      ) : (
        <TableBody>
          {colaboradores.map((c) => {
            const nombre = `${c.nombres} ${c.apellidos}`;
            return (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs sm:text-sm">
                  {c.tipo_documento !== "CC" ? <span className="mr-1 text-texto-suave">{c.tipo_documento}</span> : null}
                  {c.cedula}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-acento-suave text-xs font-semibold text-acento sm:flex">
                      {iniciales(nombre)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{nombre}</p>
                      <p className="truncate text-xs text-texto-suave md:hidden">{c.cargo}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{c.cargo}</TableCell>
                <TableCell className="hidden sm:table-cell">{c.area}</TableCell>
                <TableCell>
                  <Badge variante={varianteEstado(c.estado)}>{c.estado}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Link
                      href={`/admin/colaboradores/${c.id}`}
                      className="rounded-lg p-2 text-texto-suave transition-colors hover:bg-slate-100 hover:text-acento"
                      aria-label={`Ver ${nombre}`}
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/admin/colaboradores/${c.id}?editar=1`}
                      className="rounded-lg p-2 text-texto-suave transition-colors hover:bg-slate-100 hover:text-acento"
                      aria-label={`Editar ${nombre}`}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      )}
    </Table>
  );
}
