import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Token aleatorio criptográficamente seguro: 32 bytes (256 bits) en base64url. */
export function generarTokenSeguro(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * SHA-256 en hex. Basta para tokens aleatorios de 256 bits: a diferencia de una contraseña no se
 * pueden adivinar por diccionario, así que no hace falta un hash lento como bcrypt.
 */
export function sha256(valor: string): string {
  return createHash("sha256").update(valor, "utf8").digest("hex");
}

/** Comparación en tiempo constante de dos hashes hex (evita ataques de temporización). */
export function hashesIguales(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && bufA.length > 0 && timingSafeEqual(bufA, bufB);
}

/** Clave estable y no reversible para rate limiting por email (no se guarda el email en claro). */
export function claveEmail(email: string): string {
  return sha256(`rl:${email.trim().toLowerCase()}`).slice(0, 32);
}
