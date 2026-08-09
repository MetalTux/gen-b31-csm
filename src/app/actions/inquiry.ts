// src/app/actions/inquiry.ts
"use server";

import { PrismaClient, InquiryCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// Configuración de Prisma compatible con Neon (Ajusta esto si usas un archivo centralizado de Prisma)
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Crea una nueva consulta en el sistema.
 * Puede ser pública (visible para el curso) o privada (solo directiva).
 */
export async function createInquiry(data: {
  title: string;
  content: string;
  category: InquiryCategory;
  isPublic: boolean;
  studentId?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("No autenticado");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("Usuario no encontrado");

  // Buscar el año escolar activo
  const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });
  if (!activeYear) throw new Error("No hay un año escolar activo para asociar la consulta");

  await prisma.inquiry.create({
    data: {
      title: data.title,
      content: data.content,
      category: data.category,
      isPublic: data.isPublic,
      studentId: data.studentId || null,
      userId: user.id,
      schoolYearId: activeYear.id,
    }
  });

  // Refrescamos las vistas para que aparezca la nueva consulta inmediatamente
  revalidatePath("/consultas");
  revalidatePath("/admin/consultas");
}

/**
 * Agrega una respuesta a una consulta existente.
 */
export async function createInquiryResponse(inquiryId: string, content: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("No autenticado");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("Usuario no encontrado");

  const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
  if (!inquiry) throw new Error("Consulta original no encontrada");
  if (inquiry.status === "CERRADA") throw new Error("Esta consulta ya está cerrada.");

  // Insertar la respuesta
  await prisma.inquiryResponse.create({
    data: {
      content,
      inquiryId,
      userId: user.id,
    }
  });

  // Regla de Negocio: Si la directiva (ADMIN) responde una consulta pendiente, cambia su estado
  if (user.role === "ADMIN" && inquiry.status === "PENDIENTE") {
    await prisma.inquiry.update({
      where: { id: inquiryId },
      data: { status: "RESPONDIDA" }
    });
  }

  revalidatePath("/consultas");
  revalidatePath("/admin/consultas");
}

/**
 * Cierra una consulta para que no reciba más respuestas.
 * Acción exclusiva para la Directiva (ADMIN).
 */
export async function closeInquiry(inquiryId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("No autenticado");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== "ADMIN") throw new Error("Acceso denegado. Solo la directiva puede cerrar temas.");

  await prisma.inquiry.update({
    where: { id: inquiryId },
    data: { status: "CERRADA" }
  });

  revalidatePath("/consultas");
  revalidatePath("/admin/consultas");
}