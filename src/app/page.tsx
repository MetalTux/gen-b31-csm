// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ActivityForm from "@/components/ActivityForm";
import ActivityCard from "@/components/ActivityCard"; // <-- Importamos la nueva tarjeta
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

  const activeYear = await prisma.schoolYear.findFirst({
    where: { isActive: true },
    include: {
      activities: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const activities = activeYear?.activities || [];

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-navy tracking-tight">
          Muro de Novedades
        </h1>
        <p className="text-gray-600 mt-2 text-sm md:text-base">
          Bienvenido/a, <span className="font-semibold text-brand-navy">{userName}</span>. Aquí encontrarás las circulares y avisos oficiales del curso.
        </p>
      </header>

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
            // PASAMOS LOS DATOS A NUESTRO COMPONENTE INTELIGENTE
            <ActivityCard 
              key={activity.id} 
              activity={{
                ...activity, 
                description: activity.description || ''
              }} 
              userRole={userRole} 
            />
          ))
        )}
      </div>
    </>
  );
}