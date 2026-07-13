// src/app/actions/user.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient, Role, BoardPosition, Prisma } from "@prisma/client"; 
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { revalidatePath } from "next/cache";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

interface UserInput {
  name: string;
  email: string;
  role: Role;
  boardPosition: BoardPosition | null;
}

interface UpdateUserInput extends UserInput {
  id: string;
}

/**
 * 1. CREAR USUARIO / PRE-REGISTRO
 */
export async function createUser(input: UserInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    const existingUser = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (existingUser) throw new Error("Ya existe un usuario con este correo electrónico.");

    await prisma.user.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        boardPosition: input.role === "ADMIN" ? input.boardPosition : null,
      },
    });

    revalidatePath("/admin/usuarios");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error al crear usuario.";
    throw new Error(errorMessage);
  }
}

/**
 * 2. ACTUALIZAR USUARIO
 */
export async function updateUser(input: UpdateUserInput) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    const existingUser = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (existingUser && existingUser.id !== input.id) {
      throw new Error("El correo electrónico ya está en uso por otro usuario.");
    }

    await prisma.user.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        role: input.role,
        boardPosition: input.role === "ADMIN" ? input.boardPosition : null,
      },
    });

    revalidatePath("/admin/usuarios");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error al actualizar usuario.";
    throw new Error(errorMessage);
  }
}

/**
 * 3. ELIMINAR USUARIO
 */
export async function deleteUser(userId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    if (adminUser.id === userId) {
      throw new Error("No puedes eliminar tu propia cuenta de administrador.");
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/usuarios");
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        throw new Error("No se puede eliminar este usuario porque ya tiene pagos registrados en la contabilidad. Quítale los permisos de administrador en su lugar.");
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : "Error al eliminar usuario.";
    throw new Error(errorMessage);
  }
}

/**
 * 4. HABILITAR / DESHABILITAR ACCESO DE USUARIO
 */
export async function toggleUserAccess(userId: string, newStatus: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error("No autorizado.");

    const adminUser = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (adminUser?.role !== "ADMIN") throw new Error("Permisos insuficientes.");

    if (adminUser.id === userId) {
      throw new Error("Por seguridad, no puedes desactivar tu propia cuenta de administrador.");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: newStatus },
    });

    revalidatePath("/admin/usuarios");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error al cambiar el acceso del usuario.";
    throw new Error(errorMessage);
  }
}