// src/app/manifest.ts

import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Plataforma Escolar', // Nombre completo
    short_name: 'EscolarApp',   // Nombre corto que irá debajo del ícono en el celular
    description: 'Gestión financiera y académica del curso',
    start_url: '/',             // La pantalla donde inicia la app al abrirla
    display: 'standalone',      // Esto oculta la barra del navegador (efecto App Nativa)
    background_color: '#f9fafb',// Color de fondo al abrir (gris muy claro)
    theme_color: '#1e293b',     // El color de la barra de señal/batería del celular (tu brand-navy)
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}