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
}

interface UpdateStudentInput {
  id: string;
  firstName: string;
  lastName: string;
  startQuotaNumber: number;
  isActive: boolean;
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
 */
export async function linkParentToStudent(studentId: string, parentEmail: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    // Buscamos si el usuario ya ingresó a la plataforma alguna vez
    const userToLink = await prisma.user.findUnique({
      where: { email: parentEmail.trim().toLowerCase() },
    });

    if (!userToLink) {
      throw new Error("El correo no está registrado. El apoderado debe iniciar sesión en la plataforma al menos una vez antes de ser vinculado.");
    }

    // Conectamos el registro del alumno con el usuario
    await prisma.student.update({
      where: { id: studentId },
      data: {
        parents: {
          connect: { id: userToLink.id },
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