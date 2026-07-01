// src/components/ActivityCard.tsx
"use client";

import { useState } from "react";
import { deleteActivity } from "@/app/actions/activity";
import ActivityForm from "./ActivityForm";
import ConfirmModal from "./ConfirmModal"; // <-- Importamos nuestro nuevo Modal
import { Pencil, Trash2 } from "lucide-react";

interface ActivityCardProps {
  activity: {
    id: string;
    title: string;
    description: string;
    createdAt: Date;
  };
  userRole: string;
}

export default function ActivityCard({ activity, userRole }: ActivityCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  // NUEVO ESTADO: Controla si el modal de confirmación está abierto
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Esta función ahora solo abre el Modal
  const requestDelete = () => setIsModalOpen(true);

  // Esta función es la que realmente ejecuta el borrado cuando confirmas en el Modal
  const executeDelete = async () => {
    setIsPending(true);
    try {
      await deleteActivity(activity.id);
      // No necesitamos cerrar el modal ni poner isPending en false porque el componente se destruirá al recargar el muro
    } catch (error) {
      alert("Error al eliminar la publicación y sus archivos adjuntos.");
      setIsPending(false);
      setIsModalOpen(false);
    }
  };

  if (isEditing) {
    return (
      <ActivityForm
        mode="edit"
        activityId={activity.id}
        initialTitle={activity.title}
        initialDescription={activity.description}
        onClose={() => setIsEditing(false)}
      />
    );
  }

  return (
    <>
      <article className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-brand-navy/5 relative overflow-hidden transition-all hover:shadow-md group">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-accent"></div>
        
        {userRole === "ADMIN" && (
          <div className="absolute top-4 right-4 flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-lg shadow-sm z-10">
            <button
              onClick={() => setIsEditing(true)}
              disabled={isPending}
              className="p-1.5 text-gray-500 hover:text-brand-navy hover:bg-gray-100 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Editar Publicación Completa"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={requestDelete}
              disabled={isPending}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
              title="Eliminar Publicación y Limpiar Nube"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        <h3 className="text-xl font-bold text-brand-navy mb-2 pl-2 pr-16">
          {activity.title}
        </h3>
        
        <time className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5 block pl-2">
          🗓️ {new Date(activity.createdAt).toLocaleDateString("es-CL", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </time>
        
        <div 
          className="text-gray-700 whitespace-pre-wrap muro-html pl-2 text-sm md:text-base break-words"
          dangerouslySetInnerHTML={{ __html: activity.description || "" }}
        />
      </article>

      {/* RENDERIZAMOS EL MODAL INVISIBLE HASTA QUE SE SOLICITE */}
      <ConfirmModal 
        isOpen={isModalOpen}
        title="Eliminar Publicación"
        message={`¿Estás completamente seguro de eliminar "${activity.title}"?\n\n⚠️ ¡ATENCIÓN!: Esta acción destruirá permanentemente los textos de la base de datos y eliminará de forma física todas las imágenes y archivos adjuntos de la nube para liberar espacio.`}
        onConfirm={executeDelete}
        onCancel={() => setIsModalOpen(false)}
        isPending={isPending}
      />
    </>
  );
}