// public/sw.js

// Si cambias la página offline u otros archivos precacheados, sube este número
// para que el nuevo Service Worker limpie la caché anterior.
const CACHE_NAME = "portal-csm-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  // Guardamos la página offline y obligamos al nuevo SW a instalarse de inmediato
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  // Borramos cachés de versiones anteriores y tomamos el control de inmediato
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Solo interceptamos navegaciones (cargas de página). El resto (server actions,
  // APIs, assets) va directo a la red sin pasar por el SW.
  if (event.request.mode !== "navigate") return;

  // Network-First: siempre vamos a la red; sin internet mostramos la página offline
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
  );
});
