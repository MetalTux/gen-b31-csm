// src/components/CommentSection.tsx
"use client";

import { useState } from "react";
import { addComment, deleteComment } from "@/app/actions/comment";
import { MessageSquare, Trash2, Loader2, Send } from "lucide-react";
import ConfirmModal from "./ConfirmModal"; 
import AlertModal, { AlertType } from "./AlertModal";

export interface CommentWithUser {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

interface CommentSectionProps {
  activityId: string;
  comments: CommentWithUser[];
  currentUserId: string;
  userRole: string;
}

export default function CommentSection({ 
  activityId, 
  comments, 
  currentUserId, 
  userRole 
}: CommentSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ESTADOS NUEVOS: Para controlar el Modal de confirmación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [commentIdToDelete, setCommentIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ isOpen: false, type: "success", title: "", message: "" });

  // MANEJADOR PARA ENVIAR COMENTARIO (Sin cambios)
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(activityId, newComment);
      setNewComment("");
    } catch (error) {
      setAlertConfig({
        isOpen: true,
        type: "error",
        title: "Error de Sistema",
        message: "No se pudo publicar el comentario."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. FUNCIÓN PARA SOLICITAR BORRADO: Abre el modal y guarda el ID temporalmente
  const requestDeleteComment = (commentId: string) => {
    setCommentIdToDelete(commentId);
    setIsModalOpen(true);
  };

  // 3. FUNCIÓN PARA EJECUTAR BORRADO: Se gatilla al presionar "Sí, eliminar" en el modal
  const executeDeleteComment = async () => {
    if (!commentIdToDelete) return;

    setIsDeleting(true);
    try {
      await deleteComment(commentIdToDelete);
      setIsModalOpen(false); // Cerramos el modal tras el éxito
      setCommentIdToDelete(null);
    } catch (error) {
      setAlertConfig({
        isOpen: true,
        type: "error",
        title: "Error de Sistema",
        message: "No tienes permisos o el comentario ya no existe."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="mt-4 border-t border-gray-100 pt-4 pl-2">
        {/* BOTÓN PARA ABRIR/CERRAR COMENTARIOS */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-brand-navy transition-colors cursor-pointer"
        >
          <MessageSquare size={16} />
          {isOpen ? "Ocultar comentarios" : `Ver comentarios (${comments.length})`}
        </button>

        {/* CONTENEDOR DESPLEGABLE */}
        {isOpen && (
          <div className="mt-4 space-y-4 animate-fade-in">
            
            {/* LISTA DE COMENTARIOS EXISTENTES */}
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 italic pl-1 py-1">
                No hay comentarios en esta publicación. ¡Sé el primero en escribir!
              </p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {comments.map((comment) => {
                  const isAuthor = comment.userId === currentUserId;
                  const isAdmin = userRole === "ADMIN";
                  const canDelete = isAuthor || isAdmin;

                  return (
                    <div 
                      key={comment.id} 
                      className="flex gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 group/comment relative animate-fade-in"
                    >
                      {/* Avatar del usuario */}
                      <div className="w-8 h-8 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {comment.user.image ? (
                          <img src={comment.user.image} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          comment.user.name?.charAt(0).toUpperCase() || "A"
                        )}
                      </div>

                      {/* Contenido del comentario */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-bold text-brand-navy truncate">
                            {comment.user.name || "Apoderado"}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {new Date(comment.createdAt).toLocaleDateString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 break-words whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>

                      {/* Botón eliminar corregido para llamar a nuestro Modal */}
                      {canDelete && (
                        <button
                          onClick={() => requestDeleteComment(comment.id)}
                          disabled={isDeleting}
                          className="md:opacity-0 group-hover/comment:opacity-100 text-gray-400 hover:text-red-500 transition-all cursor-pointer p-1 rounded hover:bg-gray-200/50 self-start disabled:cursor-not-allowed"
                          title="Eliminar comentario"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* FORMULARIO PARA AGREGAR NUEVO COMENTARIO */}
            <form onSubmit={handleAddComment} className="flex gap-2 items-end pt-2">
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario o duda aquí..."
                  rows={1}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none placeholder-gray-400 text-gray-700"
                  style={{ minHeight: "38px" }}
                />
              </div>
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="p-2.5 bg-brand-navy text-white rounded-xl hover:bg-opacity-95 transition-all flex items-center justify-center cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shrink-0 shadow-sm"
                title="Enviar comentario"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>

          </div>
        )}
      </div>

      {/* 4. SECCIÓN INVISIBLE: Renderizamos el Modal y le pasamos los parámetros dinámicos */}
      <ConfirmModal 
        isOpen={isModalOpen}
        title="Eliminar Comentario"
        message="¿Estás seguro de que deseas eliminar este comentario?\n\n⚠️ Esta acción es permanente y lo borrará por completo de la base de datos del curso."
        onConfirm={executeDeleteComment}
        onCancel={() => { setIsModalOpen(false); setCommentIdToDelete(null); }}
        isPending={isDeleting}
      />

      {/* RENDERIZAMOS EL MODAL AL FINAL */}
      <AlertModal 
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
    </>
  );
}