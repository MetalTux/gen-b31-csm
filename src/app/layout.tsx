// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@uploadthing/react/styles.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import { Providers } from "@/components/Providers";
import PwaRegister from "@/components/PwaRegister";
import InstallPrompt from "@/components/InstallPrompt";

// 1. IMPORTAMOS EL PACKAGE.JSON DIRECTAMENTE
import packageJson from "../../package.json";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#1e293b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Permite usar env(safe-area-inset-*) para no quedar bajo las barras del sistema
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Portal Apoderados CSM",
  description: "Plataforma de comunicación y gestión financiera",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Portal CSM",
  },
  formatDetection: {
    telephone: false,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  // VISTA SIN SESIÓN
  if (!session?.user?.email) {
    return (
      <html lang="es">
        <body
          className={`${inter.className} bg-brand-light`}
          suppressHydrationWarning
        >
          <PwaRegister />
          <InstallPrompt />
          <Providers>{children}</Providers>
          {/* Etiqueta de versión visual */}
          <div className="fixed bottom-2 right-2 z-[60] pointer-events-none opacity-50">
            <span className="bg-gray-800 text-white text-[10px] font-mono px-2 py-1 rounded-md shadow-sm">
              v{packageJson.version}
            </span>
          </div>
        </body>
      </html>
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  const userRole = dbUser?.role ?? "USER";

  // VISTA CON SESIÓN
  return (
    <html lang="es">
      <body className={inter.className} suppressHydrationWarning>
        <PwaRegister />
        <InstallPrompt />
        <Providers>
          {/* 3. SOLUCIÓN BOTÓN TAPADO: Usamos "fixed inset-0" en lugar de alturas.
              Esto ancla el contenedor exactamente a las 4 esquinas reales de la pantalla */}
          <div className="fixed inset-0 flex bg-brand-light overflow-hidden">
            <Sidebar userRole={userRole} />
            <main className="flex-1 overflow-y-auto w-full p-4 pt-20 pb-20 md:p-8 md:pt-8 md:pb-8">
              {children}
            </main>
          </div>
        </Providers>

        {/* 2. Etiqueta de versión visual dentro de la app */}
        <div className="fixed bottom-2 right-2 z-[60] pointer-events-none opacity-50">
          <span className="bg-gray-800 text-white text-[10px] font-mono px-2 py-1 rounded-md shadow-sm">
            v{packageJson.version}
          </span>
        </div>
      </body>
    </html>
  );
}
