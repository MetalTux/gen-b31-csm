// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// OJO: Restauramos el "export default" para que Next.js lo reconozca automáticamente.
export default function proxy(request: NextRequest) {
  // 1. Solo miramos si el usuario trae la cookie en la mano (súper rápido, sin consultar la BD)
  const sessionToken = 
    request.cookies.get('next-auth.session-token')?.value || 
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  const loginUrl = new URL('/login', request.url);

  // 2. Si no trae la cookie, le cerramos la puerta de inmediato
  if (!sessionToken) {
    console.log("🔒 Acceso denegado por el Proxy: Redirigiendo al login.");
    return NextResponse.redirect(loginUrl);
  }

  // 3. Si la trae, lo dejamos pasar. El layout.tsx se encargará de validar la sesión real con Prisma.
  return NextResponse.next();
}

export const config = {
  // Protegemos todo el sitio EXCEPTO el login y los archivos estáticos
  matcher: [
    /*
     * Aplica el middleware a todas las rutas EXCEPTO:
     * - api (rutas de la API)
     * - _next/static (archivos estáticos de Next.js)
     * - _next/image (optimización de imágenes de Next.js)
     * - archivos con extensión de imagen (.png, .jpg, .svg, .ico)
     */
    '/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$).*)',
  ],
};