// src/app/manifest.ts
import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portal Apoderados CSM",
    short_name: "Portal CSM",
    description: "Plataforma de comunicación y gestión financiera",
    id: "/",
    start_url: "/",
    scope: "/",
    lang: "es",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1e293b",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Los íconos "maskable" llevan margen: Android los recorta en círculo/squircle
      {
        src: "/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
