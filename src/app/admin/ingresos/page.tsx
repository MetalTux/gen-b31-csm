// src/app/admin/ingresos/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { redirect } from "next/navigation";
import AdminRevenueClient from "./AdminRevenueClient";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function AdminIngresosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (user?.role !== "ADMIN") redirect("/");

  // Buscamos el año activo e incluimos cobros extra e ingresos generales
  const activeYear = await prisma.schoolYear.findFirst({ 
    where: { isActive: true },
    include: { 
      extraFees: {
        include: {
          assignedStudents: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      },
      generalIncomes: { // <-- NUEVA RELACIÓN INCLUIDA
        orderBy: { date: "desc" }
      }
    }
  });

  if (!activeYear) {
    return (
      <div className="p-8 text-center text-gray-500">
        Debes configurar un Año Escolar Activo primero.
      </div>
    );
  }

  const allStudents = await prisma.student.findMany({
    where: { isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
  });

  const allPayments = await prisma.payment.findMany({
    where: { schoolYearId: activeYear.id },
    include: {
      student: true,
      user: true, 
      extraFee: true,
    },
    orderBy: { date: "desc" }
  });

  const pendingPayments = allPayments.filter(p => !p.isVerified);
  const verifiedPayments = allPayments.filter(p => p.isVerified);

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight">Administración de Ingresos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Valida transferencias, registra pagos presenciales y administra los cobros del año escolar.
        </p>
      </div>

      <AdminRevenueClient 
        activeYear={activeYear}
        students={allStudents}
        pendingPayments={pendingPayments}
        verifiedPayments={verifiedPayments}
        extraFees={activeYear.extraFees}
        generalIncomes={activeYear.generalIncomes} // <-- PASAMOS LA NUEVA DATA AL CLIENTE
      />
    </main>
  );
}