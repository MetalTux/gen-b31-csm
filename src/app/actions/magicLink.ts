// src/app/actions/magicLink.ts
"use server";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

/**
 * Genera un enlace de acceso directo para un usuario específico.
 * Solo puede ser ejecutado por un ADMIN.
 */
export async function generateDirectLoginLink(userEmail: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    // Verificamos que el usuario al que le queremos generar el link exista
    const targetUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!targetUser || !targetUser.email) throw new Error("El usuario no existe o no tiene correo.");

    // Generamos un token seguro y aleatorio
    const token = crypto.randomBytes(32).toString("hex");
    
    // Le damos una validez de 48 horas
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 48);

    // Lo guardamos en la tabla nativa de NextAuth (VerificationToken)
    await prisma.verificationToken.create({
      data: {
        identifier: targetUser.email,
        token: token,
        expires: expires
      }
    });

    // Devolvemos la ruta relativa para el frontend
    return `/auth/verificar?token=${token}`;
  } catch (error) {
    console.error("Error al generar enlace:", error);
    throw new Error("No se pudo generar el enlace.");
  }
}