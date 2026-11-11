import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cookies } from "next/headers";
import { loginSchema } from "@/lib/validators/auth";
import {
  COOKIE_CALLBACK,
  COOKIE_CSRF,
  COOKIE_REFRESH,
  COOKIE_SESION,
  COOKIES_SEGURAS,
  DURACION_ACCESS_MS,
  DURACION_REFRESH_MS,
  OPCIONES_COOKIE,
} from "./constantes";
import { autenticar } from "./login";
import { obtenerIp, obtenerUserAgent } from "./request";
import { crearDatosAcceso, emitirRefreshToken, tokenAccesoValido } from "./sesiones";

/** El código viaja en la URL de error: debe ser genérico (nunca indicar si el email existe). */
class ErrorCredenciales extends CredentialsSignin {
  code = "credenciales";
}
class ErrorLimiteIp extends CredentialsSignin {
  code = "limite";
}
/** Fallo de infraestructura (Airtable/Redis caídos). Ocurre igual exista o no la cuenta. */
class ErrorServicio extends CredentialsSignin {
  code = "servicio";
}

export const { handlers, auth, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  // Detrás del proxy de Vercel el host llega en X-Forwarded-Host
  trustHost: true,
  pages: { signIn: "/auth/login", error: "/auth/login" },

  session: {
    strategy: "jwt",
    // Access token de 15 minutos; la continuidad la da el refresh token (ver proxy.ts)
    maxAge: Math.floor(DURACION_ACCESS_MS / 1000),
  },
  jwt: { maxAge: Math.floor(DURACION_ACCESS_MS / 1000) },

  useSecureCookies: COOKIES_SEGURAS,
  cookies: {
    sessionToken: { name: COOKIE_SESION, options: OPCIONES_COOKIE },
    csrfToken: { name: COOKIE_CSRF, options: OPCIONES_COOKIE },
    callbackUrl: { name: COOKIE_CALLBACK, options: OPCIONES_COOKIE },
  },

  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credenciales, request) {
        const datos = loginSchema.safeParse(credenciales);
        if (!datos.success) throw new ErrorCredenciales();

        const ctx = { ip: obtenerIp(request), userAgent: obtenerUserAgent(request) };
        let resultado: Awaited<ReturnType<typeof autenticar>>;
        let refresh: string;
        const authTime = Date.now();
        try {
          resultado = await autenticar(datos.data.email, datos.data.password, ctx);
          if (!resultado.ok) {
            throw resultado.motivo === "limite_ip" ? new ErrorLimiteIp() : new ErrorCredenciales();
          }
          // Login correcto: refresh token (7 días) en su propia cookie HttpOnly
          refresh = await emitirRefreshToken({ usuarioId: resultado.usuario.id, authTime, ...ctx });
        } catch (error) {
          if (error instanceof CredentialsSignin) throw error;
          console.error("[auth] Error de infraestructura durante el login:", (error as Error).message);
          throw new ErrorServicio();
        }
        (await cookies()).set(COOKIE_REFRESH, refresh, {
          ...OPCIONES_COOKIE,
          maxAge: Math.floor(DURACION_REFRESH_MS / 1000),
        });

        const { usuario } = resultado;
        return { id: usuario.id, role: usuario.role, colaboradorId: usuario.colaboradorId, authTime };
      },
    }),
  ],

  callbacks: {
    /**
     * El JWT solo contiene: sub (userId), role, cid, accessExpires, authTime (+ iat/exp/jti de Auth.js).
     * Ni nombre, ni email, ni hashes: el token viaja en cada petición.
     */
    jwt({ token, user, trigger }) {
      if (trigger === "signIn" && user?.id) {
        const datos = crearDatosAcceso(
          { id: user.id, role: user.role, colaboradorId: user.colaboradorId },
          user.authTime ?? Date.now(),
        );
        return { ...datos };
      }
      // Auth.js reemite el JWT con un `exp` nuevo cada vez; accessExpires no se desliza
      return tokenAccesoValido(token) ? token : null;
    },
    session({ session, token }) {
      return {
        ...session,
        authTime: token.authTime ?? 0,
        user: {
          ...session.user,
          id: token.sub ?? "",
          role: token.role ?? "colaborador",
          colaboradorId: token.cid ?? "",
        },
      };
    },
  },
});
