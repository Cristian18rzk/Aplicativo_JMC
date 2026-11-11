import type { NextConfig } from "next";

/**
 * Encabezados de seguridad para todas las respuestas.
 * La Content-Security-Policy se genera en src/proxy.ts porque lleva un nonce distinto por petición
 * (un valor fijo aquí obligaría a permitir 'unsafe-inline' en scripts).
 */
const encabezadosSeguridad = [
  // HTTPS obligatorio durante 1 año, incluidos subdominios
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // @react-pdf/renderer se ejecuta en Node (route handlers) y no debe empaquetarse
  serverExternalPackages: ["@react-pdf/renderer", "nodemailer"],
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: encabezadosSeguridad }];
  },
  async redirects() {
    // Enlaces y marcadores del login anterior
    return [{ source: "/login", destination: "/auth/login", permanent: true }];
  },
};

export default nextConfig;
