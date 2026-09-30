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

    // Si el usuario instala la app, ocultamos el botón
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      console.log("¡Aplicación instalada con éxito!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
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
    // Arriba para no tapar la lectura. En móviles empieza a la derecha del botón
    // hamburguesa (left-[4.5rem]); en escritorio queda arriba a la derecha.
    // z-30: el menú lateral abierto y su fondo oscuro (z-40/z-50) quedan por encima.
    <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-[4.5rem] right-4 md:left-auto md:w-96 z-30 animate-fade-in">
      <div className="bg-brand-navy text-white px-3 py-2 sm:p-3 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:block bg-white/10 p-2 rounded-xl shrink-0">
            <Download size={20} className="text-brand-accent" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold truncate">Instalar Portal CSM</h4>
            <p className="hidden sm:block text-xs text-gray-300 truncate">
              Accede más rápido desde tu inicio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 sm:px-4 py-2 bg-brand-accent text-brand-navy text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-all"
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
