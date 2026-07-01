// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Sidebar from "@/components/Sidebar";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portal Apoderados CSM",
  description: "Plataforma de comunicación y gestión financiera",
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
          {/* Envolvemos la vista de login/sin sesión */}
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
        {/* Envolvemos toda la aplicación autenticada */}
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