// src/app/actions/user.ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
// Agregamos "Prisma" a la importación para tener acceso a sus clases de error
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

    // Evitar que el admin se borre a sí mismo
    if (adminUser.id === userId) {
      throw new Error("No puedes eliminar tu propia cuenta de administrador.");
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/admin/usuarios");
  } catch (error: unknown) {
    // Manejo de errores nativos de Prisma sin usar "any"
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // P2003 es el código de Prisma para violaciones de llaves foráneas (Foreign Key Constraint)
      if (error.code === 'P2003') {
        throw new Error("No se puede eliminar este usuario porque ya tiene pagos registrados en la contabilidad. Quítale los permisos de administrador en su lugar.");
      }
    }
    
    // Fallback estándar
    const errorMessage = error instanceof Error ? error.message : "Error al eliminar usuario.";
    throw new Error(errorMessage);
  }
}