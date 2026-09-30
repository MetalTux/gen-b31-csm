// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Opciones de configuración existentes */
  reactCompiler: true,

  /* NUEVO: Forzamos al navegador a no guardar en caché el Service Worker */
  async headers() {
    return [
      {
        // Interceptamos la petición específica del archivo de la PWA
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            // Le decimos al celular: "Úsalo, pero siempre pregunta si hay una versión nueva"
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
