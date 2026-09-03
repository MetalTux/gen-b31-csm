// src/app/auth/verificar/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");

  useEffect(() => {
    if (!token) return;

    const authenticate = async () => {
      // Intentamos iniciar sesión usando nuestro proveedor mágico
      const result = await signIn("admin-magic-link", {
        token,
        redirect: false, // Evitamos que NextAuth redirija por su cuenta
      });

      // Validamos si la respuesta fue exitosa
      if (result?.error || !result?.ok) {
        setStatus("error");
      } else {
        setStatus("success");
        
        // SOLUCIÓN: Usamos window.location.href para forzar la recarga 
        // y asegurar que la cookie viaje al middleware correctamente.
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      }
    };

    authenticate();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-md w-full text-center animate-fade-in">
        {status === "loading" && (
          <div className="flex flex-col items-center">
            <Loader2 size={48} className="text-brand-accent animate-spin mb-4" />
            <h2 className="text-xl font-bold text-brand-navy">Verificando acceso...</h2>
            <p className="text-gray-500 mt-2 text-sm">Por favor, espera un momento mientras confirmamos tu identidad.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="bg-emerald-100 p-4 rounded-full mb-4">
              <CheckCircle2 size={40} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-brand-navy">¡Acceso concedido!</h2>
            <p className="text-gray-500 mt-2 text-sm">Iniciando sesión de forma segura. Te estamos redirigiendo al muro de novedades...</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center animate-fade-in">
            <div className="bg-red-100 p-4 rounded-full mb-4">
              <AlertCircle size={40} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-brand-navy">Enlace inválido o expirado</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Este enlace de acceso seguro ya fue utilizado o caducó. Por favor, solicita uno nuevo a la directiva del curso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-accent"/></div>}>
      <VerifyContent />
    </Suspense>
  );
}