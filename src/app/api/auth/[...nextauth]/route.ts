// Endpoints de Auth.js: /api/auth/csrf, /api/auth/callback/credentials, /api/auth/session…
// Las rutas estáticas hermanas (me, logout, forgot-password, reset-password) tienen prioridad.
import { handlers } from "@/lib/auth/config";

export const { GET, POST } = handlers;
