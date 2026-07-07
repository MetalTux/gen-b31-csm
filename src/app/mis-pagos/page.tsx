// src/app/mis-pagos/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { redirect } from "next/navigation";
import PaymentDashboard from "@/components/PaymentDashboard";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function MisPagosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // 1. Obtener los datos completos del usuario y sus alumnos asociados
  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      students: true, // Hijos asociados
    },
  });

  if (!dbUser) redirect("/login");

  // 2. Obtener el año escolar activo
  const activeYear = await prisma.schoolYear.findFirst({
    where: { isActive: true },
    include: {
      extraFees: {
        orderBy: { dueDate: "asc" },
      },
      expenses: {
        orderBy: { date: "desc" },
      },
    },
  });

  if (!activeYear) {
    return (
      <div className="p-6 text-center bg-white rounded-xl shadow-sm border border-gray-100">
        <p className="text-gray-500 italic">No hay un año escolar activo configurado en el sistema.</p>
      </div>
    );
  }

  // 3. Traer todos los pagos rendidos por este usuario en el año activo
  const myPayments = await prisma.payment.findMany({
    where: {
      userId: dbUser.id,
      schoolYearId: activeYear.id,
    },
    include: {
      student: true,
      extraFee: true,
    },
    orderBy: { date: "desc" },
  });

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight">Centro de Pagos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona las cuotas del año, revisa tu historial y rinde tus transferencias.
        </p>
      </div>

      <PaymentDashboard 
        activeYear={activeYear}
        students={dbUser.students}
        payments={myPayments}
        expenses={activeYear.expenses}
        currentUserId={dbUser.id}
      />
    </main>
  );
}