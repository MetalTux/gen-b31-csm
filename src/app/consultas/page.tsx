// src/app/consultas/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { redirect } from "next/navigation";
import InquiryClient from "./InquiryClient";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function ConsultasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // 1. Obtener usuario y sus alumnos
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { students: true }
  });
  if (!dbUser) redirect("/login");

  // 2. Obtener año escolar activo
  const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });

  if (!activeYear) {
    return (
      <div className="p-8 text-center text-gray-500">
        No hay un año escolar activo en este momento.
      </div>
    );
  }

  // 3. Obtener consultas (Las propias + Las públicas del curso)
  const inquiries = await prisma.inquiry.findMany({
    where: {
      schoolYearId: activeYear.id,
      OR: [
        { userId: dbUser.id }, // Mis consultas (públicas o privadas)
        { isPublic: true }     // Consultas públicas de otros
      ]
    },
    include: {
      user: { select: { name: true, email: true, role: true } },
      student: true,
      responses: {
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight">Centro de Consultas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Resuelve tus dudas, solicita información o revisa las consultas de otros apoderados.
        </p>
      </div>

      <InquiryClient 
        inquiries={inquiries} 
        students={dbUser.students} 
        currentUserId={dbUser.id} 
      />
    </main>
  );
}