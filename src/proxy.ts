// src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// OJO: Restauramos el "export default" para que Next.js lo reconozca automáticamente.
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 1. ¡SUPER IMPORTANTE!: Si el usuario ya va hacia el login, déjalo pasar libremente.
  // Esto rompe por completo el bucle infinito de redirecciones.
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // 2. Miramos si el usuario trae la cookie (tanto para HTTP local como HTTPS de Vercel)
  const sessionToken = 
    request.cookies.get('next-auth.session-token')?.value || 
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  // 3. Si no trae la cookie, directo al login
  if (!sessionToken) {
    console.log("🔒 Acceso denegado por el Middleware: Redirigiendo al login.");
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Si la trae, continúa hacia la ruta solicitada
  return NextResponse.next();
}

export const config = {
  // Mantenemos tu matcher que filtra assets pesados, APIs e imágenes
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.png$|.*\\.ico$).*)',
  ],
};