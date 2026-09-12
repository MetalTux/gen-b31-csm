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

  const studentIds = dbUser.students.map(student => student.id);

  // 2. Obtener el año escolar activo con sus cobros y gastos
  const activeYear = await prisma.schoolYear.findFirst({
    where: { isActive: true },
    include: {
      // SOLUCIÓN: Filtramos desde la BD para que solo traiga los cobros que aplican a esta familia
      extraFees: {
        where: {
          OR: [
            { isGlobal: true },
            { assignedStudents: { some: { id: { in: studentIds } } } }
          ]
        },
        orderBy: { dueDate: "asc" },
        include: {
          // Necesitamos traer los IDs de los alumnos asignados para filtrar en el cliente
          assignedStudents: { select: { id: true } }
        }
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

  // 3. PAGOS DEL USUARIO (Para las cuotas mensuales e historial del apoderado)
  const myPayments = studentIds.length > 0 
    ? await prisma.payment.findMany({
        where: {
          studentId: { in: studentIds },
          schoolYearId: activeYear.id,
        },
        include: {
          student: true,
          extraFee: true,
        },
        orderBy: { date: "desc" },
      })
    : [];

  // 4. Consultamos TODOS los pagos verificados del curso de forma global para la caja de transparencia
  const allVerifiedPayments = await prisma.payment.findMany({
    where: {
      schoolYearId: activeYear.id,
      isVerified: true, 
    },
    select: {
      amount: true,
      isVerified: true, 
    }
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
        allCoursePayments={allVerifiedPayments} 
        expenses={activeYear.expenses}
        currentUserId={dbUser.id}
      />
    </main>
  );
}