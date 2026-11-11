/**
 * Parámetros de seguridad del módulo de autenticación (un solo lugar para auditarlos).
 */

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/** Vida del access token (JWT de Auth.js). */
export const DURACION_ACCESS_MS = 15 * MINUTO;
/** Vida del refresh token. Se rota en cada uso. */
export const DURACION_REFRESH_MS = 7 * DIA;
/**
 * Ventana de gracia para un refresh token recién rotado: si varias peticiones paralelas llegan con el
 * mismo token justo al expirar el access token, las rezagadas reciben un access token nuevo en lugar
 * de disparar la detección de reutilización (que cerraría la sesión).
 */
export const GRACIA_ROTACION_MS = 30 * 1000;

// ─── Fuerza bruta ─────────────────────────────────────────────────────
export const MAX_FALLOS_CUENTA = 5;
export const VENTANA_FALLOS_CUENTA_MS = 15 * MINUTO;
export const BLOQUEO_TEMPORAL_MS = 30 * MINUTO;
/** Fallos acumulados (desde el último login exitoso) que bloquean la cuenta hasta desbloqueo manual. */
export const MAX_FALLOS_ACUMULADOS = 10;

export const MAX_LOGINS_POR_IP = 20;
export const VENTANA_LOGINS_IP_MS = 15 * MINUTO;
/** Delay progresivo: 1s, 2s, 4s, 8s… con tope para no agotar el tiempo de la función serverless. */
export const DELAY_MAXIMO_MS = 16 * 1000;

// ─── Restablecimiento ─────────────────────────────────────────────────
export const VIGENCIA_RESET_MS = 1 * HORA;
export const MAX_RESETS_POR_EMAIL = 3;
export const VENTANA_RESETS_EMAIL_MS = 1 * HORA;
export const MAX_RESETS_POR_IP = 10;
export const VENTANA_RESETS_IP_MS = 1 * HORA;
export const MAX_INTENTOS_RESET_POR_IP = 10;
export const VENTANA_INTENTOS_RESET_IP_MS = 15 * MINUTO;
/** Historial: no se permite reutilizar las últimas N contraseñas (incluida la actual). */
export const HISTORIAL_CONTRASENAS = 3;

export const BCRYPT_SALT_ROUNDS = 12;

// ─── Cookies ──────────────────────────────────────────────────────────
/**
 * En producción las cookies usan el prefijo __Host-: el navegador exige Secure, Path=/ y sin Domain,
 * lo que impide que un subdominio comprometido las sobrescriba.
 * En desarrollo (http://localhost) no se puede usar Secure en todos los navegadores.
 */
export const COOKIES_SEGURAS = process.env.NODE_ENV === "production";

const prefijo = COOKIES_SEGURAS ? "__Host-" : "";
export const COOKIE_SESION = `${prefijo}jmc.session`;
export const COOKIE_REFRESH = `${prefijo}jmc.refresh`;
export const COOKIE_CSRF = `${prefijo}jmc.csrf`;
export const COOKIE_CALLBACK = `${prefijo}jmc.callback-url`;

/** Opciones comunes: HttpOnly, Secure, SameSite=Strict, Path=/ */
export const OPCIONES_COOKIE = {
  httpOnly: true,
  secure: COOKIES_SEGURAS,
  sameSite: "strict" as const,
  path: "/",
};

/** Secreto de Auth.js (cifrado del JWT y firma del token CSRF). */
export function obtenerAuthSecret(): string {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error("AUTH_SECRET no está configurado o tiene menos de 32 caracteres");
  }
  return secreto;
}

/** URL pública de la aplicación, sin barra final. */
export function urlAplicacion(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
