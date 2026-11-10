"use client";

import { Award, Download } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, clasesBoton } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useGenerarCertificado } from "@/hooks/use-certificados";
import { useToast } from "@/hooks/use-toast";
import { mensajeDeError } from "@/lib/api-cliente";
import type { Certificado, TipoCertificado } from "@/types/certificado";
import { TIPOS_CERTIFICADO } from "@/types/certificado";
import type { Colaborador } from "@/types/colaborador";

interface CertificadoGeneratorProps {
  /** Lista para seleccionar (modo administrador). */
  colaboradores?: Colaborador[];
  /** Colaborador fijo (modo autoservicio). */
  colaboradorFijoId?: string;
  /** Permite texto adicional libre (solo admin). */
  permitirTextoAdicional?: boolean;
  onGenerado?: (certificado: Certificado) => void;
}

/** Formulario para generar certificados laborales o de ingresos y retenciones. */
export function CertificadoGenerator({
  colaboradores = [],
  colaboradorFijoId,
  permitirTextoAdicional = false,
  onGenerado,
}: CertificadoGeneratorProps) {
  const toast = useToast();
  const generar = useGenerarCertificado();
  const [anioAnterior] = useState(() => new Date().getFullYear() - 1);

  const [colaboradorId, setColaboradorId] = useState(colaboradorFijoId ?? "");
  const [tipo, setTipo] = useState<TipoCertificado>("Laboral");
  const [incluirSalario, setIncluirSalario] = useState(true);
  const [dirigidoA, setDirigidoA] = useState("A QUIEN INTERESE");
  const [textoAdicional, setTextoAdicional] = useState("");
  const [anio, setAnio] = useState(String(anioAnterior));
  const [error, setError] = useState("");
  const [ultimo, setUltimo] = useState<Certificado | null>(null);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!colaboradorId) {
      setError("Seleccione un colaborador");
      return;
    }
    setError("");
    try {
      const certificado = await generar.mutateAsync({
        colaboradorId,
        tipo,
        incluirSalario,
        dirigidoA: dirigidoA.trim(),
        textoAdicional: permitirTextoAdicional ? textoAdicional.trim() : "",
        anio: tipo === "Ingresos y retenciones" ? Number(anio) : undefined,
      });
      setUltimo(certificado);
      toast.success("Certificado generado", { descripcion: `${certificado.tipo} · ${certificado.colaboradorNombre}` });
      onGenerado?.(certificado);
    } catch (err) {
      toast.error("No fue posible generar el certificado", { descripcion: mensajeDeError(err) });
    }
  };

  const anios = Array.from({ length: 6 }, (_, i) => String(anioAnterior + 1 - i));

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      {!colaboradorFijoId ? (
        <Select
          label="Colaborador"
          required
          placeholder="Seleccione un colaborador…"
          opciones={colaboradores.map((c) => ({ valor: c.id, etiqueta: `${c.apellidos} ${c.nombres} — ${c.cedula}` }))}
          value={colaboradorId}
          onChange={(e) => setColaboradorId(e.target.value)}
          error={error}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Tipo de certificado"
          opciones={TIPOS_CERTIFICADO}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoCertificado)}
        />
        {tipo === "Ingresos y retenciones" ? (
          <Select label="Año gravable" opciones={anios} value={anio} onChange={(e) => setAnio(e.target.value)} />
        ) : (
          <Input
            label="Dirigido a"
            value={dirigidoA}
            maxLength={150}
            onChange={(e) => setDirigidoA(e.target.value)}
            placeholder="A QUIEN INTERESE"
          />
        )}
      </div>

      {tipo === "Laboral" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={incluirSalario}
            onChange={(e) => setIncluirSalario(e.target.checked)}
            className="h-4 w-4 rounded accent-acento"
          />
          Incluir salario en el certificado
        </label>
      ) : null}

      {permitirTextoAdicional ? (
        <Textarea
          label="Texto adicional (opcional)"
          rows={3}
          maxLength={1500}
          value={textoAdicional}
          onChange={(e) => setTextoAdicional(e.target.value)}
          placeholder="Ej.: El colaborador se encuentra a paz y salvo con la empresa."
        />
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {ultimo ? (
          <a href={`/api/certificados/${ultimo.id}/pdf?descargar=1`} className={clasesBoton("secondary", "md")}>
            <Download className="h-4 w-4" aria-hidden />
            Descargar último generado
          </a>
        ) : null}
        <Button type="submit" cargando={generar.isPending}>
          {!generar.isPending ? <Award className="h-4 w-4" aria-hidden /> : null}
          Generar certificado
        </Button>
      </div>
    </form>
  );
}
