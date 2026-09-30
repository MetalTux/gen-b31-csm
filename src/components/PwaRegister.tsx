// src/components/PwaRegister.tsx
"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    // Nos aseguramos de que el código solo corra en el cliente y que el navegador soporte Service Workers
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log(
            "✅ PWA Service Worker registrado con éxito. Scope:",
            registration.scope,
          );
        })
        .catch((error) => {
          console.error(
            "❌ Fallo al registrar el Service Worker de la PWA:",
            error,
          );
        });
    }
  }, []);

  return null;
}
