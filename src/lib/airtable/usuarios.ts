import type { Rol } from "@/types/colaborador";
import {
  TABLAS_AUTH,
  actualizar,
  booleano,
  crear,
  eliminar,
  escaparFormula,
  fechaMs,
  numero,
  obtener,
  primero,
  texto,
  type CamposAirtable,
  type RegistroRest,
} from "./rest";

/**
 * Cuenta de acceso (tabla "Usuarios"). Contiene secretos: NUNCA se envía al navegador.
 * Las fechas se manejan en milisegundos desde epoch (0 = vacío).
 */
export interface UsuarioAuth {
  id: string;
  email: string;
  nombre: string;
  role: Rol;
  /** ID del registro en "Colaboradores" (vacío para administradores sin ficha de colaborador). */
  colaboradorId: string;
  activo: boolean;
  passwordHash: string;
  /** Hashes de las contraseñas anteriores (sin incluir la actual), la más reciente primero. */
  previousPasswordHashes: string[];
  failedLoginAttempts: number;
  failedWindowStart: number;
  totalFailedAttempts: number;
  lockedUntil: number;
  lockedPermanently: boolean;
  resetTokenHash: string;
  resetTokenExpires: number;
  lastPasswordChange: number;
  createdAt: number;
}

/** null limpia un campo en Airtable. */
const VACIO = null;

function leerHistorial(valor: string): string[] {
  if (!valor) return [];
  try {
    const lista: unknown = JSON.parse(valor);
    return Array.isArray(lista) ? lista.filter((h): h is string => typeof h === "string") : [];
  } catch {
    return [];
  }
}

function mapear(registro: RegistroRest): UsuarioAuth {
  const c = registro.fields;
  return {
    id: registro.id,
    email: texto(c, "email").toLowerCase(),
    nombre: texto(c, "nombre"),
    role: texto(c, "role") === "admin" ? "admin" : "colaborador",
    colaboradorId: texto(c, "colaborador_id"),
    activo: booleano(c, "activo"),
    passwordHash: texto(c, "password_hash"),
    previousPasswordHashes: leerHistorial(texto(c, "previous_password_hashes")),
    failedLoginAttempts: numero(c, "failed_login_attempts"),
    failedWindowStart: fechaMs(c, "failed_window_start"),
    totalFailedAttempts: numero(c, "total_failed_attempts"),
    lockedUntil: fechaMs(c, "locked_until"),
    lockedPermanently: booleano(c, "locked_permanently"),
    resetTokenHash: texto(c, "reset_token_hash"),
    resetTokenExpires: fechaMs(c, "reset_token_expires"),
    lastPasswordChange: fechaMs(c, "last_password_change"),
    createdAt: fechaMs(c, "created_at") || new Date(registro.createdTime).getTime(),
  };
}

const iso = (ms: number) => (ms > 0 ? new Date(ms).toISOString() : VACIO);

/** Convierte cambios parciales del modelo a campos de Airtable. */
function aCampos(datos: Partial<Omit<UsuarioAuth, "id" | "createdAt">>): CamposAirtable {
  const campos: CamposAirtable = {};
  if (datos.email !== undefined) campos.email = datos.email.toLowerCase();
  if (datos.nombre !== undefined) campos.nombre = datos.nombre;
  if (datos.role !== undefined) campos.role = datos.role;
  if (datos.colaboradorId !== undefined) campos.colaborador_id = datos.colaboradorId || VACIO;
  if (datos.activo !== undefined) campos.activo = datos.activo;
  if (datos.passwordHash !== undefined) campos.password_hash = datos.passwordHash || VACIO;
  if (datos.previousPasswordHashes !== undefined) {
    campos.previous_password_hashes = JSON.stringify(datos.previousPasswordHashes);
  }
  if (datos.failedLoginAttempts !== undefined) campos.failed_login_attempts = datos.failedLoginAttempts;
  if (datos.failedWindowStart !== undefined) campos.failed_window_start = iso(datos.failedWindowStart);
  if (datos.totalFailedAttempts !== undefined) campos.total_failed_attempts = datos.totalFailedAttempts;
  if (datos.lockedUntil !== undefined) campos.locked_until = iso(datos.lockedUntil);
  if (datos.lockedPermanently !== undefined) campos.locked_permanently = datos.lockedPermanently;
  if (datos.resetTokenHash !== undefined) campos.reset_token_hash = datos.resetTokenHash || VACIO;
  if (datos.resetTokenExpires !== undefined) campos.reset_token_expires = iso(datos.resetTokenExpires);
  if (datos.lastPasswordChange !== undefined) campos.last_password_change = iso(datos.lastPasswordChange);
  return campos;
}

export async function getUsuarioPorEmail(email: string): Promise<UsuarioAuth | null> {
  const normalizado = email.trim().toLowerCase();
  const registro = await primero(TABLAS_AUTH.usuarios, `LOWER({email}) = "${escaparFormula(normalizado)}"`);
  return registro ? mapear(registro) : null;
}

export async function getUsuarioPorId(id: string): Promise<UsuarioAuth | null> {
  const registro = await obtener(TABLAS_AUTH.usuarios, id);
  return registro ? mapear(registro) : null;
}

export async function getUsuarioPorColaborador(colaboradorId: string): Promise<UsuarioAuth | null> {
  const registro = await primero(TABLAS_AUTH.usuarios, `{colaborador_id} = "${escaparFormula(colaboradorId)}"`);
  return registro ? mapear(registro) : null;
}

/** Busca la cuenta dueña de un token de restablecimiento (se busca por el hash SHA-256, hex). */
export async function getUsuarioPorResetHash(hash: string): Promise<UsuarioAuth | null> {
  if (!/^[a-f0-9]{64}$/.test(hash)) return null;
  const registro = await primero(TABLAS_AUTH.usuarios, `{reset_token_hash} = "${hash}"`);
  return registro ? mapear(registro) : null;
}

export async function crearUsuario(
  datos: Pick<UsuarioAuth, "email" | "nombre" | "role" | "colaboradorId" | "activo"> &
    Partial<Pick<UsuarioAuth, "passwordHash" | "lastPasswordChange">>,
): Promise<UsuarioAuth> {
  const registro = await crear(TABLAS_AUTH.usuarios, {
    ...aCampos({
      ...datos,
      previousPasswordHashes: [],
      failedLoginAttempts: 0,
      totalFailedAttempts: 0,
      lockedPermanently: false,
    }),
    created_at: new Date().toISOString(),
  });
  return mapear(registro);
}

export async function actualizarUsuario(
  id: string,
  datos: Partial<Omit<UsuarioAuth, "id" | "createdAt">>,
): Promise<UsuarioAuth> {
  return mapear(await actualizar(TABLAS_AUTH.usuarios, id, aCampos(datos)));
}

export async function eliminarUsuario(id: string): Promise<void> {
  await eliminar(TABLAS_AUTH.usuarios, id);
}
