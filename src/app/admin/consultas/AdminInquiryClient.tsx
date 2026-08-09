// src/app/admin/consultas/AdminInquiryClient.tsx
"use client";

import { useState } from "react";
import { createInquiryResponse, closeInquiry } from "@/app/actions/inquiry";
import { 
  MessageSquare, Globe, Lock, Send, Clock, 
  CheckCircle2, ShieldCheck, User, ChevronDown, 
  ChevronUp, Loader2, Search, XCircle
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

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
  user: { name: string | null; email: string | null; role: string };
  student: { firstName: string; lastName: string } | null;
  responses: InquiryResponse[];
}

interface AdminInquiryClientProps {
  inquiries: Inquiry[];
  currentUserId: string;
}

export default function AdminInquiryClient({ inquiries, currentUserId }: AdminInquiryClientProps) {
  const [activeTab, setActiveTab] = useState<InquiryStatus>("PENDIENTE");
  const [expandedInquiryId, setExpandedInquiryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [replyContent, setReplyContent] = useState("");
  const [processingReplyId, setProcessingReplyId] = useState<string | null>(null);
  const [processingCloseId, setProcessingCloseId] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ 
    isOpen: false, type: "success", title: "", message: "" 
  });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => Promise<void>; }>({ 
    isOpen: false, title: "", message: "", onConfirm: async () => {} 
  });

  // Filtramos por Pestaña y Término de búsqueda
  const filteredInquiries = inquiries.filter(inq => {
    const matchesTab = inq.status === activeTab;
    const matchesSearch = inq.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (inq.user.name?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Contadores para las pestañas
  const counts = {
    PENDIENTE: inquiries.filter(i => i.status === "PENDIENTE").length,
    RESPONDIDA: inquiries.filter(i => i.status === "RESPONDIDA").length,
    CERRADA: inquiries.filter(i => i.status === "CERRADA").length,
  };

  const handleSendReply = async (inquiryId: string) => {
    if (!replyContent.trim()) return;
    setProcessingReplyId(inquiryId);
    try {
      await createInquiryResponse(inquiryId, replyContent);
      setReplyContent("");
      setAlertConfig({ isOpen: true, type: "success", title: "Respuesta Enviada", message: "La respuesta se ha publicado correctamente." });
    } catch (error) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo enviar la respuesta." });
    } finally {
      setProcessingReplyId(null);
    }
  };

  const triggerCloseTicket = (inquiryId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "¿Cerrar Consulta?",
      message: "Al cerrar este ticket, ni el apoderado ni la directiva podrán agregar más respuestas. ¿Confirmas esta acción?",
      onConfirm: async () => {
        setProcessingCloseId(inquiryId);
        try {
          await closeInquiry(inquiryId);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setExpandedInquiryId(null); // Colapsar al cerrar
          setAlertConfig({ isOpen: true, type: "success", title: "Consulta Cerrada", message: "El hilo ha sido cerrado permanentemente." });
        } catch (error) {
          setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo cerrar la consulta." });
        } finally {
          setProcessingCloseId(null);
        }
      }
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedInquiryId(prev => prev === id ? null : id);
    setReplyContent("");
  };

  return (
    <div className="space-y-6">
      
      {/* Pestañas de Navegación y Búsqueda */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="flex gap-1 overflow-x-auto">
          {(["PENDIENTE", "RESPONDIDA", "CERRADA"] as InquiryStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => { setActiveTab(status); setExpandedInquiryId(null); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === status 
                  ? "bg-brand-navy text-white shadow-md" 
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {status === "PENDIENTE" && <Clock size={14} />}
              {status === "RESPONDIDA" && <CheckCircle2 size={14} />}
              {status === "CERRADA" && <Lock size={14} />}
              {status} 
              <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeTab === status ? "bg-white/20" : "bg-gray-200"}`}>
                {counts[status]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-64 pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-navy bg-gray-50"
          />
        </div>
      </div>

      {/* Lista de Consultas */}
      <div className="space-y-4">
        {filteredInquiries.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center shadow-sm">
            <MessageSquare size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No hay consultas en esta sección.</p>
          </div>
        ) : (
          filteredInquiries.map((inq) => {
            const isExpanded = expandedInquiryId === inq.id;

            return (
              <div key={inq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                {/* Encabezado de la Tarjeta (Clickable) */}
                <div 
                  onClick={() => toggleExpand(inq.id)}
                  className="p-5 cursor-pointer hover:bg-gray-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className="hidden sm:flex bg-blue-50 p-3 rounded-xl text-blue-600">
                      <User size={20} />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md uppercase">
                          {inq.category}
                        </span>
                        {inq.isPublic ? (
                          <span className="text-emerald-600 flex items-center gap-1 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-md"><Globe size={10}/> PÚBLICA</span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1 text-[10px] font-bold bg-amber-50 px-2 py-0.5 rounded-md"><Lock size={10}/> PRIVADA</span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-brand-navy">{inq.title}</h4>
                      <p className="text-xs text-gray-500 font-medium">De: {inq.user.name || inq.user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:flex-col sm:items-end sm:gap-2 shrink-0">
                    <span className="text-[10px] text-gray-400 font-medium">
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
                  <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4 animate-fade-in">
                    
                    {/* Mensaje Original */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{inq.content}</p>
                      {inq.student && (
                        <div className="mt-3 pt-2 border-t border-gray-50">
                          <span className="text-[10px] font-bold text-brand-accent">
                            🎓 Sobre el alumno: {inq.student.firstName} {inq.student.lastName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Hilo de Respuestas */}
                    {inq.responses.map(res => {
                      const isAdmin = res.user.role === "ADMIN";
                      return (
                        <div key={res.id} className={`p-4 rounded-xl border shadow-sm relative ${isAdmin ? 'bg-blue-50/50 border-blue-100 ml-4' : 'bg-white border-gray-100 mr-4'}`}>
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

                    {/* Caja para Responder y Controles Admin */}
                    {inq.status !== "CERRADA" ? (
                      <div className="pt-4 border-t border-gray-200 space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Redacta la respuesta oficial de la directiva..."
                            className="flex-1 px-4 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-inner"
                            onKeyDown={(e) => e.key === 'Enter' && handleSendReply(inq.id)}
                          />
                          <button
                            onClick={() => handleSendReply(inq.id)}
                            disabled={!replyContent.trim() || processingReplyId === inq.id}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-bold text-xs cursor-pointer"
                          >
                            {processingReplyId === inq.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            <span className="hidden sm:inline">Responder</span>
                          </button>
                        </div>
                        
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => triggerCloseTicket(inq.id)}
                            disabled={processingCloseId === inq.id}
                            className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {processingCloseId === inq.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                            Cerrar Ticket Permanentemente
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-3 bg-gray-200 rounded-xl text-xs text-gray-500 font-medium flex items-center justify-center gap-2 mt-4">
                        <Lock size={14}/> Esta consulta fue cerrada por la directiva.
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modales Compartidos */}
      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isPending={processingCloseId !== null} />
    </div>
  );
}