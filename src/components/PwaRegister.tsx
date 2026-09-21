// src/components/PwaRegister.tsx
"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    // Verificamos si el navegador del celular soporta esta tecnología
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Fallo al registrar el Service Worker:", err);
      });
    }
  }, []);

  // Es un componente "invisible", solo ejecuta lógica
  return null; 
}