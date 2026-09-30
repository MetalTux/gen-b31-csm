// src/app/manifest.ts
import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Portal Apoderados CSM",
    short_name: "Portal CSM",
    description: "Plataforma de comunicación y gestión financiera",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1e293b",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any", // <-- Aceptado por TypeScript: Para uso general
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable", // <-- Aceptado por TypeScript: Cumple la auditoría de Android
      },
    ],
  };
}
