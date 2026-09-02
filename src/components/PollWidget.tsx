// src/components/PollWidget.tsx
"use client";

import { useState } from "react";
import { submitPollForm } from "@/app/actions/poll";
import { QuestionType } from "@prisma/client";
import { 
  Loader2, HelpCircle, CheckCircle2, Clock, 
  ChevronDown, ChevronUp, Pencil, X, Plus, Minus, Type
} from "lucide-react";
import AlertModal, { AlertType } from "./AlertModal";

// --- INTERFACES ---
interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

interface PollOption {
  id: string;
  text: string;
  isCustomText: boolean;
}

interface PollVote {
  id: string;
  studentId: string;
  questionId: string;
  pollOptionId: string;
  quantity: number;
  customText: string | null;
  pollOption: { text: string };
}

interface PollQuestion {
  id: string;
  title: string;
  type: QuestionType;
  maxSelections: number | null;
  maxTotalQuantity: number | null;
  options: PollOption[];
  votes: PollVote[];
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  expiresAt: Date | string | null;
  questions: PollQuestion[];
}

interface PollWidgetProps {
  polls: Poll[];
  students: Student[];
  userRole: string;
}

// Estructura de nuestro borrador local antes de enviar a BD
interface DraftVote {
  questionId: string;
  pollOptionId: string;
  quantity: number;
  customText: string;
}

export default function PollWidget({ polls, students, userRole }: PollWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePollId, setActivePollId] = useState<string>(polls[0]?.id || "");
  const [isPending, setIsPending] = useState(false);
  
  // Estado para saber qué formulario estamos editando (pollId_studentId)
  const [editingMode, setEditingMode] = useState<Record<string, boolean>>({});
  
  // Estado que almacena las selecciones temporales del apoderado
  const [drafts, setDrafts] = useState<Record<string, DraftVote[]>>({});

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ isOpen: false, type: "success", title: "", message: "" });

  if (polls.length === 0) return null;

  const activePoll = polls.find(p => p.id === activePollId) || polls[0];

  // --- LÓGICA DE INTERACCIÓN DEL FORMULARIO ---

  const getStudentDrafts = (studentId: string) => drafts[`${activePoll.id}_${studentId}`] || [];

  const updateDraft = (studentId: string, newDrafts: DraftVote[]) => {
    setDrafts(prev => ({ ...prev, [`${activePoll.id}_${studentId}`]: newDrafts }));
  };

  const handleSingleChoice = (studentId: string, qId: string, optId: string) => {
    const current = getStudentDrafts(studentId).filter(d => d.questionId !== qId);
    updateDraft(studentId, [...current, { questionId: qId, pollOptionId: optId, quantity: 1, customText: "" }]);
  };

  const handleMultipleChoice = (studentId: string, qId: string, optId: string, maxSelections: number | null) => {
    const allDrafts = getStudentDrafts(studentId);
    const questionDrafts = allDrafts.filter(d => d.questionId === qId);
    const otherDrafts = allDrafts.filter(d => d.questionId !== qId);

    const exists = questionDrafts.find(d => d.pollOptionId === optId);
    
    if (exists) {
      // Si ya está, lo quitamos (Toggle)
      updateDraft(studentId, [...otherDrafts, ...questionDrafts.filter(d => d.pollOptionId !== optId)]);
    } else {
      // Validamos el máximo
      if (maxSelections && questionDrafts.length >= maxSelections) return; // Llegó al límite
      updateDraft(studentId, [...otherDrafts, ...questionDrafts, { questionId: qId, pollOptionId: optId, quantity: 1, customText: "" }]);
    }
  };

  const handleQuantity = (studentId: string, qId: string, optId: string, delta: number, maxTotal: number | null) => {
    const allDrafts = getStudentDrafts(studentId);
    const questionDrafts = allDrafts.filter(d => d.questionId === qId);
    const otherDrafts = allDrafts.filter(d => d.questionId !== qId);

    const existingIndex = questionDrafts.findIndex(d => d.pollOptionId === optId);
    const currentTotal = questionDrafts.reduce((acc, curr) => acc + curr.quantity, 0);

    if (delta > 0 && maxTotal && currentTotal >= maxTotal) return; // Llegó al tope total de la pregunta

    if (existingIndex >= 0) {
      const newQty = questionDrafts[existingIndex].quantity + delta;
      if (newQty <= 0) {
        questionDrafts.splice(existingIndex, 1); // Lo borramos si llega a 0
      } else {
        questionDrafts[existingIndex].quantity = newQty;
      }
    } else if (delta > 0) {
      questionDrafts.push({ questionId: qId, pollOptionId: optId, quantity: 1, customText: "" });
    }

    updateDraft(studentId, [...otherDrafts, ...questionDrafts]);
  };

  const handleCustomText = (studentId: string, qId: string, optId: string, text: string) => {
    const allDrafts = getStudentDrafts(studentId);
    const existingIndex = allDrafts.findIndex(d => d.questionId === qId && d.pollOptionId === optId);
    if (existingIndex >= 0) {
      const newDrafts = [...allDrafts];
      newDrafts[existingIndex].customText = text;
      updateDraft(studentId, newDrafts);
    }
  };

  // --- CONTROLES DE MODO EDICIÓN Y ENVÍO ---

  const enableEditMode = (studentId: string) => {
    // Cargamos los votos previos del alumno al borrador
    const existingVotes: DraftVote[] = [];
    activePoll.questions.forEach(q => {
      q.votes.forEach(v => {
        if (v.studentId === studentId) {
          existingVotes.push({
            questionId: q.id,
            pollOptionId: v.pollOptionId,
            quantity: v.quantity,
            customText: v.customText || ""
          });
        }
      });
    });

    updateDraft(studentId, existingVotes);
    setEditingMode(prev => ({ ...prev, [`${activePoll.id}_${studentId}`]: true }));
  };

  const cancelEditMode = (studentId: string) => {
    setEditingMode(prev => ({ ...prev, [`${activePoll.id}_${studentId}`]: false }));
    updateDraft(studentId, []); // Limpiamos el borrador
  };

  const handleSubmit = async (studentId: string) => {
    const finalVotes = getStudentDrafts(studentId);
    if (finalVotes.length === 0) {
      setAlertConfig({ isOpen: true, type: "error", title: "Formulario Vacío", message: "Debes seleccionar al menos una opción para enviar el formulario." });
      return;
    }

    setIsPending(true);
    try {
      await submitPollForm(activePoll.id, studentId, finalVotes);
      setAlertConfig({ isOpen: true, type: "success", title: "Respuestas Guardadas", message: "Tu formulario ha sido recibido correctamente." });
      
      cancelEditMode(studentId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al procesar el formulario.";
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: errorMessage });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="mb-8 animate-fade-in">
      {/* BANNER PRINCIPAL DESPLEGABLE */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 md:px-6 md:py-5 bg-gradient-to-r from-brand-navy to-blue-800 text-white shadow-md hover:shadow-lg transition-all cursor-pointer ${isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'}`}
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm"><HelpCircle size={22} className="text-white" /></div>
          <div className="text-left">
            <h3 className="font-bold text-base md:text-lg leading-tight">Formularios y Consultas</h3>
            <p className="text-blue-100 text-xs md:text-sm">Tienes {polls.length} {polls.length === 1 ? 'disponible' : 'disponibles'}</p>
          </div>
        </div>
        <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm transition-transform duration-300">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* CONTENIDO DESPLEGABLE */}
      {isExpanded && (
        <div className="bg-white border-x-2 border-b-2 border-blue-100 rounded-b-2xl shadow-sm overflow-hidden flex flex-col">
          
          {/* PESTAÑAS (Si hay más de 1 encuesta) */}
          {polls.length > 1 && (
            <div className="flex overflow-x-auto bg-gray-50 border-b border-gray-100 px-2 pt-2 custom-scrollbar">
              {polls.map((poll, index) => (
                <button key={poll.id} onClick={() => {setActivePollId(poll.id); setDrafts({}); setEditingMode({});}} className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${activePollId === poll.id ? "border-brand-navy text-brand-navy bg-white rounded-t-lg shadow-sm" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-t-lg"}`}>
                  Formulario {index + 1}
                </button>
              ))}
            </div>
          )}

          <div className="p-4 md:p-6 bg-blue-50/10">
            {/* CABECERA DEL FORMULARIO */}
            <div className="mb-6">
              <h4 className="text-xl font-black text-brand-navy leading-tight">{activePoll.title}</h4>
              {activePoll.description && <p className="text-sm text-gray-600 mt-2">{activePoll.description}</p>}
              {activePoll.expiresAt && (
                <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5 mt-3 bg-amber-50 w-max px-3 py-1.5 rounded-lg border border-amber-100">
                  <Clock size={14}/> Cierra el {new Date(activePoll.expiresAt).toLocaleString("es-CL", { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              )}
            </div>

            {/* ZONA DE ESTUDIANTES */}
            <div className="space-y-6">
              {students.length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-center text-gray-500 italic">
                  No tienes alumnos asignados para completar este formulario.
                </div>
              ) : (
                students.map((student) => {
                  // Buscamos si el alumno tiene algún voto en cualquier pregunta de este formulario
                  const studentExistingVotes = activePoll.questions.flatMap(q => q.votes.filter(v => v.studentId === student.id));
                  const hasVoted = studentExistingVotes.length > 0;
                  const isEditing = editingMode[`${activePoll.id}_${student.id}`];

                  return (
                    <div key={student.id} className={`bg-white p-4 md:p-6 rounded-xl shadow-sm transition-all border ${isEditing ? 'border-brand-accent ring-2 ring-brand-accent/20' : 'border-blue-100'}`}>
                      
                      {/* Cabecera del Alumno */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-gray-100">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">Respuestas para:</p>
                          <p className="text-lg font-black text-brand-navy flex items-center gap-1.5">🎓 {student.firstName} {student.lastName}</p>
                        </div>

                        {hasVoted && !isEditing && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200">
                              <CheckCircle2 size={18} />
                              <span className="text-sm font-bold">Formulario Enviado</span>
                            </div>
                            <button onClick={() => enableEditMode(student.id)} className="text-gray-400 hover:text-brand-accent bg-gray-50 hover:bg-brand-light p-2 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-brand-accent/30" title="Corregir Respuestas">
                              <Pencil size={16} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* --- VISTA DE SOLO LECTURA (Si ya votó) --- */}
                      {hasVoted && !isEditing && (
                        <div className="space-y-4">
                          {activePoll.questions.map((q, idx) => {
                            const ans = q.votes.filter(v => v.studentId === student.id);
                            if (ans.length === 0) return null;
                            
                            return (
                              <div key={q.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 mb-2">{idx + 1}. {q.title}</p>
                                <div className="flex flex-wrap gap-2">
                                  {ans.map(v => (
                                    <div key={v.id} className="bg-white border border-gray-200 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700 flex flex-col shadow-sm">
                                      <div className="flex items-center gap-1.5">
                                        {q.type === "QUANTITY" && <span className="bg-brand-accent/20 text-brand-navy px-1.5 rounded text-xs">x{v.quantity}</span>}
                                        {v.pollOption.text}
                                      </div>
                                      {v.customText && <span className="text-xs text-gray-500 italic mt-0.5">&quot;{v.customText}&quot;</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* --- FORMULARIO INTERACTIVO (Nuevo o Editando) --- */}
                      {(!hasVoted || isEditing) && (
                        <div className="space-y-6">
                          {activePoll.questions.map((q, idx) => {
                            const sDrafts = getStudentDrafts(student.id).filter(d => d.questionId === q.id);
                            const totalQty = sDrafts.reduce((acc, curr) => acc + curr.quantity, 0);

                            return (
                              <div key={q.id} className="bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                                <div className="mb-4">
                                  <h5 className="font-bold text-brand-navy flex gap-2"><span className="text-brand-accent">{idx + 1}.</span> {q.title}</h5>
                                  {q.type === "MULTIPLE_CHOICE" && q.maxSelections && <p className="text-xs text-gray-500 font-medium">Puedes elegir hasta {q.maxSelections} opciones.</p>}
                                  {q.type === "QUANTITY" && q.maxTotalQuantity && <p className="text-xs text-gray-500 font-medium">Cantidad máxima a repartir: {q.maxTotalQuantity} (Llevas: {totalQty})</p>}
                                </div>

                                <div className="space-y-2.5">
                                  {q.options.map(opt => {
                                    const draft = sDrafts.find(d => d.pollOptionId === opt.id);
                                    const isSelected = !!draft;
                                    const quantity = draft?.quantity || 0;

                                    return (
                                      <div key={opt.id} className="flex flex-col gap-2">
                                        {/* SINGLE Y MULTIPLE CHOICE */}
                                        {q.type !== "QUANTITY" && (
                                          <button 
                                            onClick={() => q.type === "SINGLE_CHOICE" ? handleSingleChoice(student.id, q.id, opt.id) : handleMultipleChoice(student.id, q.id, opt.id, q.maxSelections)}
                                            className={`flex items-center text-left gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-white border-gray-200 hover:border-blue-300'}`}
                                          >
                                            <div className={`w-4 h-4 shrink-0 flex items-center justify-center border ${q.type === "SINGLE_CHOICE" ? 'rounded-full' : 'rounded'} ${isSelected ? 'border-brand-accent bg-brand-accent text-brand-navy' : 'border-gray-300 bg-white'}`}>
                                              {isSelected && q.type === "MULTIPLE_CHOICE" && <CheckCircle2 size={12} />}
                                              {isSelected && q.type === "SINGLE_CHOICE" && <div className="w-2 h-2 rounded-full bg-brand-navy" />}
                                            </div>
                                            <span className={`text-sm font-medium ${isSelected ? 'text-brand-navy' : 'text-gray-700'}`}>{opt.text}</span>
                                          </button>
                                        )}

                                        {/* QUANTITY */}
                                        {q.type === "QUANTITY" && (
                                          <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${quantity > 0 ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-200'}`}>
                                            <span className={`text-sm font-medium ${quantity > 0 ? 'text-brand-navy' : 'text-gray-700'}`}>{opt.text}</span>
                                            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                                              <button onClick={() => handleQuantity(student.id, q.id, opt.id, -1, q.maxTotalQuantity)} className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-red-500 cursor-pointer disabled:opacity-30"><Minus size={16}/></button>
                                              <span className="w-4 text-center text-sm font-bold text-brand-navy">{quantity}</span>
                                              <button onClick={() => handleQuantity(student.id, q.id, opt.id, 1, q.maxTotalQuantity)} disabled={q.maxTotalQuantity !== null && totalQty >= q.maxTotalQuantity} className="w-7 h-7 flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-green-600 cursor-pointer disabled:opacity-30"><Plus size={16}/></button>
                                            </div>
                                          </div>
                                        )}

                                        {/* CAJA DE TEXTO "OTROS" CONDICIONAL */}
                                        {opt.isCustomText && isSelected && quantity > 0 && (
                                          <div className="pl-7 md:pl-8 pr-2 pb-2 animate-fade-in">
                                            <div className="relative">
                                              <Type size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                              <input 
                                                type="text" 
                                                placeholder="Por favor, especifique aquí..."
                                                value={draft.customText || ""}
                                                onChange={(e) => handleCustomText(student.id, q.id, opt.id, e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent shadow-inner text-gray-700"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}

                          {/* BOTONES DE ACCIÓN */}
                          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            {isEditing && (
                              <button onClick={() => cancelEditMode(student.id)} disabled={isPending} className="px-4 py-2.5 bg-gray-100 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-200 transition-all cursor-pointer">
                                Cancelar
                              </button>
                            )}
                            <button onClick={() => handleSubmit(student.id)} disabled={isPending} className="px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-md transition-all cursor-pointer flex items-center gap-2">
                              {isPending && <Loader2 size={16} className="animate-spin" />}
                              {isEditing ? "Guardar Cambios" : "Enviar Formulario"}
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
}