// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Creamos el manejador de la autenticación
const handler = NextAuth(authOptions);

// Next.js App Router requiere que exportemos los métodos GET y POST
export { handler as GET, handler as POST };