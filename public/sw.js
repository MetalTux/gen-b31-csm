// public/sw.js

// Este archivo se ejecuta en segundo plano en el celular del usuario.
// Para que Android habilite el botón de "Instalar", solo necesitamos
// que el archivo exista y registre estos eventos básicos.

self.addEventListener('install', () => {
  // Obliga al celular a usar la última versión de la app
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  // Se activa inmediatamente
  console.log("App Escolar lista para funcionar como PWA");
});

self.addEventListener('fetch', (event) => {
  // En el futuro, aquí podemos poner lógica para que la app funcione sin internet (modo offline).
  // Por ahora, dejamos que Next.js maneje todas las peticiones normales.
});