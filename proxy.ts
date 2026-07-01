// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from 'pg'; // <-- 1. Importamos Pool nativo

// Inicializamos Prisma pasando el Pool correcto al adaptador
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

// 2. ¡EL CAMBIO CRUCIAL! Debe ser una exportación nombrada (sin la palabra "default")
export async function proxy(request: NextRequest) {
  // 1. Buscamos la cookie de sesión de NextAuth (maneja entornos locales y producción HTTPS)
  const sessionToken = 
    request.cookies.get('next-auth.session-token')?.value || 
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  const loginUrl = new URL('/login', request.url);

  // Si no hay token de sesión, bloqueamos y enviamos al login
  if (!sessionToken) {
    return NextResponse.redirect(loginUrl);
  }

  // 2. Verificamos en la base de datos si la sesión es válida
  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
    });

    // Si la sesión no existe o ya expiró
    if (!session || session.expires < new Date()) {
      return NextResponse.redirect(loginUrl);
    }
  } catch (error) {
    console.error("Error validando la sesión en el proxy:", error);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Si todo está correcto, el guardia abre la puerta
  return NextResponse.next();
}

// Configuración de las rutas que el proxy va a vigilar
export const config = {
  // Protegemos todo EXCEPTO el login, la API interna de NextAuth y archivos estáticos
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};