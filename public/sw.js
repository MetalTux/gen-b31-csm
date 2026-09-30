// public/sw.js

// Siempre que subas algo importante a Vercel, asegúrate de cambiar la versión
// en tu package.json. Al cambiar el código fuente de tu proyecto,
// este archivo también se refrescará gracias a la regla que pusimos arriba.

self.addEventListener("install", (event) => {
  // Obliga al nuevo Service Worker a instalarse de inmediato, ignorando al viejo
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Toma el control de la aplicación de inmediato y limpia clientes viejos
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Estrategia Network-First (Primero la red):
  // Intenta siempre ir a Vercel a buscar los datos frescos.
  // Solo usa la caché en caso de que el usuario no tenga internet.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request)),
  );
});
