// src/app/actions/comment.ts
"use server";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Inicialización estándar de Prisma en Next 16 Edge/Node
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

/**
 * ACCIÓN 1: AGREGAR UN COMENTARIO
 */
export async function addComment(activityId: string, content: string) {
  try {
    // 1. Verificamos la sesión (Seguridad nivel 1)
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error("Debes iniciar sesión para comentar.");
    }

    // 2. Buscamos al usuario en la BD para obtener su ID real
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      throw new Error("Usuario no encontrado en la base de datos.");
    }

    if (!content.trim()) {
      throw new Error("El comentario no puede estar vacío.");
    }

    // 3. Insertamos el comentario relacionándolo con la publicación y el usuario
    await prisma.comment.create({
      data: {
        content: content.trim(),
        activityId,
        userId: user.id,
      },
    });

    // 4. Refrescamos el muro para que el comentario aparezca al instante
    revalidatePath("/");
  } catch (error) {
    console.error("Error al agregar comentario:", error);
    throw new Error("No se pudo publicar el comentario.");
  }
}

/**
 * ACCIÓN 2: ELIMINAR UN COMENTARIO
 */
export async function deleteComment(commentId: string) {
  try {
    // 1. Verificamos la sesión
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      throw new Error("Debes iniciar sesión para realizar esta acción.");
    }

    // 2. Obtenemos al usuario para saber su ID y su ROL
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) throw new Error("Usuario no encontrado.");

    // 3. Buscamos el comentario original para ver de quién es
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) throw new Error("El comentario ya no existe.");

    // 4. VALIDACIÓN DE PERMISOS (Seguridad nivel 2)
    // Solo puedes borrarlo SI eres el autor original O SI eres un ADMIN
    const isAuthor = comment.userId === user.id;
    const isAdmin = user.role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      throw new Error("No tienes permisos para eliminar este comentario.");
    }

    // 5. Si pasó las pruebas de seguridad, lo eliminamos
    await prisma.comment.delete({
      where: { id: commentId },
    });

    revalidatePath("/");
  } catch (error) {
    console.error("Error al eliminar comentario:", error);
    throw new Error("No se pudo eliminar el comentario.");
  }
}