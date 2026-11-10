import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import type { AuthUser, Session } from "@/types/auth";
import { ROLES, type Rol } from "@/types/colaborador";

export const NOMBRE_COOKIE_SESION = "jmc_sesion";
/** Duración de la sesión: 8 horas (una jornada laboral). */
export const DURACION_SESION_SEGUNDOS = 8 * 60 * 60;

interface PayloadSesion extends JWTPayload {
  cedula: string;
  nombre: string;
  rol: Rol;
}

function obtenerSecreto(): Uint8Array {
  const secreto = process.env.JWT_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error("JWT_SECRET no está configurado o tiene menos de 32 caracteres");
  }
  return new TextEncoder().encode(secreto);
}

/** Firma un JWT HS256 con los datos del usuario. */
export async function createToken(usuario: AuthUser): Promise<string> {
  return new SignJWT({ cedula: usuario.cedula, nombre: usuario.nombre, rol: usuario.rol })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(usuario.id)
    .setIssuedAt()
    .setIssuer("aplicativo-jmc")
    .setAudience("aplicativo-jmc")
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(obtenerSecreto());
}

/** Verifica el JWT y devuelve la sesión, o null si es inválido o expiró. */
export async function verifyToken(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<PayloadSesion>(token, obtenerSecreto(), {
      algorithms: ["HS256"],
      issuer: "aplicativo-jmc",
      audience: "aplicativo-jmc",
    });
    if (!payload.sub || !payload.cedula || !ROLES.includes(payload.rol)) return null;
    return {
      usuario: {
        id: payload.sub,
        cedula: payload.cedula,
        nombre: payload.nombre,
        rol: payload.rol,
      },
      expira: (payload.exp ?? 0) * 1000,
    };
  } catch {
    return null;
  }
}

/** Lee la cookie de sesión de la petición actual (Server Components y Route Handlers). */
export async function getSession(): Promise<Session | null> {
  const almacen = await cookies();
  return verifyToken(almacen.get(NOMBRE_COOKIE_SESION)?.value);
}

/** Opciones de la cookie httpOnly de sesión. */
export function opcionesCookieSesion(maxAge = DURACION_SESION_SEGUNDOS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
