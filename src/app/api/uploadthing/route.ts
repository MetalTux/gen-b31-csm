// src/app/api/uploadthing/route.ts

import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Exportamos los métodos GET y POST que requiere UploadThing
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  // Opcional: puedes pasarle configuraciones adicionales aquí si lo requieres en el futuro
});