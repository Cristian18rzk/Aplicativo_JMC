import { NextResponse, type NextRequest } from "next/server";
import * as colaboradoresDb from "@/lib/airtable/colaboradores";
import { getUsuarioPorColaborador, type UsuarioAuth } from "@/lib/airtable/usuarios";
import { ErrorApi, manejarErrorApi, validarIdRegistro } from "@/lib/api";
import { generarPinTemporal } from "@/lib/auth/cambio-pin";
import { verificarCsrf } from "@/lib/auth/csrf";
import { sincronizarCuentaColaborador } from "@/lib/auth/cuentas";
import { requerirAdmin } from "@/lib/auth/middleware";
import { obtenerIp, obtenerUserAgent } from "@/lib/auth/request";
import type { AccesoColaborador, RespuestaPinTemporal } from "@/types/auth";

interface Contexto {
  params: Promise<{ id: string }>;
}

const SIN_CACHE = { "Cache-Control": "no-store" };

function describirAcceso(cuenta: UsuarioAuth | null): AccesoColaborador {
  const ahora = Date.now();
  const base = { bloqueadoHasta: 0, pinTemporalExpira: 0, ultimoCambio: cuenta?.lastPasswordChange ?? 0 };
  if (!cuenta || !cuenta.passwordHash) return { ...base, estado: "sin_pin" };
  if (cuenta.lockedPermanently) return { ...base, estado: "bloqueado" };
  if (cuenta.lockedUntil > ahora) return { ...base, estado: "bloqueado", bloqueadoHasta: cuenta.lockedUntil };
  if (cuenta.debeCambiarPin) {
    return {
      ...base,
      estado: cuenta.pinTemporalExpira > ahora ? "pin_temporal" : "pin_temporal_vencido",
      pinTemporalExpira: cuenta.pinTemporalExpira,
    };
  }
  return { ...base, estado: "activo" };
}

/** GET /api/colaboradores/[id]/acceso — Estado del acceso del colaborador (solo admin). */
export async function GET(request: NextRequest, { params }: Contexto) {
  try {
    await requerirAdmin(request);
    const id = validarIdRegistro((await params).id);
    const cuenta = await getUsuarioPorColaborador(id);
    return NextResponse.json(describirAcceso(cuenta), { headers: SIN_CACHE });
  } catch (error) {
    return manejarErrorApi(error);
  }
}

/**
 * POST /api/colaboradores/[id]/acceso — Genera un PIN temporal (solo admin).
 * Sirve para cuando el colaborador olvidó su PIN o quedó bloqueado (el primer ingreso no lo necesita:
 * se hace en /auth/primer-ingreso).
 * El PIN en claro se devuelve una sola vez en esta respuesta y nunca se guarda.
 */
export async function POST(request: NextRequest, { params }: Contexto) {
  try {
    verificarCsrf(request);
    const admin = await requerirAdmin(request);
    const id = validarIdRegistro((await params).id);

    const colaborador = await colaboradoresDb.getById(id);
    if (!colaborador) throw new ErrorApi(404, "Colaborador no encontrado");
    if (colaborador.rol === "admin") {
      throw new ErrorApi(
        400,
        "Los administradores ingresan con contraseña, no con PIN. Se cambia con el comando npm run auth:seed.",
      );
    }
    if (colaborador.estado !== "Activo") {
      throw new ErrorApi(400, `El colaborador está "${colaborador.estado}". Actívelo antes de generar un PIN.`);
    }

    // Garantiza que la cuenta exista y tenga la cédula actual de la ficha
    const cuenta = await sincronizarCuentaColaborador(colaborador);
    const resultado: RespuestaPinTemporal = await generarPinTemporal(cuenta, admin.usuarioId, {
      ip: obtenerIp(request),
      userAgent: obtenerUserAgent(request),
    });
    return NextResponse.json(resultado, { headers: SIN_CACHE });
  } catch (error) {
    return manejarErrorApi(error);
  }
}
