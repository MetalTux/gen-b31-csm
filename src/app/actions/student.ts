// src/app/actions/student.ts
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

// --- INTERFACES ---
interface CreateStudentInput {
  firstName: string;
  lastName: string;
  startQuotaNumber: number;
  orderNumber: number;
}

interface UpdateStudentInput {
  id: string;
  firstName: string;
  lastName: string;
  startQuotaNumber: number;
  isActive: boolean;
  orderNumber: number;
}

/**
 * 1. ACCIÓN: CREAR UN ALUMNO NUEVO
 */
export async function createStudent(input: CreateStudentInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.student.create({
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        startQuotaNumber: input.startQuotaNumber,
        orderNumber: input.orderNumber,
      },
    });

    revalidatePath("/admin/alumnos");
    revalidatePath("/admin/ingresos");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error al crear el alumno.";
    throw new Error(errorMessage);
  }
}

/**
 * 2. ACCIÓN: ACTUALIZAR DATOS DE UN ALUMNO
 */
export async function updateStudent(input: UpdateStudentInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.student.update({
      where: { id: input.id },
      data: {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        startQuotaNumber: input.startQuotaNumber,
        isActive: input.isActive,
        orderNumber: input.orderNumber,
      },
    });

    revalidatePath("/admin/alumnos");
    revalidatePath("/admin/ingresos");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error al actualizar el alumno.";
    throw new Error(errorMessage);
  }
}

/**
 * 3. ACCIÓN: VINCULAR UN APODERADO A UN ALUMNO
 * Actualizado para vincular directamente por ID de usuario (parentId)
 */
export async function linkParentToStudent(studentId: string, parentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    // Prisma conecta al alumno con el usuario usando únicamente el ID.
    // Es indiferente si el usuario ha iniciado sesión antes o no.
    await prisma.student.update({
      where: { id: studentId },
      data: {
        parents: {
          connect: { id: parentId },
        },
      },
    });

    revalidatePath("/admin/alumnos");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error al vincular el apoderado.";
    throw new Error(errorMessage);
  }
}

/**
 * 4. ACCIÓN: DESVINCULAR UN APODERADO DE UN ALUMNO
 */
export async function unlinkParentFromStudent(studentId: string, userId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.student.update({
      where: { id: studentId },
      data: {
        parents: {
          disconnect: { id: userId },
        },
      },
    });

    revalidatePath("/admin/alumnos");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error al desvincular el apoderado.";
    throw new Error(errorMessage);
  }
}