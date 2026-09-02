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

interface UpdatePollInput {
  pollId: string;
  title: string;
  description?: string | null;
  expiresAt?: Date | null;
  questions: {
    id?: string | number; // Puede ser un CUID (string) si ya existe, o un número (timestamp) si es nueva
    title: string;
    type: QuestionType;
    maxSelections?: number | null;
    maxTotalQuantity?: number | null;
    options: {
      id?: string | number;
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

    if (input.questions.length === 0) throw new Error("El formulario debe tener al menos una pregunta.");

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

    await prisma.poll.delete({ where: { id: pollId } });

    revalidatePath("/admin/encuestas");
    revalidatePath("/");
  } catch (error) {
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
      where: { id: studentId, parents: { some: { id: user.id } } }
    });

    if (!validStudent) throw new Error("Intento de voto fraudulento. El alumno no te pertenece.");

    const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { questions: true } });
    if (!poll || !poll.isActive) throw new Error("Esta encuesta ya se encuentra cerrada.");
    if (poll.expiresAt && new Date() > poll.expiresAt) throw new Error("El plazo para votar en esta encuesta ya expiró.");

    const questionIds = poll.questions.map(q => q.id);

    await prisma.$transaction(async (tx) => {
      await tx.pollVote.deleteMany({
        where: { studentId: studentId, questionId: { in: questionIds } }
      });

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
    throw new Error(error instanceof Error ? error.message : "Error al procesar el voto.");
  }
}

/**
 * 5. ACCIÓN: ADMIN EDITA UNA ENCUESTA COMPLETA (Estructura Profunda)
 */
export async function updatePoll(input: UpdatePollInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    // Usamos una Transacción para asegurar la integridad de los datos
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar los metadatos de la encuesta
      await tx.poll.update({
        where: { id: input.pollId },
        data: {
          title: input.title.trim(),
          description: input.description?.trim() || null,
          expiresAt: input.expiresAt,
        },
      });

      // 2. Obtener los IDs de las preguntas que SÍ vienen en el payload y que ya existían
      const incomingQuestionIds = input.questions
        .map((q) => q.id)
        .filter((id) => typeof id === "string") as string[];

      // 3. Eliminar las preguntas que fueron borradas por el usuario (esto eliminará sus opciones y votos en cascada)
      await tx.pollQuestion.deleteMany({
        where: {
          pollId: input.pollId,
          id: { notIn: incomingQuestionIds },
        },
      });

      // 4. Procesar cada pregunta (Crear o Actualizar)
      for (const q of input.questions) {
        if (typeof q.id === "string") {
          // A) LA PREGUNTA YA EXISTE: La actualizamos
          await tx.pollQuestion.update({
            where: { id: q.id },
            data: { title: q.title.trim(), type: q.type, maxSelections: q.maxSelections, maxTotalQuantity: q.maxTotalQuantity },
          });

          // Extraemos los IDs de las opciones que mantuvimos para esta pregunta
          const incomingOptionIds = q.options.map((o) => o.id).filter((id) => typeof id === "string") as string[];

          // Borramos las opciones que el admin quitó de esta pregunta específica
          await tx.pollOption.deleteMany({
            where: { questionId: q.id, id: { notIn: incomingOptionIds } },
          });

          // Procesamos las opciones de esta pregunta
          for (const opt of q.options) {
            if (typeof opt.id === "string") {
              // La opción ya existía, se actualiza el texto
              await tx.pollOption.update({
                where: { id: opt.id },
                data: { text: opt.text.trim(), isCustomText: opt.isCustomText },
              });
            } else {
              // Es una opción nueva agregada a una pregunta vieja
              await tx.pollOption.create({
                data: { text: opt.text.trim(), isCustomText: opt.isCustomText, questionId: q.id },
              });
            }
          }
        } else {
          // B) LA PREGUNTA ES COMPLETAMENTE NUEVA: La creamos junto con sus opciones
          await tx.pollQuestion.create({
            data: {
              pollId: input.pollId,
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
            },
          });
        }
      }
    });

    revalidatePath("/admin/encuestas");
    revalidatePath("/");
  } catch (error) {
    console.error("Error al actualizar la encuesta profunda:", error);
    throw new Error("No se pudieron guardar los cambios de la estructura de la encuesta.");
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

    const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { questions: true } });
    if (!poll) throw new Error("Encuesta no encontrada.");
    
    const questionIds = poll.questions.map(q => q.id);

    await prisma.pollVote.deleteMany({
      where: { studentId: studentId, questionId: { in: questionIds } },
    });

    revalidatePath("/admin/encuestas");
    revalidatePath("/");
  } catch (error) {
    throw new Error("No se pudo anular los votos del apoderado.");
  }
}
