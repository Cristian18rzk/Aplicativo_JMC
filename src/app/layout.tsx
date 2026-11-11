import type { Metadata, Viewport } from "next";
import { Figtree, JetBrains_Mono, Rubik } from "next/font/google";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

// Sistema de Diseño JMC v2. next/font descarga las fuentes en el build y las sirve desde el
// propio dominio: no se carga nada de Google en el navegador (compatible con la CSP).
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aplicativo JMC — Nómina",
    template: "%s | Aplicativo JMC",
  },
  description: "Gestión de colaboradores, desprendibles de pago y certificados laborales.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#2E6B3F",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // La CSP usa un nonce por petición (proxy.ts): todas las páginas deben renderizarse dinámicamente
  // para que Next.js pueda aplicar ese nonce a sus scripts.
  await connection();
  return (
    <html lang="es-CO" className={`${figtree.variable} ${rubik.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full bg-fondo text-texto">
        <QueryProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
