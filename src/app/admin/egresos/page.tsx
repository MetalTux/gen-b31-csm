// src/app/admin/egresos/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { redirect } from "next/navigation";
import AdminExpenseClient from "./AdminExpenseClient";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function AdminEgresosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // Validación estricta: Solo ADMIN
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (user?.role !== "ADMIN") redirect("/");

  const activeYear = await prisma.schoolYear.findFirst({ 
    where: { isActive: true }
  });

  if (!activeYear) {
    return (
      <div className="p-8 text-center text-gray-500">
        Debes configurar un Año Escolar Activo primero.
      </div>
    );
  }

  // Traemos TODOS los gastos registrados en el año actual, ordenados por los más recientes
  const expenses = await prisma.expense.findMany({
    where: { schoolYearId: activeYear.id },
    orderBy: { date: "desc" }
  });

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight">Administración de Gastos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registra las compras, pagos a proveedores y egresos de la caja del curso.
        </p>
      </div>

      <AdminExpenseClient expenses={expenses} />
    </main>
  );
}