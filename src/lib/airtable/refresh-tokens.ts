import {
  TABLAS_AUTH,
  actualizar,
  actualizarVarios,
  crear,
  escaparFormula,
  fechaMs,
  listar,
  obtener,
  texto,
  type RegistroRest,
} from "./rest";

/** Refresh token almacenado (solo su hash SHA-256; el valor real vive únicamente en la cookie). */
export interface RefreshTokenRegistro {
  id: string;
  tokenHash: string;
  usuarioId: string;
  /** Todos los tokens derivados de un mismo login comparten familia (detección de reutilización). */
  familia: string;
  expiraEn: number;
  revocadoEn: number;
  /** Motivo de la revocación: rotado | logout | password | reutilizado | admin */
  motivoRevocacion: string;
  /** Momento del login original que dio origen a la familia. */
  authTime: number;
  creadoEn: number;
}

function mapear(r: RegistroRest): RefreshTokenRegistro {
  const c = r.fields;
  return {
    id: r.id,
    tokenHash: texto(c, "token_hash"),
    usuarioId: texto(c, "user_id"),
    familia: texto(c, "family_id"),
    expiraEn: fechaMs(c, "expires_at"),
    revocadoEn: fechaMs(c, "revoked_at"),
    motivoRevocacion: texto(c, "revoked_reason"),
    authTime: fechaMs(c, "auth_time"),
    creadoEn: fechaMs(c, "created_at"),
  };
}

export async function crearRefreshToken(datos: {
  tokenHash: string;
  usuarioId: string;
  familia: string;
  expiraEn: number;
  authTime: number;
  ip: string;
  userAgent: string;
}): Promise<RefreshTokenRegistro> {
  const registro = await crear(TABLAS_AUTH.refreshTokens, {
    token_hash: datos.tokenHash,
    user_id: datos.usuarioId,
    family_id: datos.familia,
    expires_at: new Date(datos.expiraEn).toISOString(),
    auth_time: new Date(datos.authTime).toISOString(),
    created_at: new Date().toISOString(),
    ip: datos.ip,
    user_agent: datos.userAgent.slice(0, 500),
  });
  return mapear(registro);
}

export async function getRefreshToken(id: string): Promise<RefreshTokenRegistro | null> {
  const registro = await obtener(TABLAS_AUTH.refreshTokens, id);
  return registro ? mapear(registro) : null;
}

export async function revocarRefreshToken(id: string, motivo: string): Promise<void> {
  await actualizar(TABLAS_AUTH.refreshTokens, id, {
    revoked_at: new Date().toISOString(),
    revoked_reason: motivo,
  });
}

async function revocarPorFormula(formula: string, motivo: string): Promise<number> {
  const activos = await listar(TABLAS_AUTH.refreshTokens, {
    filterByFormula: `AND(${formula}, {revoked_at} = BLANK())`,
    fields: ["token_hash"],
  });
  const ahora = new Date().toISOString();
  await actualizarVarios(
    TABLAS_AUTH.refreshTokens,
    activos.map((r) => ({ id: r.id, fields: { revoked_at: ahora, revoked_reason: motivo } })),
  );
  return activos.length;
}

/** Revoca todas las sesiones (refresh tokens activos) de un usuario. */
export function revocarTodosDelUsuario(usuarioId: string, motivo: string): Promise<number> {
  return revocarPorFormula(`{user_id} = "${escaparFormula(usuarioId)}"`, motivo);
}

/** Revoca toda una familia de tokens (se usa al detectar reutilización de un token ya rotado). */
export function revocarFamilia(familia: string, motivo: string): Promise<number> {
  return revocarPorFormula(`{family_id} = "${escaparFormula(familia)}"`, motivo);
}
