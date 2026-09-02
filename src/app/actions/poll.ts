// src/app/actions/poll.ts
"use server";

import { PrismaClient, QuestionType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

// --- INTERFACES DE ENTRADA ---
interface CreatePollInput {
  title: string;
  description?: string;
  expiresAt?: Date | null;
  questions: {
    title: string;
    type: QuestionType;
    maxSelections?: number | null;
    maxTotalQuantity?: number | null;
    options: {
      text: string;
      isCustomText: boolean;
    }[];
  }[];
}

interface VoteInput {
  questionId: string;
  pollOptionId: string;
  quantity: number;
  customText?: string | null;
}

/**
 * 1. ACCIÓN: ADMIN CREA UNA ENCUESTA DINÁMICA
 */
export async function createPoll(input: CreatePollInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });
    if (!activeYear) throw new Error("No hay un año escolar activo configurado.");

    if (input.questions.length === 0) {
      throw new Error("El formulario debe tener al menos una pregunta.");
    }

    // Guardamos la encuesta junto a todas sus preguntas y opciones de forma anidada
    await prisma.poll.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim(),
        expiresAt: input.expiresAt,
        schoolYearId: activeYear.id,
        questions: {
          create: input.questions.map((q) => ({
            title: q.title.trim(),
            type: q.type,
            maxSelections: q.maxSelections,
            maxTotalQuantity: q.maxTotalQuantity,
            options: {
              create: q.options.map((opt) => ({
                text: opt.text.trim(),
                isCustomText: opt.isCustomText,
              })),
            },
          })),
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
 * 4. ACCIÓN: APODERADO ENVÍA EL FORMULARIO COMPLETO
 */
export async function submitPollForm(pollId: string, studentId: string, votes: VoteInput[]) {
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

    const poll = await prisma.poll.findUnique({ 
      where: { id: pollId },
      include: { questions: true }
    });
    
    if (!poll || !poll.isActive) {
      throw new Error("Esta encuesta ya se encuentra cerrada.");
    }
    
    if (poll.expiresAt && new Date() > poll.expiresAt) {
      throw new Error("El plazo para votar en esta encuesta ya expiró.");
    }

    const questionIds = poll.questions.map(q => q.id);

    // Utilizamos una Transacción para asegurar que los datos se guarden correctamente o se cancele todo
    await prisma.$transaction(async (tx) => {
      // 1. Borramos los votos previos de este alumno en las preguntas de esta encuesta (útil si está editando su voto)
      await tx.pollVote.deleteMany({
        where: {
          studentId: studentId,
          questionId: { in: questionIds }
        }
      });

      // 2. Insertamos los nuevos votos
      if (votes.length > 0) {
        await tx.pollVote.createMany({
          data: votes.map(v => ({
            pollOptionId: v.pollOptionId,
            questionId: v.questionId,
            studentId: studentId,
            userId: user.id,
            quantity: v.quantity,
            customText: v.customText || null
          }))
        });
      }
    });

    revalidatePath("/");
    revalidatePath("/admin/encuestas");
  } catch (error) {
    console.error("Error al procesar el formulario:", error);
    throw new Error(error instanceof Error ? error.message : "Error al procesar el voto.");
  }
}

/**
 * 5. ACCIÓN: ADMIN EDITA METADATOS DE UNA ENCUESTA EXISTENTE
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
 * 6. ACCIÓN: ADMIN ANULA (ELIMINA) TODOS LOS VOTOS DE UN ALUMNO EN UNA ENCUESTA
 */
export async function deleteStudentVotes(pollId: string, studentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    const poll = await prisma.poll.findUnique({ 
      where: { id: pollId },
      include: { questions: true }
    });

    if (!poll) throw new Error("Encuesta no encontrada.");
    
    const questionIds = poll.questions.map(q => q.id);

    // Borramos todos los votos asociados a ese alumno en las preguntas de esta encuesta específica
    await prisma.pollVote.deleteMany({
      where: {
        studentId: studentId,
        questionId: { in: questionIds }
      },
    });

    revalidatePath("/admin/encuestas");
    revalidatePath("/");
  } catch (error) {
    console.error("Error al anular votos:", error);
    throw new Error("No se pudo anular los votos del apoderado.");
  }
}