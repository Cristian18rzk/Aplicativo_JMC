/**
 * Utilidades compartidas por los scripts de autenticación (fuera del bundle de Next.js).
 * La política de contraseñas fuertes solo aplica al administrador (los colaboradores usan PIN) y
 * solo se valida aquí, porque la contraseña del admin solo se asigna con npm run auth:seed.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile(".env");
} catch {
  // Sin archivo .env: se usan las variables del entorno
}

export const { AIRTABLE_API_KEY, AIRTABLE_BASE_ID } = process.env;
if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error("✖ Faltan AIRTABLE_API_KEY y/o AIRTABLE_BASE_ID");
  process.exit(1);
}

export const BCRYPT_SALT_ROUNDS = 12;

// ─── Airtable REST ────────────────────────────────────────────────────

export async function airtable(ruta, init = {}) {
  const respuesta = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, "Content-Type": "application/json", ...init.headers },
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(`Airtable ${respuesta.status}: ${cuerpo?.error?.message ?? cuerpo?.error?.type ?? cuerpo?.error ?? ""}`);
  }
  return cuerpo;
}

export async function listarTodo(tabla, formula) {
  const registros = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (formula) params.set("filterByFormula", formula);
    if (offset) params.set("offset", offset);
    const pagina = await airtable(`${encodeURIComponent(tabla)}?${params}`);
    registros.push(...pagina.records);
    offset = pagina.offset;
  } while (offset);
  return registros;
}

export const escapar = (v) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

// ─── Política de contraseñas ──────────────────────────────────────────

const rutaLista = fileURLToPath(new URL("../src/lib/auth/data/contrasenas-comunes.ts", import.meta.url));
const COMUNES = new Set(
  JSON.parse(readFileSync(rutaLista, "utf8").match(/const LISTA = ("(?:[^"\\]|\\.)*");/)[1]).split("\n"),
);

const normalizar = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function erroresPolitica(password, { email = "", nombre = "", cedula = "" }) {
  const errores = [];
  if (password.length < 8 || password.length > 128) errores.push("Debe tener entre 8 y 128 caracteres");
  if (!/\p{Lu}/u.test(password)) errores.push("Debe contener una letra mayúscula");
  if (!/\p{Ll}/u.test(password)) errores.push("Debe contener una letra minúscula");
  if (!/\d/.test(password)) errores.push("Debe contener un número");
  if (!/[^\p{L}\p{N}]/u.test(password)) errores.push("Debe contener un carácter especial");

  const correo = normalizar(email);
  const local = correo.split("@")[0] ?? "";
  const fragmentos = [correo, local, ...local.split(/[^a-z0-9]+/), ...normalizar(nombre).split(/[^a-z0-9]+/)].filter(
    (f) => f.length >= 3,
  );
  if (fragmentos.some((f) => normalizar(password).includes(f))) errores.push("No puede contener el correo ni el nombre");
  if (cedula && password.includes(cedula)) errores.push("No puede contener la cédula");

  const p = password.toLowerCase();
  const sinSimbolos = p.replace(/[^a-z0-9]+$/, "");
  if ([p, sinSimbolos, sinSimbolos.replace(/\d+$/, "")].some((v) => v && COMUNES.has(v))) {
    errores.push("Es una contraseña demasiado común");
  }
  return errores;
}

// ─── Entrada oculta en la terminal ────────────────────────────────────

export function preguntarOculto(pregunta) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error("No hay una terminal interactiva: defina ADMIN_PASSWORD en el entorno"));
      return;
    }
    process.stdout.write(pregunta);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let valor = "";
    const alPulsar = (tecla) => {
      for (const c of tecla) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", alPulsar);
          process.stdout.write("\n");
          resolve(valor);
          return;
        }
        if (c === "\u0003") process.exit(130); // Ctrl+C
        if (c === "\u007f" || c === "\b") valor = valor.slice(0, -1);
        else valor += c;
      }
    };
    stdin.on("data", alPulsar);
  });
}
