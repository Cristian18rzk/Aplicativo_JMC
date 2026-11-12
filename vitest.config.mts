import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const ruta = (relativa: string) => fileURLToPath(new URL(relativa, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: ruta("./src/") },
      { find: /^@test\//, replacement: ruta("./test/") },
      // "server-only" solo tiene sentido dentro del empaquetado de Next.js; en los tests es un módulo vacío
      { find: /^server-only$/, replacement: ruta("./test/stubs/server-only.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./test/setup.ts"],
    // Los tests nunca deben hablar con Airtable ni con internet
    env: {
      AIRTABLE_API_KEY: "clave-de-prueba",
      AIRTABLE_BASE_ID: "appPRUEBA",
      AUTH_SECRET: "secreto-de-prueba-con-mas-de-32-caracteres-xxxx",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
    restoreMocks: true,
    // next-auth importa "next/server" sin extensión: Node no lo resuelve solo, Vite sí
    server: { deps: { inline: ["next-auth"] } },
  },
});
