// src/components/InstallPrompt.tsx
"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react"; // Asegúrate de tener lucide-react instalado

export default function InstallPrompt() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Escucha el evento nativo de Chrome que indica que la PWA se puede instalar
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // Evita que Chrome muestre su mini-barra por defecto
      setDeferredPrompt(e); // Guardamos el evento para dispararlo después
      setShowPrompt(true); // Mostramos nuestro propio diseño
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Si el usuario instala la app, ocultamos el botón
    window.addEventListener("appinstalled", () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log("¡Aplicación instalada con éxito!");
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Dispara el aviso de instalación nativo del celular
    deferredPrompt.prompt();

    // Esperamos a ver qué decidió el usuario
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("El usuario aceptó instalar la PWA");
      setShowPrompt(false);
    } else {
      console.log("El usuario rechazó instalar la PWA");
    }

    // El prompt solo se puede usar una vez, lo limpiamos
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-fade-in">
      <div className="bg-brand-navy text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl">
            <Download size={20} className="text-brand-accent" />
          </div>
          <div>
            <h4 className="text-sm font-bold">Instalar Portal CSM</h4>
            <p className="text-xs text-gray-300">
              Accede más rápido desde tu inicio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-brand-accent text-brand-navy text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-all"
          >
            Instalar
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-full"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
