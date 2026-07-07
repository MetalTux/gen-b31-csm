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
  amountPerItem: number;         // Cuánto cuesta cada cuota (ej: 10000)
  receiptUrl: string;            // URL del comprobante en UploadThing
  selectedQuotas: number[];      // Arreglo de números de cuotas (ej: [3, 4] para Marzo y Abril)
  selectedExtraFeeIds: string[]; // Arreglo de IDs de cobros extraordinarios seleccionados
  studentId: string;             // ID del alumno al que se le asigna el pago
}

/**
 * 1. ACCIÓN: APODERADO RINDE UN PAGO (Soporta cuotas individuales o múltiples)
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

    // Ejecutamos todo dentro de una Transacción de Prisma. 
    // Si una inserción falla, se cancela todo para evitar descuadres.
    await prisma.$transaction(async (tx) => {
      
      // FLUJO A: Si seleccionó cuotas regulares del año
      if (selectedQuotas && selectedQuotas.length > 0) {
        for (const quotaNum of selectedQuotas) {
          await tx.payment.create({
            data: {
              amount: amountPerItem,
              receiptUrl,
              isVerified: false, // Queda pendiente hasta que el admin lo revise
              schoolYearId: activeYear.id,
              userId: user.id,
              studentId,
              quotaNumber: quotaNum, // Guardamos qué número de cuota es (1 al 10)
            },
          });
        }
      }

      // FLUJO B: Si seleccionó cobros extraordinarios (Extras)
      if (selectedExtraFeeIds && selectedExtraFeeIds.length > 0) {
        for (const extraId of selectedExtraFeeIds) {
          // Buscamos el monto exacto de ese cobro extra para no confiar en lo que envíe el cliente
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
              extraFeeId: extraId, // Vinculamos al cobro extra correspondiente
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
 * 2. ACCIÓN: ADMINISTRADOR VERIFICA UN PAGO (Aprobación)
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
}

/**
 * 3. ACCIÓN: EL TESORERO REGISTRA UN PAGO EN EFECTIVO / PRESENCIAL (Aprobado automáticamente)
 */
export async function createPresentialPayment(input: CreatePresentialPaymentInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    // Verificar que quien ejecuta la acción sea realmente el ADMIN (Tesorero)
    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes para registrar pagos manuales.");

    const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });
    if (!activeYear) throw new Error("No hay un año escolar activo configurado.");

    // Buscamos quién es el apoderado de este alumno para asociar el pago a su cuenta
    const student = await prisma.student.findUnique({
      where: { id: input.studentId },
      include: { parents: true }
    });
    
    if (!student || student.parents.length === 0) {
      throw new Error("El alumno no existe o no tiene un apoderado asociado.");
    }
    
    // Tomamos al primer papá/mamá asociado para dejar el registro vinculado
    const parentId = student.parents[0].id;

    const { selectedQuotas, selectedExtraFeeIds, studentId } = input;

    await prisma.$transaction(async (tx) => {
      // Registrar Cuotas Regulares
      if (selectedQuotas && selectedQuotas.length > 0) {
        for (const quotaNum of selectedQuotas) {
          await tx.payment.create({
            data: {
              amount: activeYear.quotaAmount,
              receiptUrl: "EFECTIVO", // Marca especial para auditoría de caja
              isVerified: true,       // Nace aprobado porque el tesorero recibió el dinero
              schoolYearId: activeYear.id,
              userId: parentId,
              studentId,
              quotaNumber: quotaNum,
            },
          });
        }
      }

      // Registrar Cobros Extraordinarios
      if (selectedExtraFeeIds && selectedExtraFeeIds.length > 0) {
        for (const extraId of selectedExtraFeeIds) {
          const extraFee = await tx.extraFee.findUnique({ where: { id: extraId } });
          if (!extraFee) throw new Error("Uno de los cobros extras no existe.");

          await tx.payment.create({
            data: {
              amount: extraFee.amount,
              receiptUrl: "EFECTIVO",
              isVerified: true,
              schoolYearId: activeYear.id,
              userId: parentId,
              studentId,
              extraFeeId: extraId,
            },
          });
        }
      }
    });

    // Refrescamos las rutas para que los balances y los paneles se actualicen al instante
    revalidatePath("/mis-pagos");
    revalidatePath("/admin/ingresos");
  } catch (error) {
    console.error("Error al registrar pago presencial:", error);
    throw new Error("No se pudo registrar el pago en efectivo.");
  }
}

/**
 * 4. ACCIÓN: RECHAZAR UN PAGO (Lo elimina para que el apoderado vuelva a intentar)
 */
export async function rejectPayment(paymentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    // Al borrarlo, la grilla del apoderado volverá automáticamente a "Pendiente" (Rojo)
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

    // Se elimina en cascada gracias a tu diseño en schema.prisma
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