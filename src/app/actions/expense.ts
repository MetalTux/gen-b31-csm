// src/app/actions/expense.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { revalidatePath } from "next/cache";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

interface CreateExpenseInput {
  concept: string;
  amount: number;
  date: Date;
  receiptUrl: string | null;
}

/**
 * ACCIÓN: REGISTRAR UN NUEVO GASTO
 */
export async function createExpense(input: CreateExpenseInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    // Validación estricta de permisos
    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes para registrar gastos.");

    const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });
    if (!activeYear) throw new Error("No hay un año escolar activo configurado.");

    await prisma.expense.create({
      data: {
        concept: input.concept,
        amount: input.amount,
        date: input.date,
        receiptUrl: input.receiptUrl,
        schoolYearId: activeYear.id,
      },
    });

    // Refrescamos las vistas del administrador y de los apoderados (transparencia)
    revalidatePath("/admin/egresos");
    revalidatePath("/mis-pagos"); // Asumiendo que mostraremos el saldo aquí luego
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al registrar el gasto.";
    console.error("Error createExpense:", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * ACCIÓN: ELIMINAR UN GASTO
 */
export async function deleteExpense(expenseId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes para eliminar gastos.");

    await prisma.expense.delete({
      where: { id: expenseId },
    });

    revalidatePath("/admin/egresos");
    revalidatePath("/mis-pagos");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al eliminar el gasto.";
    console.error("Error deleteExpense:", errorMessage);
    throw new Error(errorMessage);
  }
}