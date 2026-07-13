// src/lib/auth.ts

import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import EmailProvider from "next-auth/providers/email";
import type { Adapter } from "next-auth/adapters"; 

const pgAdapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL! 
});

const prisma = new PrismaClient({ 
  adapter: pgAdapter 
});

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    EmailProvider({
      server: {
        host: "smtp.gmail.com",
        port: 465,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM, 
    }),
  ],
  // Agregamos los callbacks aquí
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Buscamos si el correo ingresado ya existe en nuestra tabla User
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      // Si el usuario no existe en la base de datos, bloqueamos el acceso
      if (!existingUser || existingUser.isActive === false) {
        // Retornar false evita que se envíe el correo de inicio de sesión
        return false; 
      }

      // Si existe, permitimos que el flujo continúe y envíe el enlace
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "database",
  },
};