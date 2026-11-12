"use client";

import { ArrowLeft, Briefcase, ExternalLink, Sprout, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { clasesBoton } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useColaboradores } from "@/hooks/use-colaboradores";
import {
  DESCRIPCION_PLANTILLA,
  NOMBRES_PLANTILLA,
  PLANTILLAS_DESPRENDIBLE,
  plantillaSegunArea,
  type PlantillaDesprendible,
} from "@/types/desprendible";

const DETALLE: Record<PlantillaDesprendible, { icono: LucideIcon; rasgos: string[] }> = {
  administrativo: {
    icono: Briefcase,
    rasgos: [
      "Formato formal y compacto",
      "Salario básico y días liquidados",
      "Devengados y deducciones lado a lado",
      "Firmas de la empresa y del empleado",
    ],
  },
  colaborador: {
    icono: Sprout,
    rasgos: [
      "Letra grande, fácil de leer impreso",
      "El valor a recibir destacado arriba",
      "Días trabajados, labor y zona",
      "\"Lo que ganaste\" y \"Descuentos\" en una sola columna",
    ],
  },
};

export default function PaginaPlantillas() {
  const colaboradores = useColaboradores({ porPagina: 1000 });
  const conteo = (plantilla: PlantillaDesprendible) =>
    (colaboradores.data?.datos ?? []).filter((c) => c.estado === "Activo" && plantillaSegunArea(c.area) === plantilla)
      .length;

  return (
    <div className="space-y-4">
      <Link href="/admin/desprendibles" className="inline-flex items-center gap-1 text-sm text-texto-suave hover:text-acento">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Volver a desprendibles
      </Link>

      <p className="max-w-3xl text-sm text-texto-suave">
        Los desprendibles del personal administrativo y los de los colaboradores de campo usan plantillas distintas. A
        cada trabajador le corresponde una según el <span className="font-medium text-texto">área</span> de su ficha. Las
        vistas previas usan datos de ejemplo; el diseño definitivo de cada una se ajustará más adelante.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {PLANTILLAS_DESPRENDIBLE.map((plantilla) => {
          const { icono: Icono, rasgos } = DETALLE[plantilla];
          return (
            <Card key={plantilla}>
              <CardHeader className="flex-row items-start gap-3">
                <div
                  className={
                    plantilla === "administrativo"
                      ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-oro-suave text-oro-oscuro"
                      : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sol-suave text-sol-oscuro"
                  }
                >
                  <Icono className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle>{NOMBRES_PLANTILLA[plantilla]}</CardTitle>
                  <CardDescription>{DESCRIPCION_PLANTILLA[plantilla]}</CardDescription>
                </div>
                <Badge variante="neutral">
                  {colaboradores.isLoading ? "…" : `${conteo(plantilla)} activos`}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1.5 text-sm text-texto">
                  {rasgos.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-acento" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
                <a
                  href={`/api/desprendibles/plantillas/${plantilla}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={clasesBoton("secondary")}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Ver vista previa
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
