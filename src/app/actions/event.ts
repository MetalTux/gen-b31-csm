// src/app/actions/event.ts
"use server";

import { PrismaClient, EventCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Configuración de Prisma compatible con Neon
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Interfaz reutilizable para los datos del evento
interface EventData {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate?: Date | null;
  isAllDay: boolean;
  category: EventCategory;
}

/**
 * Crea un nuevo evento en el calendario.
 * Acción exclusiva para la Directiva (ADMIN).
 */
export async function createEvent(data: EventData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("No autenticado");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") {
    throw new Error("Acceso denegado. Solo la directiva puede crear eventos.");
  }

  // Buscar el año escolar activo para asociar el evento
  const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });
  if (!activeYear) throw new Error("No hay un año escolar activo para asociar el evento.");

  await prisma.event.create({
    data: {
      ...data,
      schoolYearId: activeYear.id,
      userId: user.id, // Auditoría: Guardamos quién lo creó
    }
  });

  // Refrescamos las rutas donde se mostrará el calendario
  revalidatePath("/calendario");
  revalidatePath("/"); // Por si agregamos un widget en el inicio en el futuro
}

/**
 * Actualiza un evento existente.
 * Acción exclusiva para la Directiva (ADMIN).
 */
export async function updateEvent(eventId: string, data: EventData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("No autenticado");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") {
    throw new Error("Acceso denegado. Solo la directiva puede editar eventos.");
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      ...data
    }
  });

  revalidatePath("/calendario");
  revalidatePath("/");
}

/**
 * Elimina un evento del calendario.
 * Acción exclusiva para la Directiva (ADMIN).
 */
export async function deleteEvent(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("No autenticado");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") {
    throw new Error("Acceso denegado. Solo la directiva puede eliminar eventos.");
  }

  await prisma.event.delete({
    where: { id: eventId }
  });

  revalidatePath("/calendario");
  revalidatePath("/");
}