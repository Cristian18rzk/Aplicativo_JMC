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

/** Dominio público del sitio: las redes y WhatsApp necesitan la URL absoluta de la portada. */
function urlDelSitio(): URL {
  const url = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "");
  try {
    return new URL(url || "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

const DESCRIPCION = "Consulta tus desprendibles de pago y certificados laborales de JMC S.A.S.";

export const metadata: Metadata = {
  metadataBase: urlDelSitio(),
  title: {
    default: "Aplicativo JMC — Nómina",
    template: "%s | Aplicativo JMC",
  },
  description: DESCRIPCION,
  robots: { index: false, follow: false },
  // Vista previa al compartir el link (WhatsApp, Facebook, Telegram…). La imagen es
  // src/app/opengraph-image.jpg: Next.js agrega og:image con su tamaño y texto alternativo.
  // Es un archivo .jpg para que proxy.ts no la redirija al login (el robot que la descarga no tiene sesión).
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Aplicativo JMC",
    title: "Aplicativo JMC",
    description: DESCRIPCION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Aplicativo JMC",
    description: DESCRIPCION,
  },
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
