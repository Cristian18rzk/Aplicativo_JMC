import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aplicativo JMC — Nómina",
    template: "%s | Aplicativo JMC",
  },
  description: "Gestión de colaboradores, desprendibles de nómina y certificados laborales.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#1E40AF",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // La CSP usa un nonce por petición (proxy.ts): todas las páginas deben renderizarse dinámicamente
  // para que Next.js pueda aplicar ese nonce a sus scripts.
  await connection();
  return (
    <html lang="es-CO" className={`${inter.variable} h-full antialiased`}>
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
