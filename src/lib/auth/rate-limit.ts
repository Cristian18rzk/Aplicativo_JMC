/**
 * Rate limiting con ventana fija, en la memoria del proceso.
 *
 * Limita intentos de login por IP, el retardo progresivo por email y las solicitudes de reset.
 * En despliegues serverless (Vercel) cada instancia lleva su propio contador, así que el límite es
 * aproximado; la protección fuerte contra fuerza bruta es el bloqueo de cuentas, que se guarda en
 * Airtable (Usuarios.locked_until) y no depende de este módulo.
 */

export interface ResultadoLimite {
  permitido: boolean;
  conteo: number;
  restantes: number;
  /** Milisegundos hasta que se reinicia la ventana. */
  reintentarEnMs: number;
}

interface Entrada {
  conteo: number;
  expira: number;
}

// En globalThis para sobrevivir a las recargas en caliente de `next dev`
const globalRl = globalThis as unknown as { __jmcRateLimit?: Map<string, Entrada>; __jmcRateLimitLimpieza?: number };
const datos = (globalRl.__jmcRateLimit ??= new Map<string, Entrada>());

/** Borra las entradas vencidas como máximo una vez por minuto (evita que el mapa crezca sin límite). */
function limpiar(ahora: number) {
  if (ahora - (globalRl.__jmcRateLimitLimpieza ?? 0) < 60_000) return;
  globalRl.__jmcRateLimitLimpieza = ahora;
  for (const [clave, valor] of datos) if (valor.expira <= ahora) datos.delete(clave);
}

function sumar(clave: string, ventanaMs: number): { conteo: number; ttlMs: number } {
  const ahora = Date.now();
  limpiar(ahora);
  const actual = datos.get(clave);
  if (!actual || actual.expira <= ahora) {
    datos.set(clave, { conteo: 1, expira: ahora + ventanaMs });
    return { conteo: 1, ttlMs: ventanaMs };
  }
  actual.conteo += 1;
  return { conteo: actual.conteo, ttlMs: actual.expira - ahora };
}

/** Registra un intento y dice si sigue dentro del límite. */
export async function consumir(clave: string, limite: number, ventanaMs: number): Promise<ResultadoLimite> {
  const { conteo, ttlMs } = sumar(clave, ventanaMs);
  return {
    permitido: conteo <= limite,
    conteo,
    restantes: Math.max(0, limite - conteo),
    reintentarEnMs: ttlMs,
  };
}

/** Suma un evento (p. ej. un login fallido) y devuelve el total en la ventana. */
export async function incrementar(clave: string, ventanaMs: number): Promise<number> {
  return sumar(clave, ventanaMs).conteo;
}

export async function contar(clave: string): Promise<number> {
  const actual = datos.get(clave);
  return actual && actual.expira > Date.now() ? actual.conteo : 0;
}

export async function reiniciar(clave: string): Promise<void> {
  datos.delete(clave);
}
