// src/app/actions/poll.ts
"use server";

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

interface CreatePollInput {
  title: string;
  description?: string;
  expiresAt?: Date | null;
  options: string[]; 
}

/**
 * 1. ACCIÓN: ADMIN CREA UNA ENCUESTA
 */
export async function createPoll(input: CreatePollInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });
    if (!activeYear) throw new Error("No hay un año escolar activo configurado.");

    if (input.options.length < 2) {
      throw new Error("La encuesta debe tener al menos 2 opciones.");
    }

    await prisma.poll.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim(),
        expiresAt: input.expiresAt,
        schoolYearId: activeYear.id,
        options: {
          create: input.options.map((opt) => ({ text: opt.trim() })),
        },
      },
    });

    revalidatePath("/admin/encuestas");
    revalidatePath("/"); 
  } catch (error) {
    console.error("Error al crear encuesta:", error);
    throw new Error(error instanceof Error ? error.message : "Error al crear la encuesta.");
  }
}

/**
 * 2. ACCIÓN: ADMIN CAMBIA ESTADO (Abre o Cierra la Encuesta Manualmente)
 */
export async function togglePollStatus(pollId: string, newStatus: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.poll.update({
      where: { id: pollId },
      data: { isActive: newStatus },
    });

    revalidatePath("/admin/encuestas");
    revalidatePath("/");
  } catch (error) {
    console.error("Error al cambiar estado de la encuesta:", error);
    throw new Error("No se pudo cambiar el estado de la encuesta.");
  }
}

/**
 * 3. ACCIÓN: ADMIN ELIMINA UNA ENCUESTA COMPLETA
 */
export async function deletePoll(pollId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.poll.delete({
      where: { id: pollId },
    });

    revalidatePath("/admin/encuestas");
    revalidatePath("/");
  } catch (error) {
    console.error("Error al eliminar encuesta:", error);
    throw new Error("No se pudo eliminar la encuesta.");
  }
}

/**
 * 4. ACCIÓN: APODERADO EMITE O ACTUALIZA SU VOTO
 */
export async function castVote(pollId: string, pollOptionId: string, studentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("Debes iniciar sesión para votar.");

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) throw new Error("Usuario no encontrado.");

    const validStudent = await prisma.student.findFirst({
      where: {
        id: studentId,
        parents: { some: { id: user.id } }
      }
    });

    if (!validStudent) {
      throw new Error("Intento de voto fraudulento. El alumno no te pertenece.");
    }

    const poll = await prisma.poll.findUnique({ where: { id: pollId } });
    if (!poll || !poll.isActive) {
      throw new Error("Esta encuesta ya se encuentra cerrada.");
    }
    
    if (poll.expiresAt && new Date() > poll.expiresAt) {
      throw new Error("El plazo para votar en esta encuesta ya expiró.");
    }

    // --- CORRECCIÓN CLAVE: Usamos upsert para Crear o Actualizar dinámicamente ---
    await prisma.pollVote.upsert({
      where: {
        pollId_studentId: {
          pollId: pollId,
          studentId: studentId,
        }
      },
      update: {
        pollOptionId: pollOptionId, // Si ya existe, solo cambia la opción elegida
      },
      create: {
        pollId,
        pollOptionId,
        userId: user.id,
        studentId,
      },
    });

    revalidatePath("/");
    revalidatePath("/admin/encuestas");
  } catch (error) {
    console.error("Error al emitir/actualizar el voto:", error);
    throw new Error(error instanceof Error ? error.message : "Error al procesar el voto.");
  }
}

/**
 * 5. ACCIÓN: ADMIN EDITA TEXTOS DE UNA ENCUESTA EXISTENTE
 */
export async function updatePoll(pollId: string, title: string, description: string | null, expiresAt: Date | null) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.poll.update({
      where: { id: pollId },
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        expiresAt: expiresAt,
      },
    });

    revalidatePath("/admin/encuestas");
    revalidatePath("/");
  } catch (error) {
    console.error("Error al actualizar la encuesta:", error);
    throw new Error("No se pudieron guardar los cambios de la encuesta.");
  }
}

/**
 * 6. ACCIÓN: ADMIN ANULA (ELIMINA) UN VOTO ESPECÍFICO
 */
export async function deleteVote(voteId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    await prisma.pollVote.delete({
      where: { id: voteId },
    });

    revalidatePath("/admin/encuestas");
    revalidatePath("/");
  } catch (error) {
    console.error("Error al anular el voto:", error);
    throw new Error("No se pudo anular el voto del apoderado.");
  }
}