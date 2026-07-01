// src/app/actions/activity.ts
"use server";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server"; // <-- Herramienta oficial de borrado en la nube

const pgAdapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: pgAdapter });
const utapi = new UTApi(); // Inicializamos el recolector de basura

/**
 * Función auxiliar para escanear el HTML de una publicación
 * y extraer todas las claves únicas de archivos de UploadThing.
 */
function extractUploadThingKeys(html: string): string[] {
  // Las URLs de UploadThing suelen ser utfs.io/f/CLAVE o ufs.sh/f/CLAVE
  const regex = /https?:\/\/(?:utfs\.io|ufs\.sh)\/f\/([a-zA-Z0-9_\.\-]+)/g;
  const keys: string[] = [];
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    keys.push(match[1]); // Capturamos la clave del archivo
  }
  return keys;
}

// 1. ACCIÓN: ELIMINACIÓN INSTANTÁNEA DESDE EL BORRADOR (Resuelve Obs. 4)
export async function deleteFileByUrl(url: string) {
  try {
    const keys = extractUploadThingKeys(url);
    if (keys.length > 0) {
      await utapi.deleteFiles(keys[0]);
      console.log(`🗑️ Archivo temporal borrado de la nube: ${keys[0]}`);
    }
  } catch (error) {
    console.error("Error al borrar archivo temporal de UploadThing:", error);
  }
}

// 2. ACCIÓN: CREAR PUBLICACIÓN (Sin cambios estructurales)
export async function createActivity(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  const activeYear = await prisma.schoolYear.findFirst({
    where: { isActive: true },
  });

  if (!activeYear) throw new Error("No hay un año escolar activo.");

  await prisma.activity.create({
    data: {
      title,
      description,
      date: new Date(),
      schoolYearId: activeYear.id,
    },
  });

  revalidatePath("/");
}

// 3. ACCIÓN: ELIMINAR PUBLICACIÓN COMPLETA (Resuelve Obs. 1)
export async function deleteActivity(id: string) {
  try {
    // Primero buscamos la publicación para leer su contenido HTML antes de borrarla
    const activity = await prisma.activity.findUnique({ where: { id } });
    
    if (activity?.description) {
      // Extraemos todos los archivos asociados (Imágenes y Adjuntos)
      const fileKeys = extractUploadThingKeys(activity.description);
      
      if (fileKeys.length > 0) {
        // Los borramos de la nube de un solo golpe electrónico
        await utapi.deleteFiles(fileKeys);
        console.log(`🗑️ Se eliminaron ${fileKeys.length} archivos zombies de UploadThing.`);
      }
    }

    // Ahora que la nube está limpia, borramos el registro de la base de datos
    await prisma.activity.delete({ where: { id } });
    revalidatePath("/");
  } catch (error) {
    console.error("Error al eliminar actividad:", error);
    throw new Error("No se pudo eliminar la publicación.");
  }
}

// 4. ACCIÓN: EDITAR Y COMPARAR (Resuelve Obs. 2)
export async function updateActivity(id: string, title: string, newDescription: string) {
  try {
    // Buscamos la versión antigua almacenada en la base de datos
    const oldActivity = await prisma.activity.findUnique({ where: { id } });
    
    if (oldActivity?.description) {
      const oldKeys = extractUploadThingKeys(oldActivity.description);
      const newKeys = extractUploadThingKeys(newDescription);
      
      // Filtramos: ¿Qué llaves estaban antes pero YA NO están en el nuevo texto?
      const keysToDelete = oldKeys.filter(key => !newKeys.includes(key));
      
      if (keysToDelete.length > 0) {
        await utapi.deleteFiles(keysToDelete);
        console.log(`🗑️ Limpieza de edición: se borraron ${keysToDelete.length} archivos reemplazados.`);
      }
    }

    // Actualizamos con los nuevos datos refinados
    await prisma.activity.update({
      where: { id },
      data: { title, description: newDescription },
    });
    
    revalidatePath("/");
  } catch (error) {
    console.error("Error al actualizar actividad:", error);
    throw new Error("No se pudo actualizar la publicación.");
  }
}