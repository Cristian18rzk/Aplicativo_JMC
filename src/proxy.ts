// Next.js 16 renombró "middleware.ts" a "proxy.ts" (misma función; corre en el runtime de Node).
import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_REFRESH,
  COOKIE_SESION,
  DURACION_ACCESS_MS,
  DURACION_REFRESH_MS,
  OPCIONES_COOKIE,
} from "@/lib/auth/constantes";
import { obtenerIp, obtenerUserAgent } from "@/lib/auth/request";
import { inicioSegunRol } from "@/lib/auth/rutas";
import { leerAccessToken, rotarSesion, type DatosAcceso } from "@/lib/auth/sesiones";

const ES_DESARROLLO = process.env.NODE_ENV === "development";
const SITIO_HTTPS = (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");

/**
 * Content-Security-Policy estricta con nonce por petición: solo se ejecutan los scripts que Next.js
 * marca con el nonce ('strict-dynamic' propaga la confianza a los chunks que estos cargan).
 * style-src-attr permite atributos style="" (Framer Motion y React los usan); un atributo de estilo
 * no puede ejecutar JavaScript.
 */
function construirCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${ES_DESARROLLO ? " 'unsafe-eval'" : ""}`,
    ES_DESARROLLO ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(SITIO_HTTPS ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/** Endpoints de /api/auth/* que deben funcionar sin sesión (login, CSRF, crear PIN, logout). */
function esApiAuthPublica(ruta: string): boolean {
  return ruta.startsWith("/api/auth/") && ruta !== "/api/auth/me";
}

type CookieSalida = { nombre: string; valor: string; maxAge: number };

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esApi = pathname.startsWith("/api/");
  const esPaginaAuth = pathname === "/auth" || pathname.startsWith("/auth/");
  const cookiesSalida: CookieSalida[] = [];

  // ── 1. Sesión: access token vigente o, si venció, rotación del refresh token ──
  let sesion: DatosAcceso | null = await leerAccessToken(request.cookies.get(COOKIE_SESION)?.value);
  const refresh = request.cookies.get(COOKIE_REFRESH)?.value;

  if (!sesion && refresh && !esApiAuthPublica(pathname)) {
    try {
      const rotacion = await rotarSesion(refresh, obtenerIp(request), obtenerUserAgent(request));
      if (rotacion.ok) {
        sesion = rotacion.datos;
        cookiesSalida.push({ nombre: COOKIE_SESION, valor: rotacion.accessToken, maxAge: DURACION_ACCESS_MS / 1000 });
        if (rotacion.refreshCookie) {
          cookiesSalida.push({ nombre: COOKIE_REFRESH, valor: rotacion.refreshCookie, maxAge: DURACION_REFRESH_MS / 1000 });
        }
        // La petición actual también debe ver el token nuevo (Server Components y API routes)
        request.cookies.set(COOKIE_SESION, rotacion.accessToken);
      } else {
        cookiesSalida.push({ nombre: COOKIE_REFRESH, valor: "", maxAge: 0 });
      }
    } catch (error) {
      // Airtable no disponible: no se borra el refresh token, el usuario podrá continuar al recuperarse
      console.error("[proxy] No fue posible rotar la sesión:", (error as Error).message);
    }
  }
  if (!sesion && request.cookies.has(COOKIE_SESION) && !cookiesSalida.some((c) => c.nombre === COOKIE_SESION)) {
    cookiesSalida.push({ nombre: COOKIE_SESION, valor: "", maxAge: 0 });
  }

  const aplicarCookies = (respuesta: NextResponse) => {
    for (const c of cookiesSalida) respuesta.cookies.set(c.nombre, c.valor, { ...OPCIONES_COOKIE, maxAge: c.maxAge });
    return respuesta;
  };
  const redirigir = (destino: string | URL) => aplicarCookies(NextResponse.redirect(new URL(destino, request.url)));

  // ── 2. API routes: JWT obligatorio salvo los endpoints públicos de autenticación ──
  if (esApi) {
    if (!sesion && !esApiAuthPublica(pathname)) {
      return aplicarCookies(NextResponse.json({ error: "Sesión no válida o expirada" }, { status: 401 }));
    }
    return aplicarCookies(NextResponse.next({ request: { headers: request.headers } }));
  }

  // ── 3. Páginas ──
  if (esPaginaAuth) {
    // /auth/* solo sin sesión. Excepción: crear el PIN tras entrar con un PIN temporal funciona aunque
    // este navegador tenga abierta la sesión de otra persona (al completarlo se cierra).
    if (sesion && pathname !== "/auth/crear-pin") return redirigir(inicioSegunRol(sesion.role));
  } else if (!sesion) {
    const login = new URL("/auth/login", request.url);
    if (pathname !== "/") login.searchParams.set("redirigir", pathname);
    if (refresh) login.searchParams.set("expirada", "1");
    return redirigir(login);
  } else if (pathname === "/") {
    return redirigir(inicioSegunRol(sesion.role));
  } else if (pathname.startsWith("/admin") && sesion.role !== "admin") {
    return redirigir("/colaborador");
  } else if (pathname.startsWith("/colaborador") && sesion.role !== "colaborador") {
    return redirigir("/admin");
  }

  // CSP con nonce: Next.js lo lee del encabezado de la petición y lo aplica a sus scripts
  const nonce = btoa(crypto.randomUUID());
  const csp = construirCsp(nonce);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const respuesta = NextResponse.next({ request: { headers } });
  respuesta.headers.set("Content-Security-Policy", csp);
  if (esPaginaAuth) respuesta.headers.set("Cache-Control", "no-store");
  return aplicarCookies(respuesta);
}

export const config = {
  // Excluye archivos estáticos, imágenes optimizadas y el favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|txt)$).*)"],
};
