"use client";

import { ArrowLeft, KeyRound, Send, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CargandoPagina } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { mensajeDeError } from "@/lib/api-cliente";
import { loginSchema, verifySchema } from "@/lib/validators/auth";

const ESPERA_REENVIO = 60;

function FormularioLogin() {
  const { login, verify } = useAuth();
  const toast = useToast();
  const parametros = useSearchParams();
  const redirigir = parametros.get("redirigir");

  const [paso, setPaso] = useState<"cedula" | "codigo">("cedula");
  const [cedula, setCedula] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [codigoDesarrollo, setCodigoDesarrollo] = useState<string | undefined>();
  const [enviando, setEnviando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const inputCodigo = useRef<HTMLInputElement>(null);

  // Cuenta regresiva para reenviar el código
  useEffect(() => {
    if (segundos <= 0) return;
    const t = window.setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [segundos]);

  const solicitarCodigo = async (e?: FormEvent) => {
    e?.preventDefault();
    const resultado = loginSchema.safeParse({ cedula });
    if (!resultado.success) {
      setError(resultado.error.issues[0]?.message ?? "Cédula inválida");
      return;
    }
    setError("");
    setEnviando(true);
    try {
      const respuesta = await login(resultado.data.cedula);
      setMensaje(respuesta.destino ? `${respuesta.mensaje} (${respuesta.destino})` : respuesta.mensaje);
      setCodigoDesarrollo(respuesta.codigoDesarrollo);
      setCodigo("");
      setPaso("codigo");
      setSegundos(ESPERA_REENVIO);
      window.setTimeout(() => inputCodigo.current?.focus(), 50);
    } catch (err) {
      toast.error("No fue posible solicitar el código", { descripcion: mensajeDeError(err) });
    } finally {
      setEnviando(false);
    }
  };

  const validarCodigo = async (e: FormEvent) => {
    e.preventDefault();
    const resultado = verifySchema.safeParse({ cedula, codigo });
    if (!resultado.success) {
      setError(resultado.error.issues[0]?.message ?? "Código inválido");
      return;
    }
    setError("");
    setEnviando(true);
    try {
      const usuario = await verify(resultado.data.cedula, resultado.data.codigo, redirigir);
      toast.success(`Bienvenido(a), ${usuario.nombre.split(" ")[0]}`);
    } catch (err) {
      setError(mensajeDeError(err));
      setEnviando(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-acento text-lg font-bold text-white shadow-sm">
          JMC
        </div>
        <h1 className="text-2xl font-bold text-texto">Portal de nómina</h1>
        <p className="mt-1 text-sm text-texto-suave">Consulte sus desprendibles y certificados laborales</p>
      </div>

      <div className="rounded-lg border border-borde bg-white p-6 shadow-sm sm:p-8">
        {paso === "cedula" ? (
          <form onSubmit={solicitarCodigo} noValidate className="space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-texto">
              <KeyRound className="h-4 w-4 text-acento" aria-hidden />
              Ingreso con cédula
            </div>
            <Input
              label="Número de cédula"
              inputMode="numeric"
              autoComplete="username"
              placeholder="Sin puntos ni espacios"
              maxLength={12}
              value={cedula}
              onChange={(e) => {
                setCedula(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              error={error}
              autoFocus
            />
            <Button type="submit" tamano="lg" className="w-full" cargando={enviando}>
              {!enviando ? <Send className="h-4 w-4" aria-hidden /> : null}
              Enviar código
            </Button>
          </form>
        ) : (
          <form onSubmit={validarCodigo} noValidate className="space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-texto">
              <ShieldCheck className="h-4 w-4 text-acento" aria-hidden />
              Verificación
            </div>
            <p className="rounded-lg bg-acento-suave px-3 py-2 text-sm text-acento">{mensaje}</p>
            {codigoDesarrollo ? (
              <p className="rounded-lg border border-alerta/40 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Código de desarrollo: <span className="font-mono font-bold tracking-widest">{codigoDesarrollo}</span>
              </p>
            ) : null}
            <Input
              ref={inputCodigo}
              label="Código de 6 dígitos"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              maxLength={6}
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              error={error}
              className="text-center font-mono text-xl tracking-[0.5em]"
            />
            <Button type="submit" tamano="lg" className="w-full" cargando={enviando} disabled={codigo.length !== 6}>
              Ingresar
            </Button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setPaso("cedula");
                  setError("");
                  setCodigoDesarrollo(undefined);
                }}
                className="inline-flex items-center gap-1 text-texto-suave hover:text-acento"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Cambiar cédula
              </button>
              <button
                type="button"
                onClick={() => solicitarCodigo()}
                disabled={segundos > 0 || enviando}
                className="font-medium text-acento hover:underline disabled:cursor-not-allowed disabled:text-texto-suave disabled:no-underline"
              >
                {segundos > 0 ? `Reenviar en ${segundos}s` : "Reenviar código"}
              </button>
            </div>
          </form>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-texto-suave">
        ¿Problemas para ingresar? Comuníquese con el área de Talento Humano.
      </p>
    </div>
  );
}

export default function PaginaLogin() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-b from-acento-suave/60 to-fondo px-4 py-10">
      <Suspense fallback={<CargandoPagina />}>
        <FormularioLogin />
      </Suspense>
    </main>
  );
}
