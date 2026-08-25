// src/app/calendario/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { redirect } from "next/navigation";
import CalendarClient from "./CalendarClient";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function CalendarioPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!dbUser) redirect("/login");

  const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });

  if (!activeYear) {
    return (
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500 font-medium">No hay un año escolar activo para mostrar el calendario.</p>
        </div>
      </main>
    );
  }

  // Obtenemos todos los eventos del año escolar activo
  const events = await prisma.event.findMany({
    where: { schoolYearId: activeYear.id },
    orderBy: { startDate: "asc" }
  });

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight">
          Calendario Escolar
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Revisa las fechas clave, pruebas, reuniones y actividades del curso.
        </p>
      </header>

      {/* Enviamos los datos al componente interactivo */}
      <CalendarClient 
        initialEvents={events} 
        userRole={dbUser.role} 
        currentUserId={dbUser.id}
      />
    </main>
  );
}