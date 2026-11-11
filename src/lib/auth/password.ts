import "server-only";
import bcrypt from "bcryptjs";
import { BCRYPT_SALT_ROUNDS, HISTORIAL_CONTRASENAS } from "./constantes";
import { CONTRASENAS_COMUNES } from "./data/contrasenas-comunes";
import { erroresPoliticaBasica, type DatosPersonales } from "./fortaleza";

/** Hash bcrypt con 12 rondas (≈250 ms por hash: lento a propósito contra ataques offline). */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export function verificarPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(password, hash);
}

/**
 * Hash señuelo: cuando el email no existe se compara igualmente contra este hash para que el tiempo
 * de respuesta sea el mismo que con un usuario real (evita enumerar cuentas midiendo latencias).
 */
let hashSenuelo: Promise<string> | null = null;
export async function compararSenuelo(password: string): Promise<void> {
  hashSenuelo ??= bcrypt.hash("senuelo-que-nunca-coincide", BCRYPT_SALT_ROUNDS);
  await bcrypt.compare(password, await hashSenuelo);
}

export function esContrasenaComun(password: string): boolean {
  const p = password.toLowerCase();
  // También se rechazan variantes triviales: "Password1!" → "password1", "password"
  const sinSimbolosFinales = p.replace(/[^a-z0-9]+$/, "");
  const sinNumerosFinales = sinSimbolosFinales.replace(/\d+$/, "");
  return [p, sinSimbolosFinales, sinNumerosFinales].some((v) => v.length > 0 && CONTRASENAS_COMUNES.has(v));
}

/** Política completa (OWASP): reglas básicas + datos personales + lista de las 10.000 más comunes. */
export function validarPoliticaPassword(password: string, datos: DatosPersonales): string[] {
  const errores = erroresPoliticaBasica(password, datos);
  if (esContrasenaComun(password)) {
    errores.push("Es una contraseña demasiado común. Elige una más difícil de adivinar");
  }
  return errores;
}

/** true si la contraseña coincide con la actual o con alguna de las anteriores del historial. */
export async function estaEnHistorial(
  password: string,
  hashActual: string,
  anteriores: string[],
): Promise<boolean> {
  const historial = [hashActual, ...anteriores].filter(Boolean).slice(0, HISTORIAL_CONTRASENAS);
  const resultados = await Promise.all(historial.map((h) => bcrypt.compare(password, h)));
  return resultados.some(Boolean);
}

/** Nuevo historial tras un cambio: la actual pasa a ser "anterior"; se guardan N-1 anteriores. */
export function nuevoHistorial(hashActual: string, anteriores: string[]): string[] {
  return [hashActual, ...anteriores].filter(Boolean).slice(0, HISTORIAL_CONTRASENAS - 1);
}
