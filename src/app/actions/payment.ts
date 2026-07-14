// src/app/actions/payment.ts
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

interface RenderPaymentInput {
  amountPerItem: number;
  receiptUrl: string;
  selectedQuotas: number[];
  selectedExtraFeeIds: string[];
  studentId: string;
}

/**
 * 1. ACCIÓN: APODERADO RINDE UN PAGO
 */
export async function renderPayments(input: RenderPaymentInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autenticado.");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("Usuario no encontrado.");

    const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });
    if (!activeYear) throw new Error("No hay un año escolar activo configurado.");

    const { amountPerItem, receiptUrl, selectedQuotas, selectedExtraFeeIds, studentId } = input;

    await prisma.$transaction(async (tx) => {
      if (selectedQuotas && selectedQuotas.length > 0) {
        for (const quotaNum of selectedQuotas) {
          await tx.payment.create({
            data: {
              amount: amountPerItem,
              receiptUrl,
              isVerified: false,
              schoolYearId: activeYear.id,
              userId: user.id,
              studentId,
              quotaNumber: quotaNum,
            },
          });
        }
      }

      if (selectedExtraFeeIds && selectedExtraFeeIds.length > 0) {
        for (const extraId of selectedExtraFeeIds) {
          const extraFee = await tx.extraFee.findUnique({ where: { id: extraId } });
          if (!extraFee) throw new Error("Uno de los cobros extras seleccionados no existe.");

          await tx.payment.create({
            data: {
              amount: extraFee.amount,
              receiptUrl,
              isVerified: false,
              schoolYearId: activeYear.id,
              userId: user.id,
              studentId,
              extraFeeId: extraId,
            },
          });
        }
      }
    });

    revalidatePath("/mis-pagos");
    revalidatePath("/admin/ingresos");
  } catch (error) {
    console.error("Error al registrar el pago:", error);
    throw new Error("No se pudo procesar la rendición del pago.");
  }
}

/**
 * 2. ACCIÓN: ADMINISTRADOR VERIFICA UN PAGO
 */
export async function verifyPayment(paymentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.payment.update({
      where: { id: paymentId },
      data: { isVerified: true },
    });

    revalidatePath("/mis-pagos");
    revalidatePath("/admin/ingresos");
  } catch (error) {
    console.error("Error al verificar pago:", error);
    throw new Error("No se pudo verificar el pago.");
  }
}

interface CreatePresentialPaymentInput {
  selectedQuotas: number[];
  selectedExtraFeeIds: string[];
  studentId: string;
  paymentDate: Date;
  paymentMethod: "EFECTIVO" | "TRANSFERENCIA MANUAL";
}

/**
 * 3. ACCIÓN: TESORERO REGISTRA UN PAGO MANUAL (Efectivo o Transf. Antigua)
 */
export async function createPresentialPayment(input: CreatePresentialPaymentInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes para registrar pagos manuales.");

    const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });
    if (!activeYear) throw new Error("No hay un año escolar activo configurado.");

    const student = await prisma.student.findUnique({
      where: { id: input.studentId },
      include: { parents: true }
    });
    
    if (!student) {
      throw new Error("El alumno no existe en el sistema.");
    }
    
    // --- LA SOLUCIÓN MÁGICA ---
    // Si hay un apoderado, usamos su ID. Si la lista está vacía, usamos el ID del Tesorero (adminUser.id)
    const assignToUserId = student.parents.length > 0 ? student.parents[0].id : adminUser.id;

    const { selectedQuotas, selectedExtraFeeIds, studentId, paymentDate, paymentMethod } = input;

    await prisma.$transaction(async (tx) => {
      if (selectedQuotas && selectedQuotas.length > 0) {
        for (const quotaNum of selectedQuotas) {
          await tx.payment.create({
            data: {
              amount: activeYear.quotaAmount,
              receiptUrl: paymentMethod, 
              isVerified: true,
              date: paymentDate, 
              schoolYearId: activeYear.id,
              userId: assignToUserId, // Asignación dinámica (Apoderado o Tesorero)
              studentId,
              quotaNumber: quotaNum,
            },
          });
        }
      }

      if (selectedExtraFeeIds && selectedExtraFeeIds.length > 0) {
        for (const extraId of selectedExtraFeeIds) {
          const extraFee = await tx.extraFee.findUnique({ where: { id: extraId } });
          if (!extraFee) throw new Error("Uno de los cobros extras no existe.");

          await tx.payment.create({
            data: {
              amount: extraFee.amount,
              receiptUrl: paymentMethod,
              isVerified: true,
              date: paymentDate, 
              schoolYearId: activeYear.id,
              userId: assignToUserId, // Asignación dinámica (Apoderado o Tesorero)
              studentId,
              extraFeeId: extraId,
            },
          });
        }
      }
    });

    revalidatePath("/mis-pagos");
    revalidatePath("/admin/ingresos");
  } catch (error) {
    console.error("Error al registrar pago presencial/manual:", error);
    throw new Error(error instanceof Error ? error.message : "No se pudo registrar el pago manual.");
  }
}

/**
 * 4. ACCIÓN: RECHAZAR UN PAGO
 */
export async function rejectPayment(paymentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.payment.delete({
      where: { id: paymentId },
    });

    revalidatePath("/mis-pagos");
    revalidatePath("/admin/ingresos");
  } catch (error) {
    console.error("Error al rechazar pago:", error);
    throw new Error("No se pudo rechazar el pago.");
  }
}

/**
 * 5. ACCIÓN: CREAR UN COBRO EXTRAORDINARIO
 */
export async function createExtraFee(title: string, amount: number, dueDate: Date | null) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });
    if (!activeYear) throw new Error("No hay un año escolar activo.");

    await prisma.extraFee.create({
      data: {
        title,
        amount,
        dueDate,
        schoolYearId: activeYear.id,
      },
    });

    revalidatePath("/mis-pagos");
    revalidatePath("/admin/ingresos");
  } catch (error) {
    console.error("Error al crear cobro extra:", error);
    throw new Error("No se pudo crear el cobro extraordinario.");
  }
}

/**
 * 6. ACCIÓN: ELIMINAR UN COBRO EXTRAORDINARIO
 */
export async function deleteExtraFee(extraFeeId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.extraFee.delete({
      where: { id: extraFeeId },
    });

    revalidatePath("/mis-pagos");
    revalidatePath("/admin/ingresos");
  } catch (error) {
    console.error("Error al eliminar cobro extra:", error);
    throw new Error("No se pudo eliminar el cobro extraordinario. Quizás ya tiene pagos asociados.");
  }
}

/**
 * 7. ACCIÓN: ELIMINAR UN PAGO VERIFICADO (Para corregir errores de caja)
 */
export async function deletePayment(paymentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    // Se elimina definitivamente de la base de datos
    await prisma.payment.delete({
      where: { id: paymentId },
    });

    revalidatePath("/mis-pagos");
    revalidatePath("/admin/ingresos");
  } catch (error) {
    console.error("Error al eliminar registro de pago:", error);
    throw new Error("No se pudo eliminar el registro de pago.");
  }
}