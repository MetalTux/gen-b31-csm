// src/app/admin/consultas/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { redirect } from "next/navigation";
import AdminInquiryClient from "./AdminInquiryClient";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function AdminConsultasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // Validar usuario y asegurar que sea ADMIN
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    redirect("/"); // Si no es admin, lo devolvemos al inicio
  }

  // Obtener año escolar activo
  const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });

  if (!activeYear) {
    return (
      <div className="p-8 text-center text-gray-500">
        No hay un año escolar activo en este momento.
      </div>
    );
  }

  // Obtener absolutamente todas las consultas del año escolar
  const inquiries = await prisma.inquiry.findMany({
    where: {
      schoolYearId: activeYear.id,
    },
    include: {
      user: { select: { name: true, email: true, role: true } },
      student: { select: { firstName: true, lastName: true } },
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
        <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight">Bandeja de Consultas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona y responde las dudas de los apoderados del curso.
        </p>
      </div>

      <AdminInquiryClient 
        inquiries={inquiries} 
        currentUserId={dbUser.id} 
      />
    </main>
  );
}