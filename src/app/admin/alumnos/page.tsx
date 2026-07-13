// src/app/admin/alumnos/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { redirect } from "next/navigation";
import AdminStudentClient from "./AdminStudentClient";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function AdminAlumnosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (user?.role !== "ADMIN") redirect("/");

  const students = await prisma.student.findMany({
    orderBy: [
      { orderNumber: "asc" },
      { lastName: "asc" },
      { firstName: "asc" }
    ],
    include: {
      parents: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  const availableParents = await prisma.user.findMany({
    //where: {  }, 
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight">Directorio de Alumnos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona las matrículas, estados de actividad y vincula los correos de los apoderados.
        </p>
      </div>

      <AdminStudentClient students={students} availableParents={availableParents} />
    </main>
  );
}