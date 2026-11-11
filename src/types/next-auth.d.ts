import type { DefaultSession } from "next-auth";
import type { Rol } from "./colaborador";

declare module "next-auth" {
  interface User {
    role: Rol;
    colaboradorId: string;
    authTime?: number;
  }

  interface Session {
    /** Momento del login original (ms). Solo se usa en el servidor. */
    authTime: number;
    user: {
      id: string;
      role: Rol;
      colaboradorId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Rol;
    cid?: string;
    accessExpires?: number;
    authTime?: number;
  }
}
