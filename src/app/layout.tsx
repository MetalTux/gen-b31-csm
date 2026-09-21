// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@uploadthing/react/styles.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Sidebar from "@/components/Sidebar";
import { Providers } from "@/components/Providers";

// --- NUEVO: Importamos el componente que registra la PWA ---
import PwaRegister from "@/components/PwaRegister"; 

const inter = Inter({ subsets: ["latin"] });

// --- NUEVO: Configuración estricta de vista para dispositivos móviles ---
export const viewport: Viewport = {
  themeColor: "#1e293b", // Cambia esto por el código hexadecimal exacto de tu brand-navy
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Evita el zoom automático al tocar inputs en el celular
};

// --- ACTUALIZADO: Metadatos con enlaces a la configuración de PWA ---
export const metadata: Metadata = {
  title: "Portal Apoderados CSM - Generación B-31",
  description: "Plataforma de comunicación y gestión financiera",
  manifest: "/manifest.json", // Enlace al manifiesto de la aplicación
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

  // VISTA 1: Usuario NO autenticado (Pantalla de Login, etc.)
  if (!session?.user?.email) {
    return (
      <html lang="es">
        <body className={`${inter.className} bg-brand-light`} suppressHydrationWarning>
          {/* Inicializamos la PWA en segundo plano */}
          <PwaRegister /> 
          
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    );
  }

  // Lógica de conexión a BD para usuarios autenticados
  const pgAdapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter: pgAdapter });

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  
  const userRole = dbUser?.role ?? "USER";

  // VISTA 2: Usuario Autenticado (Plataforma interna)
  return (
    <html lang="es">
      <body className={inter.className} suppressHydrationWarning>
        {/* Inicializamos la PWA en segundo plano también aquí */}
        <PwaRegister />

        <Providers>
          <div className="flex h-screen overflow-hidden bg-brand-light">
            <Sidebar userRole={userRole} />
            <main className="flex-1 overflow-y-auto w-full p-4 pt-20 md:p-8 md:pt-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}