// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import Link from "next/link";
import { MessageSquare, ArrowRight } from "lucide-react";

import ActivityForm from "@/components/ActivityForm";
import ActivityCard from "@/components/ActivityCard";
import PollWidget from "@/components/PollWidget";

// --- CONFIGURACIÓN DE BASE DE DATOS (NEON) ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function Home() {
  // 1. Autenticación y Validación de Usuario
  const session = await getServerSession(authOptions);
  const dbUser = await prisma.user.findUnique({
    where: { email: session?.user?.email ?? "" },
  });

  const userRole = dbUser?.role ?? "USER";
  const userName = dbUser?.name ?? session?.user?.email;
  const currentUserId = dbUser?.id ?? "";

  // 2. Consulta: Año Activo y Novedades (Muro)
  const activeYear = await prisma.schoolYear.findFirst({
    where: { isActive: true },
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
        include: {
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              user: {
                select: { id: true, name: true, image: true, role: true },
              },
            },
          },
        },
      },
    },
  });

  const activities = activeYear?.activities || [];

  // 3. Consulta: Alumnos vinculados al usuario
  const userStudents = await prisma.student.findMany({
    where: { parents: { some: { id: currentUserId } } },
    select: { id: true, firstName: true, lastName: true }
  });
  const studentIds = userStudents.map(s => s.id);

  // 4. Consulta: Encuestas Activas y Vigentes
  const activePolls = await prisma.poll.findMany({
    where: {
      schoolYearId: activeYear?.id,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } } // Solo las que cierran en el futuro
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      options: {
        include: { _count: { select: { votes: true } } },
        orderBy: { id: "asc" }
      },
      _count: { select: { votes: true } },
      // Traemos solo los votos de los hijos de este usuario para saber si ya votó
      votes: {
        where: { studentId: { in: studentIds } },
        include: { pollOption: { select: { text: true } } }
      }
    }
  });

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* --- SECCIÓN 1: ENCABEZADO Y SALUDO --- */}
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-extrabold text-brand-navy tracking-tight">
          Muro de Novedades
        </h1>
        <p className="text-gray-500 text-sm md:text-base">
          Bienvenido/a, <span className="font-bold text-brand-navy">{userName}</span>. Aquí encontrarás las circulares y avisos oficiales del curso.
        </p>
      </header>

      {/* --- SECCIÓN 2: ACCESOS RÁPIDOS (WIDGET DE CONSULTAS) --- */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:shadow-md">
        <div className="flex items-start sm:items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl text-white shadow-md shrink-0">
            <MessageSquare size={24} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-brand-navy flex items-center gap-2">
              ¿Tienes alguna duda o sugerencia?
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-xl">
              Revisa nuestro foro de preguntas frecuentes o abre un nuevo ticket de consulta para que la directiva pueda ayudarte a la brevedad.
            </p>
          </div>
        </div>
        
        <Link 
          href="/consultas" 
          className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-blue-600 font-bold px-5 py-2.5 rounded-xl text-sm border border-blue-200 shadow-sm hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all"
        >
          Ir al Centro de Consultas <ArrowRight size={16} />
        </Link>
      </div>

      {/* --- SECCIÓN 3: ENCUESTAS ACTIVAS --- */}
      {/* El componente PollWidget ya tiene su propia validación visual si no hay encuestas */}
      <PollWidget polls={activePolls} students={userStudents} userRole={userRole} />

      {/* --- SECCIÓN 4: HERRAMIENTAS DE ADMINISTRACIÓN --- */}
      {userRole === "ADMIN" && (
        <div className="pt-4 border-t border-gray-100">
          <ActivityForm />
        </div>
      )}

      {/* --- SECCIÓN 5: FEED DE NOTICIAS --- */}
      <div className="space-y-6 pt-2">
        <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
          📰 Comunicados Oficiales
        </h3>
        
        {activities.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
            <p className="text-gray-400 font-medium text-sm">
              Aún no se registran publicaciones oficiales en el muro.
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityCard 
              key={activity.id} 
              activity={{
                ...activity, 
                description: activity.description || ''
              }} 
              userRole={userRole}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>

    </main>
  );
}