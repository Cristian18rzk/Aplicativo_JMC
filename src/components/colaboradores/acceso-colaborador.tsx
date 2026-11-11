"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Badge, type VarianteBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useAccesoColaborador, useGenerarPinTemporal } from "@/hooks/use-colaboradores";
import { useToast } from "@/hooks/use-toast";
import { mensajeDeError } from "@/lib/api-cliente";
import { LONGITUD_PIN } from "@/lib/auth/pin";
import type { AccesoColaborador as Acceso, EstadoAcceso, RespuestaPinTemporal } from "@/types/auth";
import type { Colaborador } from "@/types/colaborador";

const fechaHora = (ms: number) =>
  new Date(ms).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });

const ESTADOS: Record<EstadoAcceso, { etiqueta: string; variante: VarianteBadge }> = {
  sin_pin: { etiqueta: "Sin PIN", variante: "neutral" },
  pin_temporal: { etiqueta: "PIN temporal pendiente", variante: "warning" },
  pin_temporal_vencido: { etiqueta: "PIN temporal vencido", variante: "destructive" },
  activo: { etiqueta: "Activo", variante: "success" },
  bloqueado: { etiqueta: "Bloqueado", variante: "destructive" },
};

function explicacion(acceso: Acceso): string {
  switch (acceso.estado) {
    case "sin_pin":
      return "Aún no ha creado su PIN. La primera vez entra con «Es mi primera vez», escribe su cédula y crea su PIN.";
    case "pin_temporal":
      return `Debe ingresar con el PIN temporal y crear el suyo antes del ${fechaHora(acceso.pinTemporalExpira)}.`;
    case "pin_temporal_vencido":
      return "El PIN temporal venció sin usarse. Genere uno nuevo.";
    case "activo":
      return acceso.ultimoCambio
        ? `Ya creó su PIN personal (${fechaHora(acceso.ultimoCambio)}). Si lo olvidó, genere un PIN temporal.`
        : "Ya creó su PIN personal. Si lo olvidó, genere un PIN temporal.";
    case "bloqueado":
      return acceso.bloqueadoHasta
        ? `Bloqueado por intentos fallidos hasta ${fechaHora(acceso.bloqueadoHasta)}. Generar un PIN temporal lo desbloquea de inmediato.`
        : "Bloqueado por demasiados intentos fallidos. Genere un PIN temporal para desbloquearlo.";
  }
}

/** Tarjeta de la ficha del colaborador para gestionar su acceso con cédula + PIN. */
export function AccesoColaborador({ colaborador }: { colaborador: Colaborador }) {
  const toast = useToast();
  const acceso = useAccesoColaborador(colaborador.id);
  const generar = useGenerarPinTemporal();
  const [confirmar, setConfirmar] = useState(false);
  const [pinGenerado, setPinGenerado] = useState<RespuestaPinTemporal | null>(null);

  const esAdmin = colaborador.rol === "admin";
  const inactivo = colaborador.estado !== "Activo";
  const estado = acceso.data?.estado;
  const yaTieneAcceso = estado === "activo" || estado === "pin_temporal" || estado === "bloqueado";

  const confirmarGeneracion = async () => {
    try {
      setPinGenerado(await generar.mutateAsync(colaborador.id));
      setConfirmar(false);
    } catch (error) {
      toast.error("No fue posible generar el PIN", { descripcion: mensajeDeError(error) });
      setConfirmar(false);
    }
  };

  // El PIN en claro solo vive en esta ventana: al cerrarla se descarta
  const cerrarPin = () => setPinGenerado(null);
  const nombre = `${colaborador.nombres} ${colaborador.apellidos}`;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>Acceso al aplicativo</CardTitle>
          <p className="text-sm text-texto-suave">
            Ingresa con su cédula <span className="font-medium text-texto">{colaborador.cedula}</span> y un PIN de{" "}
            {LONGITUD_PIN} números.
          </p>
        </div>
        {acceso.data && !esAdmin ? <Badge variante={ESTADOS[acceso.data.estado].variante}>{ESTADOS[acceso.data.estado].etiqueta}</Badge> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {esAdmin ? (
          <p className="text-sm text-texto">
            Es administrador: su clave de ingreso no se gestiona desde aquí. Se asigna con el comando{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">npm run auth:seed</code>.
          </p>
        ) : acceso.isLoading ? (
          <p className="text-sm text-texto-suave">Consultando el estado del acceso…</p>
        ) : acceso.isError ? (
          <p className="text-sm text-error">{mensajeDeError(acceso.error)}</p>
        ) : acceso.data ? (
          <>
            <p className="text-sm text-texto">{explicacion(acceso.data)}</p>
            {inactivo ? (
              <p className="text-sm text-texto-suave">
                El colaborador está &quot;{colaborador.estado}&quot;: no puede ingresar ni recibir un PIN mientras no esté activo.
              </p>
            ) : (
              <Button variante="secondary" onClick={() => setConfirmar(true)}>
                <KeyRound className="h-4 w-4" aria-hidden />
                {yaTieneAcceso ? "Restablecer PIN" : "Generar PIN temporal"}
              </Button>
            )}
          </>
        ) : null}
      </CardContent>

      <Modal
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo={yaTieneAcceso ? "Restablecer PIN" : "Generar PIN temporal"}
        descripcion={nombre}
        ancho="sm"
        pie={
          <>
            <Button variante="secondary" onClick={() => setConfirmar(false)} disabled={generar.isPending}>
              Cancelar
            </Button>
            <Button onClick={confirmarGeneracion} cargando={generar.isPending}>
              Generar PIN
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-sm text-texto">
          <p>Se generará un PIN temporal de 6 números que vence en 7 días.</p>
          {yaTieneAcceso ? (
            <p>
              El PIN actual del colaborador <span className="font-semibold">dejará de funcionar</span> y se cerrarán sus
              sesiones abiertas.
            </p>
          ) : null}
          <p>Verifique la identidad de la persona antes de entregarle el PIN.</p>
        </div>
      </Modal>

      <Modal
        abierto={pinGenerado !== null}
        onCerrar={cerrarPin}
        titulo="PIN temporal generado"
        descripcion={nombre}
        ancho="sm"
        pie={<Button onClick={cerrarPin}>Listo, ya lo anoté</Button>}
      >
        {pinGenerado ? (
          <div className="space-y-4 text-sm text-texto">
            <div className="rounded-xl border border-borde bg-slate-50 px-4 py-5 text-center">
              <p className="text-xs uppercase tracking-wide text-texto-suave">Cédula</p>
              <p className="text-lg font-semibold tabular-nums">{colaborador.cedula}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-texto-suave">PIN temporal</p>
              <p className="font-mono text-4xl font-bold tracking-[0.3em] tabular-nums text-acento" aria-live="polite">
                {pinGenerado.pin}
              </p>
              <p className="mt-3 text-xs text-texto-suave">Vence el {fechaHora(pinGenerado.expira)}</p>
            </div>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Entréguele este PIN en persona (o por llamada, nunca por un grupo de chat).</li>
              <li>Debe ingresar con su cédula y este PIN.</li>
              <li>El aplicativo le pedirá crear su PIN personal de {LONGITUD_PIN} números.</li>
            </ol>
            <p className="text-texto-suave">
              Este PIN no se vuelve a mostrar. Si lo pierde, genere uno nuevo.
            </p>
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}
