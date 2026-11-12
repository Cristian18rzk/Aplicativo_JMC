import type { Rol } from "@/types/colaborador";
import {
  TABLAS_AUTH,
  actualizar,
  booleano,
  crear,
  eliminar,
  escaparFormula,
  fechaMs,
  listar,
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
  /** Identificador de inicio de sesión (solo dígitos). */
  cedula: string;
  /** Informativo: ya no se usa para ingresar ni para recuperar el acceso. */
  email: string;
  nombre: string;
  role: Rol;
  /** ID del registro en "Colaboradores" (vacío para administradores sin ficha de colaborador). */
  colaboradorId: string;
  activo: boolean;
  /** bcrypt del PIN, del PIN temporal o de la contraseña del admin. */
  passwordHash: string;
  /** Hashes anteriores (sin incluir el actual), el más reciente primero. */
  previousPasswordHashes: string[];
  /** true mientras el secreto vigente sea un PIN temporal generado por el admin. */
  debeCambiarPin: boolean;
  pinTemporalExpira: number;
  failedLoginAttempts: number;
  failedWindowStart: number;
  totalFailedAttempts: number;
  lockedUntil: number;
  lockedPermanently: boolean;
  /** SHA-256 del token de un solo uso para crear el PIN propio (campos reset_token_* en Airtable). */
  tokenCambioHash: string;
  tokenCambioExpira: number;
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
    cedula: texto(c, "cedula").replace(/\D/g, ""),
    email: texto(c, "email").toLowerCase(),
    nombre: texto(c, "nombre"),
    role: texto(c, "role") === "admin" ? "admin" : "colaborador",
    colaboradorId: texto(c, "colaborador_id"),
    activo: booleano(c, "activo"),
    passwordHash: texto(c, "password_hash"),
    previousPasswordHashes: leerHistorial(texto(c, "previous_password_hashes")),
    debeCambiarPin: booleano(c, "must_change_pin"),
    pinTemporalExpira: fechaMs(c, "temp_pin_expires"),
    failedLoginAttempts: numero(c, "failed_login_attempts"),
    failedWindowStart: fechaMs(c, "failed_window_start"),
    totalFailedAttempts: numero(c, "total_failed_attempts"),
    lockedUntil: fechaMs(c, "locked_until"),
    lockedPermanently: booleano(c, "locked_permanently"),
    tokenCambioHash: texto(c, "reset_token_hash"),
    tokenCambioExpira: fechaMs(c, "reset_token_expires"),
    lastPasswordChange: fechaMs(c, "last_password_change"),
    createdAt: fechaMs(c, "created_at") || new Date(registro.createdTime).getTime(),
  };
}

const iso = (ms: number) => (ms > 0 ? new Date(ms).toISOString() : VACIO);

export type CambiosUsuario = Partial<Omit<UsuarioAuth, "id" | "createdAt">>;

/** Convierte cambios parciales del modelo a campos de Airtable. */
function aCampos(datos: CambiosUsuario): CamposAirtable {
  const campos: CamposAirtable = {};
  if (datos.cedula !== undefined) campos.cedula = datos.cedula || VACIO;
  if (datos.email !== undefined) campos.email = datos.email.toLowerCase() || VACIO;
  if (datos.nombre !== undefined) campos.nombre = datos.nombre;
  if (datos.role !== undefined) campos.role = datos.role;
  if (datos.colaboradorId !== undefined) campos.colaborador_id = datos.colaboradorId || VACIO;
  if (datos.activo !== undefined) campos.activo = datos.activo;
  if (datos.passwordHash !== undefined) campos.password_hash = datos.passwordHash || VACIO;
  if (datos.previousPasswordHashes !== undefined) {
    campos.previous_password_hashes = JSON.stringify(datos.previousPasswordHashes);
  }
  if (datos.debeCambiarPin !== undefined) campos.must_change_pin = datos.debeCambiarPin;
  if (datos.pinTemporalExpira !== undefined) campos.temp_pin_expires = iso(datos.pinTemporalExpira);
  if (datos.failedLoginAttempts !== undefined) campos.failed_login_attempts = datos.failedLoginAttempts;
  if (datos.failedWindowStart !== undefined) campos.failed_window_start = iso(datos.failedWindowStart);
  if (datos.totalFailedAttempts !== undefined) campos.total_failed_attempts = datos.totalFailedAttempts;
  if (datos.lockedUntil !== undefined) campos.locked_until = iso(datos.lockedUntil);
  if (datos.lockedPermanently !== undefined) campos.locked_permanently = datos.lockedPermanently;
  if (datos.tokenCambioHash !== undefined) campos.reset_token_hash = datos.tokenCambioHash || VACIO;
  if (datos.tokenCambioExpira !== undefined) campos.reset_token_expires = iso(datos.tokenCambioExpira);
  if (datos.lastPasswordChange !== undefined) campos.last_password_change = iso(datos.lastPasswordChange);
  return campos;
}

export async function getUsuarioPorCedula(cedula: string): Promise<UsuarioAuth | null> {
  const normalizada = cedula.replace(/\D/g, "");
  if (!normalizada) return null;
  const registro = await primero(TABLAS_AUTH.usuarios, `{cedula} & "" = "${escaparFormula(normalizada)}"`);
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

/** Busca la cuenta dueña de un token de cambio de PIN (se busca por el hash SHA-256, hex). */
export async function getUsuarioPorTokenCambio(hash: string): Promise<UsuarioAuth | null> {
  if (!/^[a-f0-9]{64}$/.test(hash)) return null;
  const registro = await primero(TABLAS_AUTH.usuarios, `{reset_token_hash} = "${hash}"`);
  return registro ? mapear(registro) : null;
}

export async function crearUsuario(
  datos: Pick<UsuarioAuth, "cedula" | "email" | "nombre" | "role" | "colaboradorId" | "activo">,
): Promise<UsuarioAuth> {
  const registro = await crear(TABLAS_AUTH.usuarios, {
    ...aCampos({
      ...datos,
      previousPasswordHashes: [],
      debeCambiarPin: false,
      failedLoginAttempts: 0,
      totalFailedAttempts: 0,
      lockedPermanently: false,
    }),
    created_at: new Date().toISOString(),
  });
  return mapear(registro);
}

export async function actualizarUsuario(id: string, datos: CambiosUsuario): Promise<UsuarioAuth> {
  return mapear(await actualizar(TABLAS_AUTH.usuarios, id, aCampos(datos)));
}

/** Nombre para dejar constancia de quién hizo una acción (el JWT solo lleva identificadores). */
export async function nombreDelUsuario(usuarioId: string): Promise<string> {
  const usuario = await getUsuarioPorId(usuarioId);
  return usuario?.nombre || usuario?.cedula || "Usuario";
}

/** Situación del acceso de un colaborador, para los indicadores del panel (sin exponer secretos). */
export type SituacionAcceso = "con_pin" | "pin_temporal" | "sin_pin" | "bloqueado";

/**
 * Situación del acceso de cada cuenta de colaborador, por ID de ficha. Solo se leen los campos
 * necesarios y del hash solo se usa si existe: nada sensible sale de esta función.
 */
export async function situacionesDeAcceso(): Promise<Map<string, SituacionAcceso>> {
  const registros = await listar(TABLAS_AUTH.usuarios, {
    fields: ["colaborador_id", "role", "password_hash", "must_change_pin", "locked_until", "locked_permanently"],
  });
  const ahora = Date.now();
  const situaciones = new Map<string, SituacionAcceso>();
  for (const r of registros) {
    const c = r.fields;
    const colaboradorId = texto(c, "colaborador_id");
    if (!colaboradorId || texto(c, "role") === "admin") continue;
    const bloqueado = booleano(c, "locked_permanently") || fechaMs(c, "locked_until") > ahora;
    situaciones.set(
      colaboradorId,
      bloqueado
        ? "bloqueado"
        : !texto(c, "password_hash")
          ? "sin_pin"
          : booleano(c, "must_change_pin")
            ? "pin_temporal"
            : "con_pin",
    );
  }
  return situaciones;
}

export async function eliminarUsuario(id: string): Promise<void> {
  await eliminar(TABLAS_AUTH.usuarios, id);
}
