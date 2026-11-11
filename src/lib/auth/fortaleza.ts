/**
 * Reglas de la política de contraseñas y estimación de fortaleza.
 * Módulo compartido cliente/servidor: NO importa nada exclusivo del servidor.
 * La verificación contra la lista de contraseñas comunes vive en password.ts (solo servidor).
 */

export const LONGITUD_MINIMA = 8;
export const LONGITUD_MAXIMA = 128;

export interface Requisito {
  id: "longitud" | "mayuscula" | "minuscula" | "numero" | "especial";
  etiqueta: string;
  cumple: (password: string) => boolean;
}

export const REQUISITOS: readonly Requisito[] = [
  {
    id: "longitud",
    etiqueta: `Entre ${LONGITUD_MINIMA} y ${LONGITUD_MAXIMA} caracteres`,
    cumple: (p) => p.length >= LONGITUD_MINIMA && p.length <= LONGITUD_MAXIMA,
  },
  { id: "mayuscula", etiqueta: "Una letra mayúscula", cumple: (p) => /\p{Lu}/u.test(p) },
  { id: "minuscula", etiqueta: "Una letra minúscula", cumple: (p) => /\p{Ll}/u.test(p) },
  { id: "numero", etiqueta: "Un número", cumple: (p) => /\d/.test(p) },
  { id: "especial", etiqueta: "Un carácter especial (!@#$%…)", cumple: (p) => /[^\p{L}\p{N}]/u.test(p) },
];

export interface DatosPersonales {
  email?: string;
  nombre?: string;
}

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Fragmentos personales (≥3 letras) que no pueden aparecer dentro de la contraseña. */
export function fragmentosPersonales({ email, nombre }: DatosPersonales): string[] {
  const fragmentos = new Set<string>();
  if (email) {
    const correo = normalizar(email.trim());
    const [local] = correo.split("@");
    fragmentos.add(correo);
    if (local) {
      fragmentos.add(local);
      // "juan.perez" → "juan", "perez"
      local.split(/[^a-z0-9]+/).forEach((p) => fragmentos.add(p));
    }
  }
  if (nombre) {
    normalizar(nombre)
      .split(/[^a-z0-9]+/)
      .forEach((p) => fragmentos.add(p));
  }
  return [...fragmentos].filter((f) => f.length >= 3);
}

export function contieneDatosPersonales(password: string, datos: DatosPersonales): boolean {
  const p = normalizar(password);
  return fragmentosPersonales(datos).some((f) => p.includes(f));
}

/** Errores de la política que se pueden verificar en el navegador. */
export function erroresPoliticaBasica(password: string, datos: DatosPersonales = {}): string[] {
  const errores = REQUISITOS.filter((r) => !r.cumple(password)).map((r) => `Debe contener: ${r.etiqueta.toLowerCase()}`);
  if (contieneDatosPersonales(password, datos)) {
    errores.push("No puede contener tu correo ni tu nombre");
  }
  return errores;
}

// ─── Fortaleza ────────────────────────────────────────────────────────

export type NivelFortaleza = 0 | 1 | 2 | 3 | 4;

export interface Fortaleza {
  nivel: NivelFortaleza;
  etiqueta: "Muy débil" | "Débil" | "Aceptable" | "Fuerte" | "Muy fuerte";
  sugerencias: string[];
}

const ETIQUETAS: Fortaleza["etiqueta"][] = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"];

/** Patrones que un atacante prueba primero (complementa la lista de comunes del servidor). */
const PATRONES_DEBILES = [
  /^(.)\1+$/, // un solo carácter repetido
  /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|qwe|wer|ert|asd|sdf|zxc)/i,
  /(password|contrase|clave|qwerty|admin|bienvenid|colombia|nomina|jmc)/i,
  /(19|20)\d{2}$/, // termina en un año
];

/**
 * Estimación heurística de entropía: tamaño del alfabeto usado × longitud, con penalizaciones por
 * repeticiones, secuencias, palabras obvias y datos personales. No sustituye a la política (que es
 * la que se exige), solo orienta al usuario en tiempo real.
 */
export function evaluarFortaleza(password: string, datos: DatosPersonales = {}): Fortaleza {
  if (!password) return { nivel: 0, etiqueta: ETIQUETAS[0], sugerencias: [] };

  let alfabeto = 0;
  if (/\p{Ll}/u.test(password)) alfabeto += 26;
  if (/\p{Lu}/u.test(password)) alfabeto += 26;
  if (/\d/.test(password)) alfabeto += 10;
  if (/[^\p{L}\p{N}]/u.test(password)) alfabeto += 33;

  const unicos = new Set(password).size;
  // Longitud efectiva: los caracteres repetidos aportan menos
  const longitudEfectiva = Math.min(password.length, unicos * 1.5);
  let bits = longitudEfectiva * Math.log2(Math.max(alfabeto, 1));

  const sugerencias: string[] = [];
  if (PATRONES_DEBILES.some((p) => p.test(password))) {
    bits *= 0.6;
    sugerencias.push("Evita secuencias (123, abc, qwe), años y palabras obvias");
  }
  if (contieneDatosPersonales(password, datos)) {
    bits *= 0.4;
    sugerencias.push("No uses tu nombre ni tu correo");
  }
  if (password.length < 12) sugerencias.push("Usa 12 caracteres o más: una frase corta es fácil de recordar");
  if (alfabeto < 95 && password.length >= LONGITUD_MINIMA) {
    sugerencias.push("Combina mayúsculas, minúsculas, números y símbolos");
  }

  const cumpleTodo = REQUISITOS.every((r) => r.cumple(password));
  let nivel: NivelFortaleza = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
  // Sin cumplir la política nunca se muestra como "Aceptable" o mejor
  if (!cumpleTodo && nivel > 1) nivel = 1;

  return { nivel, etiqueta: ETIQUETAS[nivel], sugerencias: sugerencias.slice(0, 2) };
}
