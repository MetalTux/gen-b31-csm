// src/app/admin/usuarios/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { redirect } from "next/navigation";
import AdminUserClient from "./AdminUserClient";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function AdminUsuariosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // Validación estricta: Solo ADMIN
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (user?.role !== "ADMIN") redirect("/");

  // Traemos todos los usuarios registrados, incluyendo la información básica de sus alumnos asociados
  const allUsers = await prisma.user.findMany({
    orderBy: { email: "asc" },
    include: {
      students: {
        select: { id: true, firstName: true, lastName: true }
      }
    }
  });

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight">Gestión de Apoderados</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administra los accesos de los usuarios, asigna roles de directiva y audita los núcleos familiares.
        </p>
      </div>

      <AdminUserClient users={allUsers} />
    </main>
  );
}