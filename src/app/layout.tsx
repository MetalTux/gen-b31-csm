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
import PwaRegister from "@/components/PwaRegister";

const inter = Inter({ subsets: ["latin"] });

// Configuración estricta de vista para dispositivos móviles
export const viewport: Viewport = {
  themeColor: "#1e293b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// SOLUCIÓN: Eliminamos manifest: "/manifest.json" de aquí.
// Al usar src/app/manifest.ts, Next.js lo enlazará automáticamente y sin errores 404.
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

  if (!session?.user?.email) {
    return (
      <html lang="es">
        <body className={`${inter.className} bg-brand-light`} suppressHydrationWarning>
          <PwaRegister />
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    );
  }

  const pgAdapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter: pgAdapter });

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  const userRole = dbUser?.role ?? "USER";

  return (
    <html lang="es">
      <body className={inter.className} suppressHydrationWarning>
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
