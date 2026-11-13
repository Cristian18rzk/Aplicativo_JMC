"use client";

import { Briefcase, Save, UserRound, type LucideIcon } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { crearColaboradorSchema } from "@/lib/validators/colaborador";
import {
  AREAS,
  ESTADOS_COLABORADOR,
  NOMBRES_DOCUMENTO,
  ROLES,
  TIPOS_CONTRATO,
  TIPOS_DOCUMENTO,
  type Colaborador,
  type ColaboradorInput,
} from "@/types/colaborador";

type ValoresFormulario = Record<keyof ColaboradorInput, string>;
type ErroresFormulario = Partial<Record<keyof ColaboradorInput, string>>;

const VALORES_VACIOS: ValoresFormulario = {
  tipo_documento: "CC",
  cedula: "",
  lugar_expedicion: "",
  nombres: "",
  apellidos: "",
  email: "",
  telefono: "",
  cargo: "",
  area: "Operativa",
  fecha_ingreso: "",
  tipo_contrato: "Indefinido",
  estado: "Activo",
  rol: "colaborador",
};

function aValoresFormulario(c: Colaborador | null | undefined): ValoresFormulario {
  if (!c) return VALORES_VACIOS;
  return {
    tipo_documento: c.tipo_documento,
    cedula: c.cedula,
    lugar_expedicion: c.lugar_expedicion,
    nombres: c.nombres,
    apellidos: c.apellidos,
    email: c.email,
    telefono: c.telefono,
    cargo: c.cargo,
    area: c.area,
    fecha_ingreso: c.fecha_ingreso,
    tipo_contrato: c.tipo_contrato,
    estado: c.estado,
    rol: c.rol,
  };
}

function Seccion({
  icono: Icono,
  titulo,
  descripcion,
  children,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-acento-suave">
          <Icono className="h-5 w-5 text-acento" aria-hidden />
        </div>
        <div>
          <CardTitle>{titulo}</CardTitle>
          <CardDescription>{descripcion}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</CardContent>
    </Card>
  );
}

interface ColaboradorFormProps {
  valoresIniciales?: Colaborador | null;
  onEnviar: (datos: ColaboradorInput) => Promise<unknown>;
  enviando?: boolean;
  textoBoton?: string;
  onCancelar?: () => void;
  /** Errores de campo devueltos por la API. */
  erroresServidor?: Record<string, string[] | undefined>;
}

/** Formulario completo de colaborador con validación Zod. */
export function ColaboradorForm({
  valoresIniciales,
  onEnviar,
  enviando = false,
  textoBoton = "Guardar",
  onCancelar,
  erroresServidor,
}: ColaboradorFormProps) {
  const [valores, setValores] = useState<ValoresFormulario>(() => aValoresFormulario(valoresIniciales));
  const [errores, setErrores] = useState<ErroresFormulario>({});

  const erroresVisibles: ErroresFormulario = { ...errores };
  if (erroresServidor) {
    for (const [campo, mensajes] of Object.entries(erroresServidor)) {
      if (mensajes?.[0] && !erroresVisibles[campo as keyof ColaboradorInput]) {
        erroresVisibles[campo as keyof ColaboradorInput] = mensajes[0];
      }
    }
  }

  const campo = (nombre: keyof ColaboradorInput) => ({
    name: nombre,
    value: valores[nombre],
    error: erroresVisibles[nombre],
    onChange: (e: { target: { value: string } }) => {
      const valor = e.target.value;
      setValores((v) => ({ ...v, [nombre]: valor }));
      if (errores[nombre]) setErrores((er) => ({ ...er, [nombre]: undefined }));
    },
  });

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = crearColaboradorSchema.safeParse(valores);
    if (!resultado.success) {
      const porCampo = z.flattenError(resultado.error).fieldErrors as Record<string, string[] | undefined>;
      const nuevos: ErroresFormulario = {};
      for (const [clave, mensajes] of Object.entries(porCampo)) {
        if (mensajes?.[0]) nuevos[clave as keyof ColaboradorInput] = mensajes[0];
      }
      setErrores(nuevos);
      // Enfoca el primer campo con error
      const primero = Object.keys(nuevos)[0];
      if (primero) document.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      return;
    }
    setErrores({});
    await onEnviar(resultado.data);
  };

  return (
    <form onSubmit={enviar} noValidate className="space-y-6">
      <Seccion icono={UserRound} titulo="Datos personales" descripcion="Identificación y contacto">
        <Select
          label="Tipo de documento"
          required
          opciones={TIPOS_DOCUMENTO.map((t) => ({ valor: t, etiqueta: `${NOMBRES_DOCUMENTO[t]} (${t})` }))}
          {...campo("tipo_documento")}
        />
        <Input
          label="Número de documento"
          required
          inputMode="numeric"
          autoComplete="off"
          maxLength={15}
          ayuda="Con este número ingresa al aplicativo"
          {...campo("cedula")}
        />
        <Input
          label="Lugar de expedición"
          autoComplete="off"
          placeholder="Ej.: Canalete - Córdoba"
          ayuda="Aparece en el certificado laboral"
          {...campo("lugar_expedicion")}
        />
        <Input label="Nombres" required autoComplete="off" {...campo("nombres")} />
        <Input label="Apellidos" required autoComplete="off" {...campo("apellidos")} />
        <Input label="Correo electrónico" type="email" ayuda="Opcional. No se usa para ingresar" {...campo("email")} />
        <Input label="Teléfono" type="tel" inputMode="tel" {...campo("telefono")} />
      </Seccion>

      <Seccion icono={Briefcase} titulo="Datos laborales" descripcion="Cargo, área y contrato">
        <Input label="Cargo" required {...campo("cargo")} />
        <Select label="Área" required opciones={AREAS} {...campo("area")} />
        <Input label="Fecha de ingreso" type="date" required {...campo("fecha_ingreso")} />
        <Select label="Tipo de contrato" required opciones={TIPOS_CONTRATO} {...campo("tipo_contrato")} />
        <Select label="Estado" required opciones={ESTADOS_COLABORADOR} {...campo("estado")} />
        <Select
          label="Rol en el aplicativo"
          required
          opciones={ROLES.map((r) => ({ valor: r, etiqueta: r === "admin" ? "Administrador" : "Colaborador" }))}
          {...campo("rol")}
        />
      </Seccion>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancelar ? (
          <Button variante="secondary" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" cargando={enviando}>
          {!enviando ? <Save className="h-4 w-4" aria-hidden /> : null}
          {textoBoton}
        </Button>
      </div>
    </form>
  );
}
