// public/sw.js

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// SOLUCIÓN: Los navegadores exigen que exista el evento 'fetch' para habilitar el botón "Instalar".
self.addEventListener("fetch", (event) => {
  // Retornamos la petición de red normal para que tu app siga funcionando online sin problemas,
  // pero al interceptar el evento, superamos la validación de seguridad de Google Chrome.
  event.respondWith(fetch(event.request));
});
