"use client";

import { FileText, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatTamano, periodoActual } from "@/lib/utils";
import { desprendibleSchema, validarArchivoPdf } from "@/lib/validators/desprendible";
import type { Colaborador } from "@/types/colaborador";
import { TIPOS_PERIODO, type Desprendible, type DesprendibleInput, type TipoPeriodo } from "@/types/desprendible";
import { ZonaArchivos } from "./zona-archivos";

type Errores = Partial<Record<keyof DesprendibleInput | "archivo", string>>;

/**
 * Formulario para subir el PDF de un desprendible (o editar uno existente).
 * En edición el archivo es opcional: si se adjunta, reemplaza al actual.
 */
export function DesprendibleForm({
  colaboradores,
  valoresIniciales,
  colaboradorInicialId,
  onEnviar,
  onCancelar,
  enviando,
}: {
  colaboradores: Pick<Colaborador, "id" | "nombres" | "apellidos" | "cedula">[];
  valoresIniciales?: Desprendible;
  /** Preselecciona el colaborador (p. ej. al subir desde su ficha). */
  colaboradorInicialId?: string;
  onEnviar: (datos: DesprendibleInput, archivo: File | null) => void | Promise<void>;
  onCancelar: () => void;
  enviando?: boolean;
}) {
  const editando = Boolean(valoresIniciales);
  const [datos, setDatos] = useState<DesprendibleInput>({
    colaboradorId: valoresIniciales?.colaboradorId ?? colaboradorInicialId ?? "",
    periodo: valoresIniciales?.periodo ?? periodoActual(),
    tipo_periodo: valoresIniciales?.tipo_periodo ?? "Mensual",
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [errores, setErrores] = useState<Errores>({});

  const cambiar = <K extends keyof DesprendibleInput>(campo: K, valor: DesprendibleInput[K]) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const elegirArchivo = ([primero]: File[]) => {
    const error = validarArchivoPdf(primero);
    setErrores((e) => ({ ...e, archivo: error ?? undefined }));
    setArchivo(error ? null : primero);
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const resultado = desprendibleSchema.safeParse(datos);
    const nuevos: Errores = {};
    if (!resultado.success) {
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as keyof DesprendibleInput;
        nuevos[campo] ??= issue.message;
      }
    }
    if (!editando && !archivo) nuevos.archivo = "Adjunte el PDF del desprendible";
    setErrores(nuevos);
    if (Object.keys(nuevos).length || !resultado.success) return;
    void onEnviar(resultado.data, archivo);
  };

  const opciones = colaboradores
    .map((c) => ({ valor: c.id, etiqueta: `${c.nombres} ${c.apellidos}`.trim() + (c.cedula ? ` · C.C. ${c.cedula}` : "") }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));

  return (
    <form onSubmit={enviar} noValidate className="space-y-5">
      <Select
        label="Colaborador"
        required
        placeholder="Seleccione un colaborador"
        opciones={opciones}
        value={datos.colaboradorId}
        onChange={(e) => cambiar("colaboradorId", e.target.value)}
        error={errores.colaboradorId}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Periodo"
          type="month"
          required
          value={datos.periodo}
          onChange={(e) => cambiar("periodo", e.target.value)}
          error={errores.periodo}
        />
        <Select
          label="Tipo de periodo"
          required
          opciones={TIPOS_PERIODO}
          value={datos.tipo_periodo}
          onChange={(e) => cambiar("tipo_periodo", e.target.value as TipoPeriodo)}
          error={errores.tipo_periodo}
        />
      </div>

      {editando && valoresIniciales?.tieneArchivo && !archivo ? (
        <p className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-texto-suave">
          <FileText className="h-4 w-4 shrink-0 text-acento" aria-hidden />
          <span className="min-w-0 truncate">
            Archivo actual: <span className="font-medium text-texto">{valoresIniciales.nombre_archivo || "desprendible.pdf"}</span>
          </span>
        </p>
      ) : null}

      {archivo ? (
        <div className="flex items-center gap-3 rounded-xl border border-borde bg-white px-4 py-3">
          <FileText className="h-6 w-6 shrink-0 text-acento" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-texto">{archivo.name}</p>
            <p className="text-xs text-texto-suave">{formatTamano(archivo.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => setArchivo(null)}
            className="rounded-lg p-1.5 text-texto-suave hover:bg-slate-100 hover:text-error"
            aria-label="Quitar archivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <ZonaArchivos
          onArchivos={elegirArchivo}
          titulo={editando ? "Reemplazar el PDF (opcional)" : undefined}
          error={errores.archivo}
        />
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-borde pt-4 sm:flex-row sm:justify-end">
        <Button variante="secondary" onClick={onCancelar} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" cargando={enviando}>
          {editando ? "Guardar cambios" : "Subir desprendible"}
        </Button>
      </div>
    </form>
  );
}
