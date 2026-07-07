// src/app/actions/schoolYear.ts
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

interface CreateYearInput {
  year: number;
  className: string;
  initialBalance: number;
  quotaAmount: number;
  totalQuotas: number;
  teacherName: string;
}

interface UpdateYearInput extends CreateYearInput {
  id: string;
}

/**
 * 1. ACCIÓN: CREAR UN NUEVO AÑO ESCOLAR
 */
export async function createSchoolYear(input: CreateYearInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    const existingYear = await prisma.schoolYear.findUnique({ where: { year: input.year } });
    if (existingYear) throw new Error(`El año escolar ${input.year} ya existe en el sistema.`);

    await prisma.schoolYear.create({
      data: {
        year: input.year,
        className: input.className.trim(),
        initialBalance: input.initialBalance,
        quotaAmount: input.quotaAmount,
        totalQuotas: input.totalQuotas,
        teacherName: input.teacherName.trim(),
        isActive: false 
      },
    });

    revalidatePath("/admin/configuracion");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error al crear el año escolar.";
    throw new Error(errorMessage);
  }
}

/**
 * 2. ACCIÓN: ACTUALIZAR UN AÑO ESCOLAR EXISTENTE (¡NUEVO!)
 */
export async function updateSchoolYear(input: UpdateYearInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    // Validamos que si cambió el número del año, no choque con uno existente
    const existingYear = await prisma.schoolYear.findUnique({ where: { year: input.year } });
    if (existingYear && existingYear.id !== input.id) {
      throw new Error(`El año ${input.year} ya está registrado en otro periodo.`);
    }

    await prisma.schoolYear.update({
      where: { id: input.id },
      data: {
        year: input.year,
        className: input.className.trim(),
        initialBalance: input.initialBalance,
        quotaAmount: input.quotaAmount,
        totalQuotas: input.totalQuotas,
        teacherName: input.teacherName.trim(),
      },
    });

    // Revalidamos todo el layout porque si cambió la cuota del año activo, cambian las deudas de todos
    revalidatePath("/", "layout");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error al actualizar el año escolar.";
    throw new Error(errorMessage);
  }
}

/**
 * 3. ACCIÓN: ACTIVAR UN AÑO ESCOLAR
 */
export async function setActiveSchoolYear(schoolYearId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.$transaction([
      prisma.schoolYear.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      }),
      prisma.schoolYear.update({
        where: { id: schoolYearId },
        data: { isActive: true }
      })
    ]);

    revalidatePath("/", "layout"); 
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error al activar el año escolar.";
    throw new Error(errorMessage);
  }
}