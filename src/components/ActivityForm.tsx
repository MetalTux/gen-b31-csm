// src/components/ActivityForm.tsx
"use client";

import { useRef, useState } from "react";
import { createActivity, updateActivity, deleteFileByUrl } from "@/app/actions/activity";
import RichTextEditor from "./RichTextEditor";
import { uploadFiles } from "@/lib/uploadthing";
import { Loader2 } from "lucide-react";

// DEFINIMOS EL CONTRATO (PROPS) DEL FORMULARIO UNIVERSAL
interface ActivityFormProps {
  mode?: "create" | "edit";
  activityId?: string;
  initialTitle?: string;
  initialDescription?: string;
  onClose?: () => void; // Para cerrar el formulario si está en un modal/tarjeta
}

export default function ActivityForm({ 
  mode = "create", 
  activityId, 
  initialTitle = "", 
  initialDescription = "", 
  onClose 
}: ActivityFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const fileAttachmentRef = useRef<HTMLInputElement>(null);
  
  // Si es modo creación empieza cerrado, si es edición empieza abierto obligatoriamente
  const [isOpen, setIsOpen] = useState(mode === "edit");
  
  const [isPending, setIsPending] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [htmlContent, setHtmlContent] = useState(initialDescription);
  
  const [attachments, setAttachments] = useState<{ url: string; name: string }[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      const res = await uploadFiles("adminAttachmentUploader", {
        files: Array.from(files),
      });

      if (res && res.length > 0) {
        const newAttachments = res.map(file => ({ url: file.url, name: file.name }));
        setAttachments(prev => [...prev, ...newAttachments]);
      }
    } catch (error) {
      alert("Error al adjuntar archivo (Máx 16MB).");
    } finally {
      setIsUploadingAttachment(false);
      if (fileAttachmentRef.current) fileAttachmentRef.current.value = "";
    }
  };

  // BOTÓN QUITAR INDIVIDUAL (Resuelve Obs. 4 de forma física)
  const handleRemoveAttachment = async (indexToRemove: number, url: string) => {
    // 1. Lo quitamos de la vista del usuario inmediatamente
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
    // 2. Destruimos el archivo en los servidores de UploadThing para liberar espacio
    await deleteFileByUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);

    try {
      let finalHtml = htmlContent;

      // Si el usuario subió nuevos adjuntos en esta sesión, los anexamos elegantemente al HTML
      if (attachments.length > 0) {
        const attachmentsHtml = `
          <div class="mt-8 border-t border-gray-200 pt-6">
            <h4 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">📎 Archivos Adjuntos:</h4>
            <ul class="flex flex-col gap-3">
              ${attachments.map(att => `
                <li>
                  <a href="${att.url}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 text-brand-navy hover:text-brand-accent bg-gray-50 hover:bg-brand-light px-4 py-3 rounded-lg border border-gray-200 transition-all font-semibold text-sm shadow-sm hover:shadow">
                    Descargar: ${att.name}
                  </a>
                </li>
              `).join('')}
            </ul>
          </div>
        `;
        finalHtml += attachmentsHtml;
      }

      if (mode === "create") {
        // Ejecutamos flujo de creación tradicional
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", finalHtml);
        await createActivity(formData);
        
        // Limpieza de campos
        formRef.current?.reset();
        setTitle("");
        setHtmlContent("");
        setAttachments([]);
        setIsOpen(false);
      } else if (mode === "edit" && activityId) {
        // Ejecutamos el flujo inteligente de edición y escaneo de zombies
        await updateActivity(activityId, title, finalHtml);
        if (onClose) onClose(); // Le avisamos a la tarjeta que cierre el modo edición
      }

      window.location.reload();
    } catch (error) {
      alert("Hubo un error al procesar la publicación.");
    } finally {
      setIsPending(false);
    }
  };

  const isEmptyContent = !htmlContent.trim() || htmlContent === "<p></p>";
  const canSubmit = !isPending && (title.trim() !== "") && (!isEmptyContent || attachments.length > 0);

  // VISTA CERRADA (Sólo válida en modo creación)
  if (!isOpen && mode === "create") {
    return (
      <div className="mb-8 animate-fade-in">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-brand-navy text-white px-6 py-3 rounded-xl font-semibold shadow-sm hover:shadow-md hover:bg-opacity-95 transition-all text-sm cursor-pointer flex items-center gap-2"
        >
          <span className="text-lg">➕</span> Redactar Nueva Comunicación
        </button>
      </div>
    );
  }

  // VISTA DEL FORMULARIO COMPLETO (Universal para crear o editar)
  return (
    <form onSubmit={handleSubmit} ref={formRef} className={`bg-white p-6 rounded-xl shadow-sm border mb-8 animate-fade-in ${mode === 'edit' ? 'border-2 border-brand-accent' : 'border-brand-navy/10'}`}>
      <h3 className="text-lg font-bold text-brand-navy mb-4 flex items-center gap-2">
        <span>{mode === "create" ? "✍️ Publicar Comunicación Oficial" : "✏️ Editando Comunicado Oficial"}</span>
      </h3>
      
      <div className="space-y-4">
        <div>
          <input
            type="text"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del aviso o actividad..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-all font-medium text-brand-navy placeholder-gray-400"
          />
        </div>

        <div>
          <RichTextEditor content={htmlContent} onChange={setHtmlContent} />
        </div>

        {/* Zona de Adjuntos */}
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileAttachmentRef.current?.click()}
              disabled={isUploadingAttachment}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-brand-navy rounded-lg hover:bg-gray-100 transition-colors text-sm font-semibold border border-gray-200 shadow-sm"
            >
              <span className="text-lg">📎</span>
              {isUploadingAttachment ? "Subiendo a la nube..." : "Anexar más archivos (PDF, ZIP, Excel, Word)"}
            </button>
            <input type="file" ref={fileAttachmentRef} onChange={handleAttachmentChange} className="hidden" multiple />
          </div>
          
          {attachments.length > 0 && (
            <div className="bg-brand-light/30 p-4 rounded-lg border border-brand-navy/10">
              <p className="text-xs font-bold text-brand-navy uppercase tracking-wider mb-3">Archivos nuevos listos para anexarse:</p>
              <ul className="space-y-2">
                {attachments.map((att, idx) => (
                  <li key={idx} className="flex items-center justify-between bg-white px-4 py-2.5 border border-gray-200 rounded-lg text-sm shadow-sm">
                    <span className="truncate font-medium text-gray-700">{att.name}</span>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveAttachment(idx, att.url)}
                      className="text-red-500 hover:text-white hover:bg-red-500 rounded px-2 py-1 transition-colors font-bold text-xs uppercase"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Botones Inferiores de Acción */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => mode === "create" ? setIsOpen(false) : onClose?.()}
            disabled={isPending}
            className="px-6 py-2.5 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-all text-sm cursor-pointer disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex items-center gap-2 bg-brand-navy text-white px-6 py-2.5 rounded-xl font-semibold shadow-md shadow-brand-navy/10 hover:bg-opacity-95 transition-all disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed text-sm cursor-pointer"
          >
            {/* Si está trabajando, mostramos el spinner girando */}
            {isPending && <Loader2 size={16} className="animate-spin" />}
            
            {isPending ? "Procesando..." : mode === "create" ? "Publicar Comunicado" : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </form>
  );
}