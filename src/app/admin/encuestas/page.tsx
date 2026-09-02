// src/app/admin/encuestas/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { redirect } from "next/navigation";
import AdminPollClient from "./AdminPollClient";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const pgAdapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter: pgAdapter });

export default async function AdminEncuestasPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (user?.role !== "ADMIN") redirect("/");

  const activeYear = await prisma.schoolYear.findFirst({ where: { isActive: true } });
  if (!activeYear) {
    return (
      <div className="p-8 text-center text-gray-500">
        Debes configurar un Año Escolar Activo primero para poder crear encuestas.
      </div>
    );
  }

  // NUEVA ESTRUCTURA DE CONSULTA: Traemos las preguntas con sus opciones y los votos asociados
  const polls = await prisma.poll.findMany({
    where: { schoolYearId: activeYear.id },
    orderBy: { createdAt: "desc" },
    include: {
      questions: {
        include: {
          options: {
            orderBy: { id: "asc" }
          },
          votes: {
            include: {
              student: { select: { id: true, firstName: true, lastName: true } },
              user: { select: { name: true, email: true } },
              pollOption: { select: { text: true } }
            },
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { id: "asc" }
      }
    }
  });

  return (
    <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy tracking-tight">Formularios y Consultas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Crea encuestas dinámicas, elige entre selección única, múltiple o cantidades.
        </p>
      </div>

      {/* Pasamos los datos estructurados al cliente */}
      <AdminPollClient polls={polls} />
    </main>
  );
}