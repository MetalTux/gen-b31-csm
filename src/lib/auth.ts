// src/lib/auth.ts

import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg"; // <-- Importamos Pool para el adaptador de Prisma
import EmailProvider from "next-auth/providers/email";
import type { Adapter } from "next-auth/adapters"; 
import CredentialsProvider from "next-auth/providers/credentials";

// Inicializamos el Pool de conexiones correctamente para Neon/PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);

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

        // 1. Buscamos el token en la tabla de NextAuth
        const verificationToken = await prisma.verificationToken.findUnique({ 
          where: { token: credentials.token } 
        });

        // 2. Verificamos que exista y no esté vencido
        if (!verificationToken || verificationToken.expires < new Date()) {
          return null;
        }

        // 3. Buscamos al usuario usando el "identifier" (su correo)
        const user = await prisma.user.findUnique({
          where: { email: verificationToken.identifier }
        });

        if (!user) return null;

        // 4. ELIMINAMOS el token para que sea de un solo uso
        await prisma.verificationToken.delete({
          where: { token: credentials.token }
        });

        // 5. Devolvemos el usuario para autorizar
        return user;
      }
    })
  ],
  callbacks: {
    // Valida si el usuario puede iniciar sesión
    async signIn({ user }) {
      if (!user.email) return false;

      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      if (!existingUser || existingUser.isActive === false) {
        return false; 
      }

      return true;
    },
    // NUEVO: Transfiere los datos del usuario al Token JWT al iniciar sesión
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    // NUEVO: Expone los datos del Token JWT a la Sesión (para getServerSession)
    async session({ session, token }) {
      if (session.user && token) {
        session.user.email = token.email as string;
        // Si más adelante necesitas el ID en el frontend, puedes agregarlo aquí
        // session.user.id = token.id as string;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    // CAMBIO CLAVE: Obligatorio usar JWT cuando se usa CredentialsProvider
    strategy: "jwt",
  },
};