// src/app/admin/encuestas/AdminPollClient.tsx
"use client";

import { useState } from "react";
import { QuestionType } from "@prisma/client";
import { 
  createPoll, togglePollStatus, deletePoll, updatePoll, deleteStudentVotes 
} from "@/app/actions/poll";
import { 
  Loader2, HelpCircle, Plus, Trash2, Lock, Unlock, 
  Clock, Users, BarChart2, AlertCircle, X, Pencil, Type, Download, Clock3
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

// --- INTERFACES ACTUALIZADAS ---
interface SimpleStudent {
  id: string;
  firstName: string;
  lastName: string;
}

interface PollVoteDetail {
  id: string;
  quantity: number;
  customText: string | null;
  student: SimpleStudent;
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

interface OptionForm { id: string | number; text: string; isCustomText: boolean; }
interface QuestionForm { id: string | number; title: string; type: QuestionType; maxSelections?: number | null; maxTotalQuantity?: number | null; options: OptionForm[]; }

export default function AdminPollClient({ polls, allStudents }: { polls: Poll[], allStudents: SimpleStudent[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

  // Estados del Constructor Principal
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [questions, setQuestions] = useState<QuestionForm[]>([
    { id: 1, title: "", type: "SINGLE_CHOICE", options: [{ id: 1, text: "", isCustomText: false }, { id: 2, text: "", isCustomText: false }] }
  ]);

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ isOpen: false, type: "success", title: "", message: "" });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => Promise<void>; }>({ isOpen: false, title: "", message: "", onConfirm: async () => {} });

  // --- LÓGICA DEL CONSTRUCTOR ---
  const resetForm = () => {
    setEditingPollId(null); setTitle(""); setDescription(""); setExpiresAt("");
    setQuestions([{ id: 1, title: "", type: "SINGLE_CHOICE", options: [{ id: 1, text: "", isCustomText: false }, { id: 2, text: "", isCustomText: false }] }]);
  };

  const addQuestion = () => setQuestions([...questions, { id: Date.now(), title: "", type: "SINGLE_CHOICE", options: [{ id: 1, text: "", isCustomText: false }, { id: 2, text: "", isCustomText: false }] }]);
  const removeQuestion = (qId: string | number) => { if (questions.length > 1) setQuestions(questions.filter(q => q.id !== qId)); };
  const updateQuestion = <K extends keyof QuestionForm>(qId: string | number, field: K, value: QuestionForm[K]) => setQuestions(questions.map(q => q.id === qId ? { ...q, [field]: value } : q));
  const addOption = (qId: string | number) => setQuestions(questions.map(q => q.id === qId ? { ...q, options: [...q.options, { id: Date.now(), text: "", isCustomText: false }] } : q));
  const updateOption = <K extends keyof OptionForm>(qId: string | number, optId: string | number, field: K, value: OptionForm[K]) => setQuestions(questions.map(q => q.id === qId ? { ...q, options: q.options.map(o => o.id === optId ? { ...o, [field]: value } : o) } : q));
  const removeOption = (qId: string | number, optId: string | number) => setQuestions(questions.map(q => q.id === qId ? { ...q, options: q.options.filter(o => o.id !== optId) } : q));

  const openEditMode = (poll: Poll) => {
    setEditingPollId(poll.id); setTitle(poll.title); setDescription(poll.description || "");
    if (poll.expiresAt) {
      const date = new Date(poll.expiresAt);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      setExpiresAt(date.toISOString().slice(0, 16));
    } else { setExpiresAt(""); }
    setQuestions(poll.questions.map(q => ({ id: q.id, title: q.title, type: q.type, maxSelections: q.maxSelections, maxTotalQuantity: q.maxTotalQuantity, options: q.options.map(o => ({ id: o.id, text: o.text, isCustomText: o.isCustomText })) })));
    setIsMobileFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- LÓGICA PARA EXPORTAR A CSV (Formato Optimizado) ---
  const handleDownloadCSV = (poll: Poll) => {
    const studentData = new Map<string, {
      studentName: string;
      userName: string;
      userEmail: string;
      date: Date;
      responses: Record<string, { quantity: number, customText: string | null }>;
    }>();

    poll.questions.forEach(q => {
      q.votes.forEach(v => {
        if (!studentData.has(v.student.id)) {
          studentData.set(v.student.id, {
            studentName: `${v.student.lastName}, ${v.student.firstName}`,
            userName: v.user.name || "N/A",
            userEmail: v.user.email || "N/A",
            date: new Date(v.createdAt),
            responses: {}
          });
        }
        
        const record = studentData.get(v.student.id)!;
        
        if (new Date(v.createdAt) > record.date) {
          record.date = new Date(v.createdAt);
        }

        const key = `${q.id}_${v.pollOption.text}`;
        record.responses[key] = {
          quantity: v.quantity,
          customText: v.customText
        };
      });
    });

    if (studentData.size === 0) {
      setAlertConfig({ isOpen: true, type: "error", title: "Sin datos", message: "Esta encuesta aún no tiene respuestas para descargar." });
      return;
    }

    const headers = ["Alumno (Apellidos, Nombres)", "Nombre Apoderado", "Email Apoderado"];
    
    poll.questions.forEach((q, i) => {
      // SOLUCIÓN CABECERAS: Nombre de columna simplificado
      headers.push(`Pregunta ${i + 1}`);
      q.options.forEach(opt => {
        headers.push(opt.text);
      });
      if (q.options.some(o => o.isCustomText)) {
        headers.push(`Comentarios P${i + 1}`);
      }
    });
    headers.push("Fecha Votación");

    const rows: string[][] = [];
    const sortedStudents = Array.from(studentData.values()).sort((a, b) => 
      a.studentName.localeCompare(b.studentName)
    );

    sortedStudents.forEach(record => {
      const row = [
        record.studentName,
        record.userName,
        record.userEmail
      ];

      poll.questions.forEach(q => {
        // SOLUCIÓN FILAS: Imprimimos el texto de la pregunta en lugar del guion "-"
        row.push(q.title); 
        
        const comments: string[] = [];
        
        q.options.forEach(opt => {
          const key = `${q.id}_${opt.text}`;
          const response = record.responses[key];
          
          if (response) {
            row.push(response.quantity.toString());
            if (response.customText) {
              comments.push(`${opt.text}: ${response.customText}`);
            }
          } else {
            row.push("0");
          }
        });

        if (q.options.some(o => o.isCustomText)) {
          row.push(comments.join(" | "));
        }
      });

      row.push(record.date.toLocaleString("es-CL"));
      rows.push(row);
    });

    const csvContent = [
      headers.join(";"),
      ...rows.map(r => r.map(field => `"${field.replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = poll.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.href = url;
    link.setAttribute("download", `resultados_${safeTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- ACCIONES CON LA BASE DE DATOS ---
  const handleSubmitForm = async (e: React.FormEvent) => {
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
      if (editingPollId) {
        await updatePoll({ pollId: editingPollId, title, description, expiresAt: dateParsed, questions: questions.map(q => ({ id: q.id, title: q.title, type: q.type, maxSelections: q.maxSelections, maxTotalQuantity: q.maxTotalQuantity, options: q.options.map(o => ({ id: o.id, text: o.text, isCustomText: o.isCustomText })) })) });
        setAlertConfig({ isOpen: true, type: "success", title: "Encuesta Actualizada", message: "Los cambios de estructura se han guardado con éxito." });
      } else {
        await createPoll({ title, description, expiresAt: dateParsed, questions: questions.map(q => ({ title: q.title, type: q.type, maxSelections: q.maxSelections, maxTotalQuantity: q.maxTotalQuantity, options: q.options.map(o => ({ text: o.text, isCustomText: o.isCustomText })) })) });
        setAlertConfig({ isOpen: true, type: "success", title: "Formulario Creado", message: "La consulta ya está disponible." });
      }
      resetForm(); setIsMobileFormOpen(false);
    } catch (error) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: error instanceof Error ? error.message : "Error al guardar." });
    } finally { setIsSubmitting(false); }
  };

  const triggerToggleStatus = (poll: Poll) => {
    setConfirmConfig({ isOpen: true, title: poll.isActive ? "¿Cerrar Votación?" : "¿Reabrir Votación?", message: poll.isActive ? "Ya no se recibirán nuevos votos." : "Se habilitará nuevamente la recepción de votos.", onConfirm: async () => { setProcessingId(poll.id); try { await togglePollStatus(poll.id, !poll.isActive); setConfirmConfig(prev => ({ ...prev, isOpen: false })); } catch { setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo cambiar el estado." }); } finally { setProcessingId(null); } } });
  };

  const triggerDelete = (pollId: string) => {
    setConfirmConfig({ isOpen: true, title: "¿Eliminar Formulario?", message: "Acción irreversible. Borrará todo el historial de respuestas. ¿Seguro?", onConfirm: async () => { setProcessingId(pollId); try { await deletePoll(pollId); setConfirmConfig(prev => ({ ...prev, isOpen: false })); } catch { setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo eliminar." }); } finally { setProcessingId(null); } } });
  };

  const triggerAnnulVote = (pollId: string, studentId: string, studentName: string) => {
    setConfirmConfig({ isOpen: true, title: "Anular Respuesta del Alumno", message: `¿Estás seguro de borrar las respuestas de ${studentName}? El apoderado podrá volver a enviar el formulario.`, onConfirm: async () => { setProcessingId(`${pollId}-${studentId}`); try { await deleteStudentVotes(pollId, studentId); setConfirmConfig(prev => ({ ...prev, isOpen: false })); } catch { setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo anular." }); } finally { setProcessingId(null); } } });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative">
      
      {/* --- COLUMNA IZQUIERDA: CREAR/EDITAR ENCUESTA (CONSTRUCTOR) --- */}
      <div className="xl:col-span-1 h-fit xl:sticky xl:top-6 flex flex-col gap-4">
        <button onClick={() => setIsMobileFormOpen(!isMobileFormOpen)} className="flex xl:hidden! w-full bg-brand-navy text-white py-3 rounded-xl font-bold items-center justify-center gap-2 shadow-sm cursor-pointer">
          {isMobileFormOpen ? <X size={18} /> : <Plus size={18} />} {isMobileFormOpen ? "Ocultar Creador" : "Crear Formulario Dinámico"}
        </button>

        <form onSubmit={handleSubmitForm} className={`bg-white p-6 rounded-2xl border ${editingPollId ? 'border-brand-accent ring-2 ring-brand-accent/20' : 'border-gray-100'} shadow-sm space-y-6 transition-all xl:block! max-h-[85vh] overflow-y-auto custom-scrollbar ${isMobileFormOpen ? 'block' : 'hidden'}`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
                {editingPollId ? <Pencil size={20} className="text-brand-accent" /> : <HelpCircle size={20} className="text-brand-accent" />} 
                {editingPollId ? "Editando Formulario" : "Constructor Dinámico"}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{editingPollId ? "Modifica textos, añade o quita opciones." : "Diseña encuestas con múltiples secciones."}</p>
            </div>
            {editingPollId && (
              <button type="button" onClick={resetForm} className="text-xs font-bold text-gray-400 hover:text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors">
                Cancelar Edición
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Título del Formulario</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-accent text-gray-700 font-bold" /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Descripción</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-accent text-gray-700 resize-none" /></div>
            <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5"><Clock size={13} className="text-brand-accent"/> Vencimiento</label><input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 cursor-pointer bg-white" /></div>

            {/* SECCIONES (PREGUNTAS) */}
            <div className="space-y-6 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black text-brand-navy">Secciones / Preguntas</label>
                <button type="button" onClick={addQuestion} className="text-xs text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 cursor-pointer"><Plus size={14}/> Agregar</button>
              </div>

              {questions.map((q, qIndex) => (
                <div key={q.id} className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 relative">
                  {questions.length > 1 && (<button type="button" onClick={() => removeQuestion(q.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 cursor-pointer p-1"><Trash2 size={16}/></button>)}
                  
                  <div className="space-y-1 pr-6"><label className="text-[10px] font-bold text-gray-500 uppercase">Pregunta {qIndex + 1}</label><input type="text" placeholder="Ej: Indique el tipo de empanada" value={q.title} onChange={e => updateQuestion(q.id, 'title', e.target.value)} required className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300" /></div>
                  <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Tipo de Respuesta</label><select value={q.type} onChange={e => updateQuestion(q.id, 'type', e.target.value as QuestionType)} className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white cursor-pointer"><option value="SINGLE_CHOICE">Única (Solo 1 opción)</option><option value="MULTIPLE_CHOICE">Múltiple (Elegir varias opciones)</option><option value="QUANTITY">Cantidades (Repartir por números)</option></select></div>
                  {q.type === "MULTIPLE_CHOICE" && (<div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Máximo de Opciones (Opcional)</label><input type="number" min="1" placeholder="Sin límite" value={q.maxSelections || ''} onChange={e => updateQuestion(q.id, 'maxSelections', e.target.value ? parseInt(e.target.value) : null)} className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300" /></div>)}
                  {q.type === "QUANTITY" && (<div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Cantidad Total Máxima a elegir</label><input type="number" min="1" placeholder="Ej: 3" value={q.maxTotalQuantity || ''} onChange={e => updateQuestion(q.id, 'maxTotalQuantity', e.target.value ? parseInt(e.target.value) : null)} required className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-amber-50" /></div>)}

                  <div className="space-y-2 pt-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase block">Opciones</label>
                    {q.options.map((opt, oIndex) => (
                      <div key={opt.id} className="flex flex-col gap-1 bg-white p-2 border border-gray-200 rounded-lg">
                        <div className="flex gap-2">
                          <input type="text" placeholder={`Opción ${oIndex + 1}`} value={opt.text} onChange={e => updateOption(q.id, opt.id, 'text', e.target.value)} required className="flex-1 px-2 py-1 text-xs rounded-md border border-gray-300" />
                          {q.options.length > 2 && (<button type="button" onClick={() => removeOption(q.id, opt.id)} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer"><X size={14}/></button>)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <input type="checkbox" id={`custom-${opt.id}`} checked={opt.isCustomText} onChange={e => updateOption(q.id, opt.id, 'isCustomText', e.target.checked)} className="rounded border-gray-300 cursor-pointer" />
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
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (editingPollId ? "Guardar Cambios" : "Publicar Formulario")}
          </button>
        </form>
      </div>

      {/* --- COLUMNA DERECHA: HISTORIAL DE ENCUESTAS --- */}
      <div className="xl:col-span-2 space-y-6">
        {polls.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 italic text-sm"><BarChart2 size={32} className="mx-auto mb-3 text-gray-300" /> No hay formularios publicados.</div>
        ) : (
          polls.map(poll => {
            const uniqueStudents = new Set<string>();
            poll.questions.forEach(q => q.votes.forEach(v => uniqueStudents.add(v.student.id)));
            const totalUniqueVoters = uniqueStudents.size;

            const missingStudents = allStudents.filter(student => !uniqueStudents.has(student.id));

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
                      <button onClick={() => openEditMode(poll)} className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md cursor-pointer transition-colors" title="Editar Estructura"><Pencil size={14} /></button>
                    </div>
                    {poll.description && <p className="text-sm text-gray-600 mt-1">{poll.description}</p>}
                    {poll.expiresAt && (
                      <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${isExpired ? 'text-red-500' : 'text-amber-600'}`}>
                        {isExpired ? <AlertCircle size={12}/> : <Clock size={12}/>} Vence el {new Date(poll.expiresAt).toLocaleString("es-CL", { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>

                  {/* ZONA DE BOTONES (INCLUYE DESCARGA CSV) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleDownloadCSV(poll)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl cursor-pointer transition-colors" title="Descargar Resultados en Excel (CSV)">
                      <Download size={16} />
                    </button>
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
                                    {opt.isCustomText && (<span title="Incluye textos personalizados"><Type size={12} className="text-gray-400" /></span>)}
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

                  {/* ZONA DE DETALLE Y PENDIENTES */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button onClick={() => setExpandedPollId(expandedPollId === poll.id ? null : poll.id)} className="text-xs font-bold text-blue-600 hover:underline w-full text-center py-1 cursor-pointer">
                      {expandedPollId === poll.id ? "Ocultar detalle de respuestas" : "Ver detalle de respuestas y pendientes"}
                    </button>
                    
                    {expandedPollId === poll.id && (
                      <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-inner">
                        
                        {/* 1. SECCIÓN DE ALUMNOS QUE RESPONDIERON */}
                        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 font-bold text-xs text-brand-navy uppercase tracking-wide">
                          Respondieron ({uniqueStudents.size})
                        </div>
                        <div className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                          {totalUniqueVoters === 0 ? (
                            <div className="p-4 text-xs text-gray-400 italic text-center">Nadie ha respondido aún.</div>
                          ) : (
                            Array.from(uniqueStudents).map(studentId => {
                              const studentVotes = poll.questions.flatMap(q => q.votes.filter(v => v.student.id === studentId));
                              const studentData = studentVotes[0].student;
                              const userData = studentVotes[0].user;
                              const isProcessing = processingId === `${poll.id}-${studentId}`;

                              return (
                                <div key={studentId as string} className="p-3 px-4 text-xs flex justify-between items-start group/vote">
                                  <div className="space-y-1 flex-1">
                                    <div>
                                      <span className="font-bold text-brand-navy block">🎓 {studentData.firstName} {studentData.lastName}</span>
                                      <span className="text-gray-400 text-[10px]">Respuestas de: {userData.name || userData.email}</span>
                                    </div>
                                    <div className="bg-white border border-gray-100 p-2 rounded-lg space-y-1 inline-block mt-1">
                                      {studentVotes.map(v => (
                                        <div key={v.id} className="flex items-start gap-1">
                                          <span className="text-brand-accent font-bold">[{v.quantity}]</span>
                                          <span className="font-medium text-gray-700">{v.pollOption.text}</span>
                                          {v.customText && <span className="text-gray-500 italic ml-1">&quot;{v.customText}&quot;</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <button onClick={() => triggerAnnulVote(poll.id, studentData.id, `${studentData.firstName}`)} disabled={isProcessing} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-all cursor-pointer opacity-100 lg:opacity-0 group-hover/vote:opacity-100 shrink-0 ml-2" title="Anular voto">
                                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* 2. SECCIÓN DE ALUMNOS PENDIENTES */}
                        <div className="bg-amber-50/60 px-4 py-2.5 border-y border-amber-100 font-bold text-xs text-amber-700 uppercase tracking-wide">
                          Faltan por responder ({missingStudents.length})
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y divide-gray-50 bg-white">
                          {missingStudents.length === 0 ? (
                            <div className="p-4 text-xs text-emerald-600 font-medium text-center italic">
                              ¡Todos los alumnos han respondido! 🎉
                            </div>
                          ) : (
                            missingStudents.map(student => (
                              <div key={student.id} className="p-3 px-4 text-xs flex items-center gap-2 text-gray-600">
                                <Clock3 size={14} className="text-amber-400" />
                                🎓 <span className="font-medium">{student.firstName} {student.lastName}</span>
                              </div>
                            ))
                          )}
                        </div>

                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isPending={processingId !== null} />
    </div>
  );
}