// src/app/api/uploadthing/core.ts

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const pgAdapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pgAdapter });

const f = createUploadthing();

// Función auxiliar para obtener el usuario de la base de datos
async function getUserFromSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("No autorizado");

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!dbUser) throw new Error("Usuario no encontrado");

  return dbUser;
}

export const ourFileRouter = {
  // ---------------------------------------------------------
  // 1. CANALES DEL MURO (SOLO ADMINISTRADORES)
  // ---------------------------------------------------------
  
  adminImageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async () => {
      const user = await getUserFromSession();
      if (user.role !== "ADMIN") throw new Error("Solo admins pueden subir imágenes al muro.");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  adminAttachmentUploader: f({ 
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    blob: { maxFileSize: "16MB", maxFileCount: 5 } 
  })
    .middleware(async () => {
      const user = await getUserFromSession();
      if (user.role !== "ADMIN") throw new Error("Solo admins pueden subir adjuntos al muro.");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { fileUrl: file.url, fileName: file.name };
    }),

  // ---------------------------------------------------------
  // 2. CANAL DE APODERADOS (CUALQUIER USUARIO LOGUEADO)
  // ---------------------------------------------------------
  
  paymentReceiptUploader: f({ 
    image: { maxFileSize: "4MB", maxFileCount: 1 }, 
    pdf: { maxFileSize: "4MB", maxFileCount: 1 } ,
    blob: { maxFileSize: "4MB", maxFileCount: 1 } 
  })
    .middleware(async () => {
      // Aquí NO validamos el rol. Solo exigimos que sea un usuario registrado (Apoderado/Directiva)
      const user = await getUserFromSession();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Archivo subido por:", metadata.userId, "URL:", file.url);
      // Más adelante guardaremos esta URL en la tabla Payment
      return { uploadedBy: metadata.userId, url: file.url };
    }),

} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;