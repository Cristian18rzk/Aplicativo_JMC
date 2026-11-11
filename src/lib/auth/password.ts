import "server-only";
import bcrypt from "bcryptjs";
import { BCRYPT_SALT_ROUNDS } from "./constantes";

/**
 * Hash bcrypt con 12 rondas (≈250 ms por hash). Se usa igual para el PIN, el PIN temporal y la
 * contraseña del admin: nunca se guardan en texto plano.
 */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export function verificarPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(password, hash);
}

/**
 * Hash señuelo: cuando la cédula no existe se compara igualmente contra este hash para que el tiempo
 * de respuesta sea el mismo que con un usuario real (evita enumerar cuentas midiendo latencias).
 */
let hashSenuelo: Promise<string> | null = null;
export async function compararSenuelo(password: string): Promise<void> {
  hashSenuelo ??= bcrypt.hash("senuelo-que-nunca-coincide", BCRYPT_SALT_ROUNDS);
  await bcrypt.compare(password, await hashSenuelo);
}
