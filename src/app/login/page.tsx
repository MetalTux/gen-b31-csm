// src/app/login/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  // 1. Validamos si el usuario ya tiene una sesión activa en el servidor
  const session = await getServerSession(authOptions);

  // 2. Si la sesión existe, lo mandamos al inicio de inmediato
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-light px-4">
      {/* Encabezado Institucional discreto fuera de la tarjeta */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-brand-navy tracking-wide uppercase">
          Colegio San Marcos de Curicó
        </h1>
        <p className="text-xs font-semibold text-brand-accent tracking-widest uppercase mt-0.5">
          Plataforma de Gestión de Cursos
        </p>
      </div>

      {/* Formulario de Login */}
      <LoginForm />

      {/* Pie de página de la pantalla de login */}
      <footer className="mt-8 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} Generación 2031 B - CSM. Todos los derechos reservados.
      </footer>
    </main>
  );
}