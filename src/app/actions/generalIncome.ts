// src/app/actions/generalIncome.ts
"use server";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

/**
 * ACCIÓN: REGISTRAR UN INGRESO GENERAL (Pro-fondos, donaciones, ventas)
 */
export async function createGeneralIncome(concept: string, amount: number, date: Date) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });
    if (!activeYear) throw new Error("No hay un año escolar activo.");

    await prisma.generalIncome.create({
      data: {
        concept: concept.trim(),
        amount,
        date,
        schoolYearId: activeYear.id,
      },
    });

    revalidatePath("/admin/ingresos");
    revalidatePath("/mis-pagos"); // Revalidamos para que el apoderado vea el pozo actualizado
  } catch (error) {
    console.error("Error al registrar ingreso general:", error);
    throw new Error("No se pudo registrar el ingreso a fondos comunes.");
  }
}

/**
 * ACCIÓN: ELIMINAR UN INGRESO GENERAL (En caso de error de digitación)
 */
export async function deleteGeneralIncome(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.generalIncome.delete({
      where: { id },
    });

    revalidatePath("/admin/ingresos");
    revalidatePath("/mis-pagos");
  } catch (error) {
    console.error("Error al eliminar ingreso general:", error);
    throw new Error("No se pudo eliminar el registro.");
  }
}