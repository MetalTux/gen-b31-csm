// src/app/admin/encuestas/AdminPollClient.tsx
"use client";

import { useState } from "react";
import { QuestionType } from "@prisma/client";
import { 
  createPoll, togglePollStatus, deletePoll, updatePoll, deleteStudentVotes 
} from "@/app/actions/poll";
import { 
  Loader2, HelpCircle, Plus, Trash2, Lock, Unlock, 
  Clock, Users, BarChart2, AlertCircle, X, Share2, Pencil, Type
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

// --- INTERFACES ACTUALIZADAS ---
interface PollVoteDetail {
  id: string;
  quantity: number;
  customText: string | null;
  student: { id: string; firstName: string; lastName: string };
  user: { name: string | null; email: string | null };
  pollOption: { text: string };
  createdAt: Date;
}

interface PollOption {
  id: string;
  text: string;
  isCustomText: boolean;
}

interface PollQuestion {
  id: string;
  title: string;
  type: QuestionType;
  maxSelections: number | null;
  maxTotalQuantity: number | null;
  options: PollOption[];
  votes: PollVoteDetail[];
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  expiresAt: Date | string | null;
  isActive: boolean;
  questions: PollQuestion[];
}

// Interfaces para el Constructor del Formulario
interface OptionForm { id: number; text: string; isCustomText: boolean; }
interface QuestionForm { id: number; title: string; type: QuestionType; maxSelections?: number; maxTotalQuantity?: number; options: OptionForm[]; }

export default function AdminPollClient({ polls }: { polls: Poll[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

  // Estados del Formulario
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { id: 1, title: "", type: "SINGLE_CHOICE", options: [{ id: 1, text: "", isCustomText: false }, { id: 2, text: "", isCustomText: false }] }
  ]);

  // Estados Formulario Editar Metadatos
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ isOpen: false, type: "success", title: "", message: "" });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => Promise<void>; }>({ isOpen: false, title: "", message: "", onConfirm: async () => {} });

  // --- LÓGICA DEL CONSTRUCTOR DE FORMULARIOS ---
  const addQuestion = () => {
    setQuestions([...questions, { id: Date.now(), title: "", type: "SINGLE_CHOICE", options: [{ id: 1, text: "", isCustomText: false }, { id: 2, text: "", isCustomText: false }] }]);
  };
  
  const removeQuestion = (qId: number) => {
    if (questions.length > 1) setQuestions(questions.filter(q => q.id !== qId));
  };

  // SOLUCIÓN: Usamos genéricos (<K>) para evitar el uso de 'any'
  const updateQuestion = <K extends keyof QuestionForm>(qId: number, field: K, value: QuestionForm[K]) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, [field]: value } : q));
  };

  const addOption = (qId: number) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, options: [...q.options, { id: Date.now(), text: "", isCustomText: false }] } : q));
  };

  // SOLUCIÓN: Usamos genéricos (<K>) para evitar el uso de 'any'
  const updateOption = <K extends keyof OptionForm>(qId: number, optId: number, field: K, value: OptionForm[K]) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, options: q.options.map(o => o.id === optId ? { ...o, [field]: value } : o) } : q));
  };

  const removeOption = (qId: number, optId: number) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, options: q.options.filter(o => o.id !== optId) } : q));
  };

  // --- ACCIONES CON LA BASE DE DATOS ---
  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || questions.length === 0 || isSubmitting) return;

    for (const q of questions) {
      if (!q.title.trim()) return setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "Todas las preguntas deben tener un título." });
      if (q.options.length < 2) return setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "Cada pregunta debe tener al menos 2 opciones." });
      for (const o of q.options) {
        if (!o.text.trim()) return setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "Ninguna opción puede estar vacía." });
      }
    }

    setIsSubmitting(true);
    try {
      const dateParsed = expiresAt ? new Date(expiresAt) : null;
      await createPoll({ 
        title, description, expiresAt: dateParsed, 
        questions: questions.map(q => ({
          title: q.title, type: q.type, maxSelections: q.maxSelections || null, maxTotalQuantity: q.maxTotalQuantity || null,
          options: q.options.map(o => ({ text: o.text, isCustomText: o.isCustomText }))
        })) 
      });
      
      setTitle(""); setDescription(""); setExpiresAt("");
      setQuestions([{ id: 1, title: "", type: "SINGLE_CHOICE", options: [{ id: 1, text: "", isCustomText: false }, { id: 2, text: "", isCustomText: false }] }]);
      setAlertConfig({ isOpen: true, type: "success", title: "Formulario Creado", message: "La consulta ya está disponible." });
      setIsMobileFormOpen(false);
    } catch (error) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: error instanceof Error ? error.message : "Error al guardar." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (poll: Poll) => {
    setEditingPoll(poll); setEditTitle(poll.title); setEditDescription(poll.description || "");
    if (poll.expiresAt) {
      const date = new Date(poll.expiresAt);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      setEditExpiresAt(date.toISOString().slice(0, 16));
    } else { setEditExpiresAt(""); }
  };

  const handleUpdatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPoll || !editTitle || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updatePoll(editingPoll.id, editTitle, editDescription, editExpiresAt ? new Date(editExpiresAt) : null);
      setEditingPoll(null);
      setAlertConfig({ isOpen: true, type: "success", title: "Actualizado", message: "La encuesta ha sido modificada." });
    } catch {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudieron guardar los cambios." });
    } finally { setIsSubmitting(false); }
  };

  const triggerToggleStatus = (poll: Poll) => {
    setConfirmConfig({
      isOpen: true, title: poll.isActive ? "¿Cerrar Votación?" : "¿Reabrir Votación?",
      message: poll.isActive ? "Ya no se recibirán nuevos votos." : "Se habilitará nuevamente la recepción de votos.",
      onConfirm: async () => {
        setProcessingId(poll.id);
        try { await togglePollStatus(poll.id, !poll.isActive); setConfirmConfig(prev => ({ ...prev, isOpen: false })); }
        catch { setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo cambiar el estado." }); }
        finally { setProcessingId(null); }
      }
    });
  };

  const triggerDelete = (pollId: string) => {
    setConfirmConfig({
      isOpen: true, title: "¿Eliminar Formulario?", message: "Acción irreversible. Borrará todo el historial de respuestas. ¿Seguro?",
      onConfirm: async () => {
        setProcessingId(pollId);
        try { await deletePoll(pollId); setConfirmConfig(prev => ({ ...prev, isOpen: false })); }
        catch { setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo eliminar." }); }
        finally { setProcessingId(null); }
      }
    });
  };

  const triggerAnnulVote = (pollId: string, studentId: string, studentName: string) => {
    setConfirmConfig({
      isOpen: true, title: "Anular Respuesta del Alumno",
      message: `¿Estás seguro de borrar las respuestas de ${studentName}? El apoderado podrá volver a enviar el formulario.`,
      onConfirm: async () => {
        setProcessingId(`${pollId}-${studentId}`);
        try { await deleteStudentVotes(pollId, studentId); setConfirmConfig(prev => ({ ...prev, isOpen: false })); }
        catch { setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo anular." }); }
        finally { setProcessingId(null); }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative">
      
      {/* --- COLUMNA IZQUIERDA: CREAR ENCUESTA (CONSTRUCTOR) --- */}
      <div className="xl:col-span-1 h-fit xl:sticky xl:top-6 flex flex-col gap-4">
        <button onClick={() => setIsMobileFormOpen(!isMobileFormOpen)} className="flex xl:hidden! w-full bg-brand-navy text-white py-3 rounded-xl font-bold items-center justify-center gap-2 shadow-sm cursor-pointer">
          {isMobileFormOpen ? <X size={18} /> : <Plus size={18} />} {isMobileFormOpen ? "Ocultar Creador" : "Crear Formulario Dinámico"}
        </button>

        <form onSubmit={handleCreatePoll} className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 transition-all xl:block! max-h-[85vh] overflow-y-auto custom-scrollbar ${isMobileFormOpen ? 'block' : 'hidden'}`}>
          <div>
            <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2"><HelpCircle size={20} className="text-brand-accent" /> Constructor Dinámico</h3>
            <p className="text-xs text-gray-400 mt-0.5">Diseña encuestas con múltiples secciones.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Título del Formulario</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-accent text-gray-700 font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Descripción</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-accent text-gray-700 resize-none" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5"><Clock size={13} className="text-brand-accent"/> Vencimiento</label>
              <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 cursor-pointer bg-white" />
            </div>

            {/* SECCIONES (PREGUNTAS) */}
            <div className="space-y-6 border-t border-gray-100 pt-4">
              <label className="text-sm font-black text-brand-navy flex items-center justify-between">
                Secciones del Formulario
                <button type="button" onClick={addQuestion} className="text-xs text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 cursor-pointer"><Plus size={14}/> Agregar</button>
              </label>

              {questions.map((q, qIndex) => (
                <div key={q.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 relative">
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(q.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 cursor-pointer p-1"><Trash2 size={16}/></button>
                  )}
                  
                  <div className="space-y-1 pr-6">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Pregunta {qIndex + 1}</label>
                    <input type="text" placeholder="Ej: Indique el tipo de empanada" value={q.title} onChange={e => updateQuestion(q.id, 'title', e.target.value)} required className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Tipo de Respuesta</label>
                    <select value={q.type} onChange={e => updateQuestion(q.id, 'type', e.target.value as QuestionType)} className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white cursor-pointer">
                      <option value="SINGLE_CHOICE">Única (Solo puede elegir 1 opción)</option>
                      <option value="MULTIPLE_CHOICE">Múltiple (Puede elegir varias opciones)</option>
                      <option value="QUANTITY">Cantidades (Ej: 3 empanadas a repartir)</option>
                    </select>
                  </div>

                  {q.type === "MULTIPLE_CHOICE" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Máximo de Opciones Permitidas</label>
                      <input type="number" min="1" placeholder="Ej: 2" value={q.maxSelections || ''} onChange={e => updateQuestion(q.id, 'maxSelections', parseInt(e.target.value))} className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300" />
                    </div>
                  )}

                  {q.type === "QUANTITY" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Cantidad Total Máxima a elegir</label>
                      <input type="number" min="1" placeholder="Ej: 3" value={q.maxTotalQuantity || ''} onChange={e => updateQuestion(q.id, 'maxTotalQuantity', parseInt(e.target.value))} required className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-amber-50" />
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Opciones</label>
                    {q.options.map((opt, oIndex) => (
                      <div key={opt.id} className="flex flex-col gap-1 bg-white p-2 border border-gray-200 rounded-lg">
                        <div className="flex gap-2">
                          <input type="text" placeholder={`Opción ${oIndex + 1}`} value={opt.text} onChange={e => updateOption(q.id, opt.id, 'text', e.target.value)} required className="flex-1 px-2 py-1 text-xs rounded-md border border-gray-300" />
                          {q.options.length > 2 && (
                            <button type="button" onClick={() => removeOption(q.id, opt.id)} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"><X size={14}/></button>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <input type="checkbox" id={`custom-${opt.id}`} checked={opt.isCustomText} onChange={e => updateOption(q.id, opt.id, 'isCustomText', e.target.checked)} className="rounded border-gray-300 cursor-pointer" />
                          {/* SOLUCIÓN JSX: Escapar comillas con &quot; */}
                          <label htmlFor={`custom-${opt.id}`} className="text-[10px] text-gray-500 cursor-pointer">Requerir texto al usuario (Ej: &quot;Otros&quot;)</label>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={() => addOption(q.id)} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer pt-1"><Plus size={12}/> Añadir Opción</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-brand-navy text-white font-bold rounded-xl text-sm shadow-md hover:bg-opacity-95 transition-all cursor-pointer disabled:bg-gray-200 flex justify-center items-center gap-2">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Publicar Formulario"}
          </button>
        </form>
      </div>

      {/* --- COLUMNA DERECHA: HISTORIAL DE ENCUESTAS --- */}
      <div className="xl:col-span-2 space-y-6">
        {polls.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 italic text-sm"><BarChart2 size={32} className="mx-auto mb-3 text-gray-300" /> No hay formularios publicados.</div>
        ) : (
          polls.map(poll => {
            const uniqueStudents = new Set();
            poll.questions.forEach(q => q.votes.forEach(v => uniqueStudents.add(v.student.id)));
            const totalUniqueVoters = uniqueStudents.size;

            const isExpired = poll.expiresAt && new Date() > new Date(poll.expiresAt);
            const effectivelyActive = poll.isActive && !isExpired;

            return (
              <div key={poll.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
                
                <div className={`p-5 border-b border-gray-100 flex items-start justify-between gap-4 ${effectivelyActive ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {effectivelyActive 
                        ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1"><Unlock size={10}/> Abierta</span>
                        : <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 flex items-center gap-1"><Lock size={10}/> Cerrada</span>
                      }
                      <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1"><Users size={10}/> {totalUniqueVoters} respuestas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-brand-navy">{poll.title}</h3>
                      <button onClick={() => openEditModal(poll)} className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md cursor-pointer"><Pencil size={14} /></button>
                    </div>
                    {poll.description && <p className="text-sm text-gray-600 mt-1">{poll.description}</p>}
                    {poll.expiresAt && (
                      <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${isExpired ? 'text-red-500' : 'text-amber-600'}`}>
                        {isExpired ? <AlertCircle size={12}/> : <Clock size={12}/>} Vence el {new Date(poll.expiresAt).toLocaleString("es-CL", { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => triggerToggleStatus(poll)} disabled={processingId === poll.id} className="p-2 text-gray-400 hover:text-brand-navy hover:bg-gray-100 rounded-xl cursor-pointer">
                      {processingId === poll.id ? <Loader2 size={16} className="animate-spin" /> : effectivelyActive ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <button onClick={() => triggerDelete(poll.id)} disabled={processingId === poll.id} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl cursor-pointer"><Trash2 size={16} /></button>
                  </div>
                </div>

                {/* RESULTADOS POR SECCIÓN */}
                <div className="p-5 space-y-6">
                  {poll.questions.map((q, i) => {
                    const totalQuantityInQuestion = q.votes.reduce((acc, v) => acc + v.quantity, 0);

                    return (
                      <div key={q.id} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                        <h4 className="text-sm font-bold text-brand-navy mb-3 flex items-center gap-2">
                          <span className="bg-brand-navy text-white w-5 h-5 flex items-center justify-center rounded text-xs">{i+1}</span>
                          {q.title}
                        </h4>
                        
                        <div className="space-y-3">
                          {q.options.map((opt, idx) => {
                            const optionQuantity = q.votes.filter(v => v.pollOption.text === opt.text).reduce((acc, v) => acc + v.quantity, 0);
                            const percentage = totalQuantityInQuestion === 0 ? 0 : Math.round((optionQuantity / totalQuantityInQuestion) * 100);
                            const colorClass = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"][idx % 4];

                            return (
                              <div key={opt.id} className="relative">
                                <div className="flex justify-between text-xs font-bold mb-1.5 px-1">
                                  <span className="text-gray-700 flex items-center gap-1">
                                    {opt.text} 
                                    {opt.isCustomText && (
                                      <span title="Incluye textos personalizados">
                                        <Type size={12} className="text-gray-400" />
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-brand-navy">{optionQuantity} ({percentage}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {totalUniqueVoters > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button onClick={() => setExpandedPollId(expandedPollId === poll.id ? null : poll.id)} className="text-xs font-bold text-blue-600 hover:underline w-full text-center py-1 cursor-pointer">
                        {expandedPollId === poll.id ? "Ocultar detalle de respuestas" : "Ver detalle de quién respondió"}
                      </button>
                      
                      {expandedPollId === poll.id && (
                        <div className="mt-3 max-h-60 overflow-y-auto bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-200">
                          {Array.from(uniqueStudents).map(studentId => {
                            const studentVotes = poll.questions.flatMap(q => q.votes.filter(v => v.student.id === studentId));
                            const studentData = studentVotes[0].student;
                            const userData = studentVotes[0].user;
                            const isProcessing = processingId === `${poll.id}-${studentId}`;

                            return (
                              <div key={studentId as string} className="p-3 text-xs flex justify-between items-start group/vote">
                                <div className="space-y-1 flex-1">
                                  <div>
                                    <span className="font-bold text-brand-navy block">🎓 {studentData.firstName} {studentData.lastName}</span>
                                    <span className="text-gray-400 text-[10px]">Respuestas de: {userData.name || userData.email}</span>
                                  </div>
                                  <div className="bg-white border border-gray-200 p-2 rounded-lg space-y-1">
                                    {studentVotes.map(v => (
                                      <div key={v.id} className="flex items-start gap-1">
                                        <span className="text-brand-accent font-bold">[{v.quantity}]</span>
                                        <span className="font-medium text-gray-700">{v.pollOption.text}</span>
                                        {/* SOLUCIÓN JSX: Escapar comillas con &quot; */}
                                        {v.customText && <span className="text-gray-500 italic ml-1">&quot;{v.customText}&quot;</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <button onClick={() => triggerAnnulVote(poll.id, studentData.id, `${studentData.firstName}`)} disabled={isProcessing} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-all cursor-pointer opacity-100 lg:opacity-0 group-hover/vote:opacity-100 shrink-0 ml-2">
                                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- MODAL DE EDICIÓN FLOTANTE (Solo Metadatos) --- */}
      {editingPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setEditingPoll(null)} className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-1.5 rounded-full cursor-pointer"><X size={18} /></button>
            <form onSubmit={handleUpdatePoll} className="space-y-4">
              <h3 className="text-xl font-black text-brand-navy text-center mb-4">Editar Encuesta</h3>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500">Título</label><input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500">Descripción</label><textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 resize-none" /></div>
              <div className="space-y-1"><label className="text-xs font-bold text-gray-500">Vencimiento</label><input type="datetime-local" value={editExpiresAt} onChange={e => setEditExpiresAt(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white" /></div>
              <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 cursor-pointer">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Guardar Cambios"}</button>
            </form>
          </div>
        </div>
      )}
      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isPending={processingId !== null} />
    </div>
  );
}