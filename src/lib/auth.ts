// src/lib/auth.ts

import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import EmailProvider from "next-auth/providers/email";
import type { Adapter } from "next-auth/adapters"; 
import CredentialsProvider from "next-auth/providers/credentials";

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
    CredentialsProvider({
      id: "admin-magic-link",
      name: "Enlace Administrativo",
      credentials: {
        token: { label: "Token", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;

        // 1. Buscamos el token en la tabla que ya existe de NextAuth
        const verificationToken = await prisma.verificationToken.findUnique({ 
          where: { token: credentials.token } 
        });

        // 2. Verificamos que exista y no esté vencido
        if (!verificationToken || verificationToken.expires < new Date()) {
          return null;
        }

        // 3. Buscamos al usuario usando el "identifier" (que será su correo)
        const user = await prisma.user.findUnique({
          where: { email: verificationToken.identifier }
        });

        if (!user) return null;

        // 4. Si es válido, ELIMINAMOS el token para que sea de un solo uso
        await prisma.verificationToken.delete({
          where: { token: credentials.token }
        });

        // 5. Devolvemos el usuario para autorizar el inicio de sesión
        return user;
      }
    })
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