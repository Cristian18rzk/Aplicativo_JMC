#!/usr/bin/env node
/**
 * Crea (o completa) las tablas del módulo de autenticación en la base de Airtable:
 *   Usuarios · refresh_tokens · auth_logs
 * y agrega a la tabla existente "Desprendibles" los campos para guardar el PDF subido.
 *
 * Uso:  npm run auth:setup
 * Requiere en .env: AIRTABLE_API_KEY (con permisos schema.bases:read y schema.bases:write) y AIRTABLE_BASE_ID.
 * Es idempotente: si una tabla ya existe, solo agrega los campos que falten.
 */

try {
  process.loadEnvFile(".env");
} catch {
  // Sin archivo .env: se usan las variables del entorno
}

const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } = process.env;
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error("✖ Faltan AIRTABLE_API_KEY y/o AIRTABLE_BASE_ID");
  process.exit(1);
}

const URL_META = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;

const texto = (name, description) => ({ name, type: "singleLineText", ...(description && { description }) });
const largo = (name, description) => ({ name, type: "multilineText", ...(description && { description }) });
const entero = (name, description) => ({ name, type: "number", options: { precision: 0 }, ...(description && { description }) });
const casilla = (name, description) => ({
  name,
  type: "checkbox",
  options: { icon: "check", color: "greenBright" },
  ...(description && { description }),
});
const fecha = (name, description) => ({
  name,
  type: "dateTime",
  options: { dateFormat: { name: "iso" }, timeFormat: { name: "24hour" }, timeZone: "utc" },
  ...(description && { description }),
});
const opciones = (name, valores, description) => ({
  name,
  type: "singleSelect",
  options: { choices: valores.map((v) => ({ name: v })) },
  ...(description && { description }),
});

const TABLAS = [
  {
    name: "Usuarios",
    description: "Cuentas de acceso. Contiene secretos (hashes): restrinja el acceso a esta tabla.",
    fields: [
      texto("cedula", "Identificador de inicio de sesión (solo dígitos)"),
      { name: "email", type: "email", description: "Informativo: no se usa para ingresar" },
      texto("nombre"),
      opciones("role", ["admin", "colaborador"]),
      texto("colaborador_id", "ID del registro en Colaboradores (vacío para admins sin ficha)"),
      casilla("activo", "Desmarcar impide iniciar sesión"),
      texto("password_hash", "bcrypt (12 rondas) del PIN o de la contraseña del admin. Nunca en texto plano"),
      largo("previous_password_hashes", "JSON con los hashes anteriores"),
      casilla("must_change_pin", "El secreto vigente es un PIN temporal: debe crear su PIN al ingresar"),
      fecha("temp_pin_expires", "Vencimiento del PIN temporal (7 días)"),
      entero("failed_login_attempts", "Fallos en la ventana actual de 15 minutos"),
      fecha("failed_window_start"),
      entero("total_failed_attempts", "Fallos acumulados desde el último login exitoso"),
      fecha("locked_until", "Bloqueo temporal (30 min tras 5 fallos)"),
      casilla("locked_permanently", "Bloqueo tras 10 fallos. Se levanta al generar un PIN temporal desde la ficha"),
      texto("reset_token_hash", "SHA-256 del token de un solo uso para crear el PIN (15 min)"),
      fecha("reset_token_expires"),
      fecha("last_password_change"),
      fecha("created_at"),
    ],
  },
  {
    name: "refresh_tokens",
    description: "Refresh tokens (solo su hash SHA-256). Rotados en cada uso.",
    fields: [
      texto("token_hash"),
      texto("user_id", "ID del registro en Usuarios"),
      texto("family_id", "Tokens derivados del mismo login"),
      fecha("expires_at"),
      fecha("auth_time", "Momento del login original"),
      fecha("created_at"),
      fecha("revoked_at"),
      opciones("revoked_reason", ["rotado", "logout", "password", "reutilizado", "cuenta", "admin"]),
      texto("ip"),
      largo("user_agent"),
    ],
  },
  {
    name: "auth_logs",
    description: "Auditoría de autenticación. Nunca contiene PIN, contraseñas ni tokens.",
    fields: [
      texto("registro"),
      opciones("evento", [
        "login_exitoso",
        "login_fallido",
        "login_rechazado_bloqueo",
        "cuenta_bloqueada",
        "cuenta_bloqueada_permanente",
        "rate_limit_ip",
        "pin_temporal_generado",
        "pin_temporal_vencido",
        "pin_creado",
        "primer_ingreso",
        "refresh_reutilizado",
        "logout",
      ]),
      fecha("fecha"),
      texto("cedula"),
      texto("user_id"),
      texto("ip"),
      largo("user_agent"),
      casilla("exito"),
      largo("detalle"),
    ],
  },
];

/** Campos que deben existir en tablas creadas previamente (no se crean las tablas, solo se completan). */
const CAMPOS_EN_TABLAS_EXISTENTES = [
  {
    tabla: "Colaboradores",
    fields: [opciones("tipo_documento", ["CC", "PPT", "CE", "TI"], "Tipo del documento de identidad (el número va en cedula)")],
  },
  {
    tabla: "Desprendibles",
    fields: [
      { name: "archivo", type: "multipleAttachments", options: { isReversed: false }, description: "PDF del desprendible" },
      texto("nombre_archivo", "Nombre original del PDF subido"),
      entero("tamano_bytes"),
      texto("cargado_por", "Administrador que subió el archivo"),
    ],
  },
];

async function api(url, init = {}) {
  const respuesta = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, "Content-Type": "application/json", ...init.headers },
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const detalle = cuerpo?.error?.message ?? cuerpo?.error?.type ?? JSON.stringify(cuerpo);
    throw new Error(`${respuesta.status} ${detalle}`);
  }
  return cuerpo;
}

async function main() {
  let existentes;
  try {
    ({ tables: existentes } = await api(URL_META));
  } catch (error) {
    console.error(`✖ No fue posible leer el esquema de la base: ${error.message}`);
    console.error("  Verifique que el token tenga los permisos schema.bases:read y schema.bases:write.");
    process.exit(1);
  }

  if (!existentes.some((t) => t.name === "Colaboradores")) {
    console.warn('⚠ No existe la tabla "Colaboradores" en esta base. ¿Es la base correcta?');
  }

  for (const definicion of TABLAS) {
    const actual = existentes.find((t) => t.name === definicion.name);
    if (!actual) {
      await api(URL_META, { method: "POST", body: JSON.stringify(definicion) });
      console.log(`✔ Tabla "${definicion.name}" creada (${definicion.fields.length} campos)`);
      continue;
    }
    const nombres = new Set(actual.fields.map((f) => f.name));
    const faltantes = definicion.fields.filter((f) => !nombres.has(f.name));
    for (const campo of faltantes) {
      await api(`${URL_META}/${actual.id}/fields`, { method: "POST", body: JSON.stringify(campo) });
      console.log(`  + ${definicion.name}.${campo.name}`);
    }
    console.log(
      faltantes.length
        ? `✔ Tabla "${definicion.name}" completada (${faltantes.length} campos nuevos)`
        : `✔ Tabla "${definicion.name}" ya estaba completa`,
    );
  }

  for (const { tabla, fields } of CAMPOS_EN_TABLAS_EXISTENTES) {
    const actual = existentes.find((t) => t.name === tabla);
    if (!actual) {
      console.warn(`⚠ No existe la tabla "${tabla}": créela primero (ver README).`);
      continue;
    }
    const nombres = new Set(actual.fields.map((f) => f.name));
    const faltantes = fields.filter((f) => !nombres.has(f.name));
    for (const campo of faltantes) {
      await api(`${URL_META}/${actual.id}/fields`, { method: "POST", body: JSON.stringify(campo) });
      console.log(`  + ${tabla}.${campo.name}`);
    }
    console.log(
      faltantes.length ? `✔ Tabla "${tabla}" completada (${faltantes.length} campos nuevos)` : `✔ Tabla "${tabla}" ya estaba completa`,
    );
  }

  console.log("\nSiguiente paso: npm run auth:seed  (crea el administrador inicial)");
}

main().catch((error) => {
  console.error("✖", error.message);
  process.exit(1);
});
