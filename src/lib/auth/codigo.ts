import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/** Vigencia del código de verificación: 10 minutos. */
export const VIGENCIA_CODIGO_MS = 10 * 60 * 1000;

/** Genera un código numérico aleatorio de 6 dígitos (criptográficamente seguro). */
export function generarCodigo(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Hash SHA-256 del código ligado a la cédula: nunca se guarda el código en texto plano. */
export function hashCodigo(cedula: string, codigo: string): string {
  const pimienta = process.env.JWT_SECRET ?? "";
  return createHash("sha256").update(`${cedula}:${codigo}:${pimienta}`).digest("hex");
}

/** Compara en tiempo constante el código digitado contra el hash almacenado. */
export function codigoCoincide(cedula: string, codigo: string, hashAlmacenado: string): boolean {
  if (!hashAlmacenado) return false;
  const a = Buffer.from(hashCodigo(cedula, codigo), "hex");
  const b = Buffer.from(hashAlmacenado, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Envía el código por correo usando la API REST de Resend (si RESEND_API_KEY está configurada).
 * Devuelve true si se envió.
 */
export async function enviarCodigoPorCorreo(destino: string, nombre: string, codigo: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !destino) return false;

  const empresa = process.env.EMPRESA_NOMBRE ?? "JMC";
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_REMITENTE ?? `Nómina ${empresa} <onboarding@resend.dev>`,
      to: [destino],
      subject: `Su código de acceso: ${codigo}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#1E293B">
          <h2 style="color:#1E40AF">${empresa} — Portal de nómina</h2>
          <p>Hola ${nombre.replace(/[<>&]/g, "")},</p>
          <p>Su código de verificación es:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1E40AF">${codigo}</p>
          <p>El código vence en 10 minutos. Si usted no solicitó este código, ignore este mensaje.</p>
        </div>`,
    }),
  });

  if (!respuesta.ok) {
    console.error("[Resend] Error enviando código:", respuesta.status, await respuesta.text());
    return false;
  }
  return true;
}
