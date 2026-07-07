// src/app/admin/configuracion/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { redirect } from "next/navigation";
import AdminConfigClient from "./AdminConfigClient";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function AdminConfigPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // Validación estricta de seguridad: Solo ADMIN
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (user?.role !== "ADMIN") redirect("/");

  // Extraemos todos los años registrados cronológicamente
  const schoolYears = await prisma.schoolYear.findMany({
    orderBy: { year: "desc" },
  });

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight">Configuración del Sistema</h1>
        <p className="text-sm text-gray-500 mt-1">
          Abre nuevos ciclos académicos, establece montos de cuota base y activa el periodo vigente.
        </p>
      </div>

      <AdminConfigClient schoolYears={schoolYears} />
    </main>
  );
}