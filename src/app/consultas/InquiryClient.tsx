// src/app/consultas/InquiryClient.tsx
"use client";

import { useState } from "react";
import { createInquiry, createInquiryResponse } from "@/app/actions/inquiry";
import { 
  MessageSquare, Plus, X, Globe, Lock, Send, 
  Clock, CheckCircle2, ShieldCheck, User, ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";

// --- Interfaces basadas en tu Prisma Schema ---
type InquiryCategory = "ACADEMICA" | "FINANCIERA" | "LOGISTICA" | "GENERAL";
type InquiryStatus = "PENDIENTE" | "RESPONDIDA" | "CERRADA";

interface InquiryResponse {
  id: string;
  content: string;
  createdAt: Date;
  user: { name: string | null; role: string };
}

interface Inquiry {
  id: string;
  title: string;
  content: string;
  category: InquiryCategory;
  status: InquiryStatus;
  isPublic: boolean;
  createdAt: Date;
  userId: string;
  user: { name: string | null; email: string | null; role: string };
  student: { id: string; firstName: string; lastName: string } | null;
  responses: InquiryResponse[];
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

interface InquiryClientProps {
  inquiries: Inquiry[];
  students: Student[];
  currentUserId: string;
}

export default function InquiryClient({ inquiries, students, currentUserId }: InquiryClientProps) {
  const [activeTab, setActiveTab] = useState<"mis-consultas" | "curso">("mis-consultas");
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const [expandedInquiryId, setExpandedInquiryId] = useState<string | null>(null);

  // Estados del formulario de nueva consulta
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<InquiryCategory>("GENERAL");
  const [isPublic, setIsPublic] = useState(true);
  const [studentId, setStudentId] = useState("");
  
  // Estado para la nueva respuesta en el hilo
  const [replyContent, setReplyContent] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingReplyId, setProcessingReplyId] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ 
    isOpen: false, type: "success", title: "", message: "" 
  });

  const myInquiries = inquiries.filter(inq => inq.userId === currentUserId);
  const courseInquiries = inquiries.filter(inq => inq.userId !== currentUserId && inq.isPublic);

  const listToDisplay = activeTab === "mis-consultas" ? myInquiries : courseInquiries;

  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createInquiry({
        title,
        content,
        category,
        isPublic,
        studentId: studentId || undefined,
      });
      setTitle(""); setContent(""); setCategory("GENERAL"); setIsPublic(true); setStudentId("");
      setIsMobileFormOpen(false);
      setAlertConfig({ isOpen: true, type: "success", title: "Consulta Enviada", message: "Tu consulta ha sido registrada exitosamente." });
      setActiveTab("mis-consultas");
    } catch (error) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo enviar la consulta." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (inquiryId: string) => {
    if (!replyContent.trim()) return;
    setProcessingReplyId(inquiryId);
    try {
      await createInquiryResponse(inquiryId, replyContent);
      setReplyContent("");
    } catch (error) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo enviar la respuesta." });
    } finally {
      setProcessingReplyId(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedInquiryId(prev => prev === id ? null : id);
    setReplyContent("");
  };

  const getStatusBadge = (status: InquiryStatus) => {
    switch (status) {
      case "PENDIENTE": return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1"><Clock size={12}/> EN REVISIÓN</span>;
      case "RESPONDIDA": return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={12}/> RESPONDIDA</span>;
      case "CERRADA": return <span className="bg-gray-200 text-gray-600 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1"><Lock size={12}/> CERRADA</span>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* --- COLUMNA IZQUIERDA: FORMULARIO DE NUEVA CONSULTA --- */}
      <div className="lg:col-span-1 h-fit lg:sticky lg:top-6 flex flex-col gap-4">
        
        {/* Botón Móvil */}
        <button 
          type="button"
          onClick={() => setIsMobileFormOpen(!isMobileFormOpen)}
          className="flex lg:hidden! w-full bg-brand-navy text-white py-3 rounded-xl font-bold items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          {isMobileFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isMobileFormOpen ? "Ocultar Formulario" : "Hacer una Consulta"}
        </button>

        <form onSubmit={handleCreateInquiry} className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 transition-all lg:block! ${isMobileFormOpen ? 'block' : 'hidden'}`}>
          <div>
            <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-500" />
              Nueva Consulta
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">La directiva te responderá a la brevedad posible.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Título o Asunto</label>
              <input
                type="text" value={title} onChange={e => setTitle(e.target.value)} required
                placeholder="Ej: Dudas sobre el paseo de fin de año"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Categoría</label>
              <select
                value={category} onChange={e => setCategory(e.target.value as InquiryCategory)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
              >
                <option value="GENERAL">General</option>
                <option value="ACADEMICA">Académica</option>
                <option value="FINANCIERA">Financiera / Tesorería</option>
                <option value="LOGISTICA">Logística / Eventos</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mensaje Detallado</label>
              <textarea
                value={content} onChange={e => setContent(e.target.value)} required rows={4}
                placeholder="Escribe tu duda de forma clara..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 resize-none"
              />
            </div>

            {students.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">¿Aplica a un alumno en particular? (Opcional)</label>
                <select
                  value={studentId} onChange={e => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white"
                >
                  <option value="">-- No aplica / Consulta general --</option>
                  {students.map(s => <option key={s.id} value={s.id}>🎓 {s.firstName} {s.lastName}</option>)}
                </select>
              </div>
            )}

            <div className="pt-2 border-t border-gray-50">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Visibilidad de la consulta</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button" onClick={() => setIsPublic(true)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex justify-center gap-1.5 items-center ${isPublic ? "bg-blue-50 text-blue-700 border-blue-300 shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                >
                  <Globe size={14}/> Pública (Foro)
                </button>
                <button
                  type="button" onClick={() => setIsPublic(false)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex justify-center gap-1.5 items-center ${!isPublic ? "bg-amber-50 text-amber-700 border-amber-300 shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
                >
                  <Lock size={14}/> Privada (Directiva)
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 leading-tight">
                * Las consultas públicas ayudarán a otros apoderados con la misma duda.
              </p>
            </div>
          </div>

          <button
            type="submit" disabled={isSubmitting}
            className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/10 hover:bg-blue-700 transition-all cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {isSubmitting ? "Enviando..." : "Enviar Consulta"}
          </button>
        </form>
      </div>

      {/* --- COLUMNA DERECHA: BANDEJA Y FORO --- */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        
        {/* Pestañas */}
        <div className="flex border-b border-gray-200 gap-2">
          <button
            onClick={() => setActiveTab("mis-consultas")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "mis-consultas" ? "border-brand-navy text-brand-navy" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Tus Consultas ({myInquiries.length})
          </button>
          <button
            onClick={() => setActiveTab("curso")}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "curso" ? "border-brand-navy text-brand-navy" : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            Foro del Curso <Globe size={14} className="opacity-70"/>
          </button>
        </div>

        {/* Lista de Consultas */}
        <div className="space-y-4 mt-2">
          {listToDisplay.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center shadow-sm">
              <MessageSquare size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 font-medium">No hay consultas en esta sección por el momento.</p>
            </div>
          ) : (
            listToDisplay.map((inq) => {
              const isExpanded = expandedInquiryId === inq.id;
              const isOwner = inq.userId === currentUserId;

              return (
                <div key={inq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                  {/* Encabezado de la Tarjeta (Clickable) */}
                  <div 
                    onClick={() => toggleExpand(inq.id)}
                    className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(inq.status)}
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md uppercase">
                          {inq.category}
                        </span>
                        {!inq.isPublic && <span className="text-amber-600 flex items-center"><Lock size={12}/></span>}
                      </div>
                      <h4 className="text-base font-bold text-brand-navy">{inq.title}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{inq.content}</p>
                    </div>
                    
                    <div className="flex items-center justify-between sm:flex-col sm:items-end sm:gap-2 shrink-0">
                      <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                        {new Date(inq.createdAt).toLocaleDateString("es-CL")}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-lg">
                        {inq.responses.length} {inq.responses.length === 1 ? 'respuesta' : 'respuestas'}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Cuerpo Expandido (Hilo de Respuestas) */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-4 animate-fade-in">
                      
                      {/* Mensaje Original */}
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-gray-100 p-1.5 rounded-full text-gray-500"><User size={14}/></div>
                          <div>
                            <p className="text-xs font-bold text-gray-800">{isOwner ? "Tú" : inq.user.name || "Apoderado"}</p>
                            <p className="text-[10px] text-gray-400">{new Date(inq.createdAt).toLocaleString("es-CL")}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{inq.content}</p>
                        {inq.student && (
                          <div className="mt-3 pt-2 border-t border-gray-50">
                            <span className="text-[10px] font-bold text-brand-accent flex items-center gap-1">
                              🎓 Relacionado a: {inq.student.firstName} {inq.student.lastName}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Hilo de Respuestas */}
                      {inq.responses.map(res => {
                        const isAdmin = res.user.role === "ADMIN";
                        return (
                          <div key={res.id} className={`p-4 rounded-xl border shadow-sm relative ${isAdmin ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-gray-100 ml-4'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              {isAdmin ? (
                                <div className="bg-blue-500 p-1.5 rounded-full text-white"><ShieldCheck size={14}/></div>
                              ) : (
                                <div className="bg-gray-100 p-1.5 rounded-full text-gray-500"><User size={14}/></div>
                              )}
                              <div>
                                <p className={`text-xs font-bold ${isAdmin ? 'text-blue-800' : 'text-gray-800'}`}>
                                  {res.user.name || "Usuario"} {isAdmin && "(Directiva)"}
                                </p>
                                <p className="text-[10px] text-gray-400">{new Date(res.createdAt).toLocaleString("es-CL")}</p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{res.content}</p>
                          </div>
                        );
                      })}

                      {/* Caja para Responder */}
                      {inq.status !== "CERRADA" ? (
                        <div className="flex gap-2 pt-2">
                          <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Escribe una respuesta..."
                            className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleSendReply(inq.id)}
                          />
                          <button
                            onClick={() => handleSendReply(inq.id)}
                            disabled={!replyContent.trim() || processingReplyId === inq.id}
                            className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[44px]"
                          >
                            {processingReplyId === inq.id ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center p-3 bg-gray-100 rounded-xl text-xs text-gray-500 font-medium flex items-center justify-center gap-2">
                          <Lock size={14}/> Esta consulta ha sido cerrada y no admite nuevas respuestas.
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
}