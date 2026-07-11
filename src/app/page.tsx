// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ActivityForm from "@/components/ActivityForm";
import ActivityCard from "@/components/ActivityCard";
import PollWidget from "@/components/PollWidget"; // <-- Importamos el nuevo widget
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const pgAdapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function Home() {
  const session = await getServerSession(authOptions);

  const dbUser = await prisma.user.findUnique({
    where: { email: session?.user?.email ?? "" },
  });

  const userRole = dbUser?.role ?? "USER";
  const userName = dbUser?.name ?? session?.user?.email;
  const currentUserId = dbUser?.id ?? "";

  // 1. Traemos el año activo y las actividades (Muro de novedades)
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
                select: { id: true, name: true, image: true },
              },
            },
          },
        },
      },
    },
  });

  const activities = activeYear?.activities || [];

  // 2. Traemos a los alumnos vinculados a este usuario actual (para las encuestas)
  const userStudents = await prisma.student.findMany({
    where: { parents: { some: { id: currentUserId } } },
    select: { id: true, firstName: true, lastName: true }
  });
  const studentIds = userStudents.map(s => s.id);

  // 3. Traemos las encuestas ACTIVAS y que NO han expirado
  const activePolls = await prisma.poll.findMany({
    where: {
      schoolYearId: activeYear?.id,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } } // Solo las que su fecha de cierre es en el futuro
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      options: {
        include: { _count: { select: { votes: true } } },
        orderBy: { id: "asc" }
      },
      _count: { select: { votes: true } },
      // Solo traemos los votos que correspondan a los hijos de este usuario
      votes: {
        where: { studentId: { in: studentIds } },
        include: { pollOption: { select: { text: true } } }
      }
    }
  });

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-brand-navy tracking-tight">
          Muro de Novedades
        </h1>
        <p className="text-gray-600 mt-2 text-sm md:text-base">
          Bienvenido/a, <span className="font-semibold text-brand-navy">{userName}</span>. Aquí encontrarás las circulares y avisos oficiales del curso.
        </p>
      </header>

      {/* RENDERIZAMOS LAS ENCUESTAS ARRIBA PARA DARLES PRIORIDAD */}
      <PollWidget polls={activePolls} students={userStudents} userRole={userRole} />

      {userRole === "ADMIN" && <ActivityForm />}

      {/* LISTADO DE TARJETAS VIVAS */}
      <div className="space-y-6">
        {activities.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center">
            <p className="text-gray-400 italic py-6">
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