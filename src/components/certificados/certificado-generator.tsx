"use client";

import { Award, Download } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, clasesBoton } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useGenerarCertificado } from "@/hooks/use-certificados";
import { useToast } from "@/hooks/use-toast";
import { mensajeDeError } from "@/lib/api-cliente";
import type { Certificado } from "@/types/certificado";
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

/** Formulario para generar certificados laborales con los datos del colaborador. */
export function CertificadoGenerator({
  colaboradores = [],
  colaboradorFijoId,
  permitirTextoAdicional = false,
  onGenerado,
}: CertificadoGeneratorProps) {
  const toast = useToast();
  const generar = useGenerarCertificado();

  const [colaboradorId, setColaboradorId] = useState(colaboradorFijoId ?? "");
  const [dirigidoA, setDirigidoA] = useState("A QUIEN INTERESE");
  const [textoAdicional, setTextoAdicional] = useState("");
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
        tipo: "Laboral",
        dirigidoA: dirigidoA.trim(),
        textoAdicional: permitirTextoAdicional ? textoAdicional.trim() : "",
      });
      setUltimo(certificado);
      toast.success("Certificado generado", { descripcion: certificado.colaboradorNombre });
      onGenerado?.(certificado);
    } catch (err) {
      toast.error("No fue posible generar el certificado", { descripcion: mensajeDeError(err) });
    }
  };

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

      <Input
        label="Dirigido a"
        value={dirigidoA}
        maxLength={150}
        onChange={(e) => setDirigidoA(e.target.value)}
        placeholder="A QUIEN INTERESE"
      />

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
