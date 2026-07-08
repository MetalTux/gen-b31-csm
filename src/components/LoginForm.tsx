// src/components/LoginForm.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image"; // Importamos el optimizador de imágenes

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: "/",
      });

      if (result?.error) {
        setMessage({
          type: "error",
          text: "Ocurrió un error al intentar enviar el enlace. Verifica tu correo.",
        });
      } else {
        setMessage({
          type: "success",
          text: "¡Enlace enviado! Revisa tu bandeja de entrada (y la carpeta de spam) para iniciar sesión.",
        });
        setEmail("");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Error de conexión. Por favor, inténtalo nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-brand-light">
      <div className="text-center mb-8">
        
        {/* --- NUEVO LOGO --- */}
        <div className="relative w-28 h-32 mx-auto mb-4 drop-shadow-md">
          <Image 
            src="/logocolegio.png" 
            alt="Logo Colegio San Marcos"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 150px"
            priority 
          />
        </div>
        {/* --- FIN DEL LOGO --- */}

        <h2 className="text-2xl font-bold text-brand-navy">Acceso de Apoderados</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ingresa tu correo para recibir un enlace mágico de acceso directo. Sin contraseñas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-brand-navy mb-2">
            Correo Electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@correo.com"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-transparent transition-all disabled:bg-gray-100"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-brand-navy hover:bg-opacity-90 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-all transform active:scale-[0.98] disabled:bg-gray-400 cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? "Enviando..." : "Solicitar Enlace de Acceso"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-6 p-4 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-brand-red/10 text-brand-red border border-brand-red/20"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}