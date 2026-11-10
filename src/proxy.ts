// Next.js 16 renombró "middleware.ts" a "proxy.ts" (misma funcionalidad).
import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE_SESION, verifyToken } from "@/lib/auth/session";

const RUTAS_PUBLICAS = ["/login"];

function esRutaPublica(ruta: string): boolean {
  return RUTAS_PUBLICAS.includes(ruta) || ruta.startsWith("/api/auth/");
}

function inicioSegunRol(rol: string): string {
  return rol === "admin" ? "/admin" : "/colaborador";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const esApi = pathname.startsWith("/api/");
  const sesion = await verifyToken(request.cookies.get(NOMBRE_COOKIE_SESION)?.value);

  // Sin sesión
  if (!sesion) {
    if (esRutaPublica(pathname)) return NextResponse.next();
    if (esApi) {
      return NextResponse.json({ error: "Sesión no válida o expirada" }, { status: 401 });
    }
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("redirigir", pathname);
    const respuesta = NextResponse.redirect(url);
    // Si había una cookie inválida/expirada, se limpia
    if (request.cookies.has(NOMBRE_COOKIE_SESION)) respuesta.cookies.delete(NOMBRE_COOKIE_SESION);
    return respuesta;
  }

  const { rol } = sesion.usuario;

  // Con sesión: el login no tiene sentido, se envía al inicio del rol
  if (pathname === "/login") {
    return NextResponse.redirect(new URL(inicioSegunRol(rol), request.url));
  }

  // Protección por rol de las secciones
  if (pathname.startsWith("/admin") && rol !== "admin") {
    return NextResponse.redirect(new URL("/colaborador", request.url));
  }
  if (pathname.startsWith("/colaborador") && rol !== "colaborador") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Excluye archivos estáticos, imágenes optimizadas y el favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
