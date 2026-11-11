/**
 * Sesiones: access token corto (JWT cifrado de Auth.js, 15 min) + refresh token opaco (7 días) rotado
 * en cada uso y guardado hasheado en Airtable.
 *
 * Este módulo lo usan proxy.ts y la configuración de Auth.js. No debe importar "server-only" ni el
 * SDK de Airtable (proxy.ts no se empaqueta con la condición react-server).
 */
import { decode, encode } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";
import { registrarEventoAuth } from "@/lib/airtable/auth-logs";
import {
  crearRefreshToken,
  getRefreshToken,
  revocarFamilia,
  revocarRefreshToken,
  revocarTodosDelUsuario,
} from "@/lib/airtable/refresh-tokens";
import { TABLAS_AUTH, obtener, texto } from "@/lib/airtable/rest";
import { getUsuarioPorId, type UsuarioAuth } from "@/lib/airtable/usuarios";
import {
  COOKIE_SESION,
  DURACION_ACCESS_MS,
  DURACION_REFRESH_MS,
  GRACIA_ROTACION_MS,
  obtenerAuthSecret,
} from "./constantes";
import { generarTokenSeguro, hashesIguales, sha256 } from "./tokens";

/** Contenido del access token. Solo identificadores y rol: NUNCA datos sensibles. */
export interface DatosAcceso {
  /** ID del registro en "Usuarios". */
  sub: string;
  role: UsuarioAuth["role"];
  /** ID del colaborador asociado (vacío si no tiene). */
  cid: string;
  /** Vencimiento real del access token (ms). Auth.js renueva `exp` al reemitir; esto no se desliza. */
  accessExpires: number;
  /** Momento del login original (ms): se compara con last_password_change. */
  authTime: number;
}

export function crearDatosAcceso(
  usuario: Pick<UsuarioAuth, "id" | "role" | "colaboradorId">,
  authTime: number,
): DatosAcceso {
  return {
    sub: usuario.id,
    role: usuario.role,
    cid: usuario.colaboradorId,
    accessExpires: Date.now() + DURACION_ACCESS_MS,
    authTime,
  };
}

/** Cifra el access token con el mismo formato que Auth.js (JWE derivado de AUTH_SECRET + nombre de cookie). */
export function cifrarAccessToken(datos: DatosAcceso): Promise<string> {
  return encode({
    token: datos as unknown as JWT,
    secret: obtenerAuthSecret(),
    salt: COOKIE_SESION,
    maxAge: Math.floor(DURACION_ACCESS_MS / 1000),
  });
}

/** Descifra y valida el access token; null si es inválido o venció. */
export async function leerAccessToken(valor: string | undefined): Promise<DatosAcceso | null> {
  if (!valor) return null;
  try {
    const token = await decode({ token: valor, secret: obtenerAuthSecret(), salt: COOKIE_SESION });
    return tokenAccesoValido(token);
  } catch {
    return null;
  }
}

/** Valida la forma y vigencia de un JWT ya descifrado. */
export function tokenAccesoValido(token: JWT | null): DatosAcceso | null {
  if (!token?.sub || (token.role !== "admin" && token.role !== "colaborador")) return null;
  if (typeof token.accessExpires !== "number" || Date.now() >= token.accessExpires) return null;
  return {
    sub: token.sub,
    role: token.role,
    cid: typeof token.cid === "string" ? token.cid : "",
    accessExpires: token.accessExpires,
    authTime: typeof token.authTime === "number" ? token.authTime : 0,
  };
}

// ─── Refresh tokens ───────────────────────────────────────────────────

/** Valor de la cookie: "<id del registro>.<secreto>". Solo el hash del secreto se guarda en Airtable. */
function separarCookie(valor: string): { id: string; secreto: string } | null {
  const [id, secreto, ...resto] = valor.split(".");
  if (resto.length || !id || !secreto || !/^rec[a-zA-Z0-9]{14}$/.test(id) || !/^[A-Za-z0-9_-]{43}$/.test(secreto)) {
    return null;
  }
  return { id, secreto };
}

export async function emitirRefreshToken(datos: {
  usuarioId: string;
  authTime: number;
  ip: string;
  userAgent: string;
  familia?: string;
}): Promise<string> {
  const secreto = generarTokenSeguro();
  const registro = await crearRefreshToken({
    tokenHash: sha256(secreto),
    usuarioId: datos.usuarioId,
    familia: datos.familia ?? generarTokenSeguro().slice(0, 22),
    expiraEn: Date.now() + DURACION_REFRESH_MS,
    authTime: datos.authTime,
    ip: datos.ip,
    userAgent: datos.userAgent,
  });
  return `${registro.id}.${secreto}`;
}

/** Comprueba que la cuenta (y su ficha de colaborador) siga habilitada para tener sesión. */
export async function cuentaHabilitada(usuario: UsuarioAuth | null, authTime: number): Promise<boolean> {
  if (!usuario || !usuario.activo || usuario.lockedPermanently || usuario.lockedUntil > Date.now()) return false;
  if (!usuario.passwordHash) return false;
  // Si la contraseña cambió después del login, la sesión ya no es válida
  if (usuario.lastPasswordChange > authTime) return false;
  if (usuario.role === "colaborador") {
    if (!usuario.colaboradorId) return false;
    const colaborador = await obtener(TABLAS_AUTH.colaboradores, usuario.colaboradorId);
    if (!colaborador || texto(colaborador.fields, "estado") !== "Activo") return false;
  }
  return true;
}

export type ResultadoRotacion =
  | { ok: true; datos: DatosAcceso; accessToken: string; refreshCookie: string | null }
  | { ok: false; motivo: "invalido" | "expirado" | "revocado" | "reutilizado" | "cuenta" };

/**
 * Rota el refresh token: invalida el presentado y emite uno nuevo de la misma familia.
 *
 * Detección de reutilización (OAuth 2.0 Security BCP): si llega un token que ya fue rotado fuera de la
 * ventana de gracia, alguien tiene una copia (robo de cookie). Se revoca toda la familia, cerrando
 * la sesión tanto del atacante como de la víctima.
 */
export async function rotarSesion(valorCookie: string, ip: string, userAgent: string): Promise<ResultadoRotacion> {
  const partes = separarCookie(valorCookie);
  if (!partes) return { ok: false, motivo: "invalido" };

  const registro = await getRefreshToken(partes.id);
  if (!registro || !hashesIguales(sha256(partes.secreto), registro.tokenHash)) {
    return { ok: false, motivo: "invalido" };
  }

  const ahora = Date.now();
  let emitirNuevo = true;

  if (registro.revocadoEn) {
    const enGracia = registro.motivoRevocacion === "rotado" && ahora - registro.revocadoEn < GRACIA_ROTACION_MS;
    if (!enGracia) {
      if (registro.motivoRevocacion === "rotado") {
        await revocarFamilia(registro.familia, "reutilizado");
        await registrarEventoAuth({
          evento: "refresh_reutilizado",
          usuarioId: registro.usuarioId,
          ip,
          userAgent,
          exito: false,
          detalle: "Se presentó un refresh token ya rotado; se revocó la familia completa",
        });
        return { ok: false, motivo: "reutilizado" };
      }
      return { ok: false, motivo: "revocado" };
    }
    // Petición paralela con el token recién rotado: access token nuevo, sin rotar otra vez
    emitirNuevo = false;
  }

  if (registro.expiraEn <= ahora) return { ok: false, motivo: "expirado" };

  const usuario = await getUsuarioPorId(registro.usuarioId);
  if (!(await cuentaHabilitada(usuario, registro.authTime)) || !usuario) {
    await revocarTodosDelUsuario(registro.usuarioId, "cuenta");
    return { ok: false, motivo: "cuenta" };
  }

  let refreshCookie: string | null = null;
  if (emitirNuevo) {
    // Primero se crea el nuevo y luego se revoca el viejo: si algo falla a mitad, la sesión no se pierde
    refreshCookie = await emitirRefreshToken({
      usuarioId: usuario.id,
      authTime: registro.authTime,
      familia: registro.familia,
      ip,
      userAgent,
    });
    await revocarRefreshToken(registro.id, "rotado");
  }

  const datos = crearDatosAcceso(usuario, registro.authTime);
  return { ok: true, datos, accessToken: await cifrarAccessToken(datos), refreshCookie };
}

/** Revoca el refresh token de la cookie (logout de este dispositivo). Devuelve el ID de usuario si existía. */
export async function revocarSesionActual(valorCookie: string | undefined): Promise<string | null> {
  const partes = valorCookie ? separarCookie(valorCookie) : null;
  if (!partes) return null;
  const registro = await getRefreshToken(partes.id);
  if (!registro || !hashesIguales(sha256(partes.secreto), registro.tokenHash)) return null;
  if (!registro.revocadoEn) await revocarRefreshToken(registro.id, "logout");
  return registro.usuarioId;
}
