// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Cliente único de Prisma para toda la aplicación (Neon/PostgreSQL).
// Cada PrismaClient abre su propio pool de conexiones: si se crea uno por archivo
// o por petición, las conexiones se multiplican hasta agotar el límite de la BD.
// En desarrollo lo guardamos en globalThis para que el hot-reload no cree uno
// nuevo en cada recarga.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
