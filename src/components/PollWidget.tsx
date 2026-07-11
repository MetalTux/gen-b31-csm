// src/components/PollWidget.tsx
"use client";

import { useState } from "react";
import { castVote } from "@/app/actions/poll";
import { 
  Loader2, HelpCircle, CheckCircle2, Clock, BarChart2, 
  ChevronDown, ChevronUp, PieChart, Pencil, X
} from "lucide-react";
import AlertModal, { AlertType } from "./AlertModal";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
}

interface PollOption {
  id: string;
  text: string;
  _count: { votes: number };
}

interface PollVote {
  studentId: string;
  pollOptionId: string; // <-- Traemos el ID de la opción que votaron
  pollOption: { text: string };
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  expiresAt: Date | string | null;
  _count: { votes: number };
  options: PollOption[];
  votes: PollVote[]; 
}

interface PollWidgetProps {
  polls: Poll[];
  students: Student[];
  userRole: string;
}

export default function PollWidget({ polls, students, userRole }: PollWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activePollId, setActivePollId] = useState<string>(polls[0]?.id || "");
  const [showResultsMap, setShowResultsMap] = useState<Record<string, boolean>>({});
  
  // --- NUEVO: Estado para saber qué votos estamos corrigiendo ---
  const [editingVote, setEditingVote] = useState<Record<string, boolean>>({});

  const [isPending, setIsPending] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ isOpen: false, type: "success", title: "", message: "" });

  if (polls.length === 0) return null;

  const handleSelect = (pollId: string, studentId: string, optionId: string) => {
    setSelections(prev => ({ ...prev, [`${pollId}_${studentId}`]: optionId }));
  };

  const enableEditMode = (pollId: string, studentId: string, currentOptionId: string) => {
    setEditingVote(prev => ({ ...prev, [`${pollId}_${studentId}`]: true }));
    handleSelect(pollId, studentId, currentOptionId);
  };

  const cancelEditMode = (pollId: string, studentId: string) => {
    setEditingVote(prev => ({ ...prev, [`${pollId}_${studentId}`]: false }));
  };

  const handleVote = async (pollId: string, studentId: string) => {
    const optionId = selections[`${pollId}_${studentId}`];
    if (!optionId) return;

    setIsPending(true);
    try {
      await castVote(pollId, optionId, studentId);
      setAlertConfig({ isOpen: true, type: "success", title: "Voto Registrado", message: "Tu respuesta ha sido guardada exitosamente." });
      
      setSelections(prev => {
        const next = { ...prev };
        delete next[`${pollId}_${studentId}`];
        return next;
      });
      
      // Salimos del modo edición si estábamos corrigiendo
      setEditingVote(prev => ({ ...prev, [`${pollId}_${studentId}`]: false }));
      setShowResultsMap(prev => ({ ...prev, [pollId]: true }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al procesar el voto.";
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: errorMessage });
    } finally {
      setIsPending(false);
    }
  };

  const toggleResults = (pollId: string) => {
    setShowResultsMap(prev => ({ ...prev, [pollId]: !prev[pollId] }));
  };

  const activePoll = polls.find(p => p.id === activePollId) || polls[0];

  return (
    <div className="mb-8 animate-fade-in">
      {/* BANNER PRINCIPAL */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 md:px-6 md:py-5 bg-gradient-to-r from-brand-navy to-blue-800 text-white shadow-md hover:shadow-lg transition-all cursor-pointer ${isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'}`}
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
            <HelpCircle size={22} className="text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-base md:text-lg leading-tight">Consultas Oficiales Activas</h3>
            <p className="text-blue-100 text-xs md:text-sm">
              Tienes {polls.length} {polls.length === 1 ? 'encuesta disponible' : 'encuestas disponibles'}
            </p>
          </div>
        </div>
        <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm transition-transform duration-300">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* CONTENIDO DESPLEGABLE */}
      {isExpanded && (
        <div className="bg-white border-x-2 border-b-2 border-blue-100 rounded-b-2xl shadow-sm overflow-hidden flex flex-col">
          
          {polls.length > 1 && (
            <div className="flex overflow-x-auto bg-gray-50 border-b border-gray-100 px-2 pt-2 scrollbar-hide">
              {polls.map((poll, index) => (
                <button
                  key={poll.id}
                  onClick={() => setActivePollId(poll.id)}
                  className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                    activePollId === poll.id 
                      ? "border-brand-navy text-brand-navy bg-white rounded-t-lg shadow-sm" 
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-t-lg"
                  }`}
                >
                  Encuesta {index + 1}
                </button>
              ))}
            </div>
          )}

          <div className="p-4 md:p-6 bg-blue-50/10">
            <div className="mb-6">
              <h4 className="text-xl font-black text-brand-navy leading-tight">{activePoll.title}</h4>
              {activePoll.description && <p className="text-sm text-gray-600 mt-2">{activePoll.description}</p>}
              {activePoll.expiresAt && (
                <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5 mt-3 bg-amber-50 w-max px-3 py-1.5 rounded-lg border border-amber-100">
                  <Clock size={14}/> Cierra el {new Date(activePoll.expiresAt).toLocaleString("es-CL", { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              )}
            </div>

            {/* Zona de Votación */}
            <div className="space-y-4">
              {students.length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-center text-gray-500 italic">
                  No tienes alumnos asignados para emitir un voto.
                </div>
              ) : (
                students.map((student) => {
                  const alreadyVoted = activePoll.votes.find(v => v.studentId === student.id);
                  const isEditing = editingVote[`${activePoll.id}_${student.id}`];
                  const selectedOption = selections[`${activePoll.id}_${student.id}`];

                  return (
                    <div key={student.id} className={`bg-white p-4 rounded-xl shadow-sm transition-all border ${isEditing ? 'border-brand-accent ring-2 ring-brand-accent/20' : 'border-blue-100'}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        
                        <div className="shrink-0">
                          <p className="text-xs font-bold text-gray-400 uppercase">Voto de:</p>
                          <p className="text-base font-black text-brand-navy flex items-center gap-1.5">
                            🎓 {student.firstName} {student.lastName}
                          </p>
                        </div>

                        {/* MUESTRA LA OPCIÓN CONFIRMADA O EL MODO DE EDICIÓN */}
                        {alreadyVoted && !isEditing ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 flex-1">
                              <CheckCircle2 size={18} />
                              <span className="text-sm font-bold truncate">Votaste: {alreadyVoted.pollOption.text}</span>
                            </div>
                            <button 
                              onClick={() => enableEditMode(activePoll.id, student.id, alreadyVoted.pollOptionId)}
                              className="text-gray-400 hover:text-brand-accent bg-gray-50 hover:bg-brand-light p-2 rounded-lg transition-colors cursor-pointer shrink-0 border border-transparent hover:border-brand-accent/30"
                              title="Modificar voto"
                            >
                              <Pencil size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 max-w-md w-full flex flex-col sm:flex-row gap-2">
                            <select
                              value={selectedOption || ""}
                              onChange={(e) => handleSelect(activePoll.id, student.id, e.target.value)}
                              disabled={isPending}
                              className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white cursor-pointer disabled:opacity-50"
                            >
                              <option value="" disabled>-- Selecciona una opción --</option>
                              {activePoll.options.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.text}</option>
                              ))}
                            </select>
                            
                            <div className="flex gap-2">
                              {alreadyVoted && (
                                <button
                                  onClick={() => cancelEditMode(activePoll.id, student.id)}
                                  disabled={isPending}
                                  className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all cursor-pointer"
                                  title="Cancelar"
                                >
                                  <X size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => handleVote(activePoll.id, student.id)}
                                disabled={!selectedOption || isPending}
                                className="px-5 py-2 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-all disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center min-w-[100px] cursor-pointer"
                              >
                                {isPending ? <Loader2 size={16} className="animate-spin" /> : alreadyVoted ? "Actualizar" : "Votar"}
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* SECCIÓN DE RESULTADOS OCULTOS POR DEFECTO */}
            {(userRole === "ADMIN" || activePoll.votes.length > 0) && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <button 
                  onClick={() => toggleResults(activePoll.id)}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <PieChart size={16} />
                  {showResultsMap[activePoll.id] ? "Ocultar Resultados" : "Ver Resultados Actuales"}
                </button>

                {showResultsMap[activePoll.id] && (
                  <div className="mt-4 bg-gray-50 p-4 md:p-5 rounded-xl border border-gray-200 animate-fade-in">
                    <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5 mb-4">
                      <BarChart2 size={14} className="text-blue-500"/> Total emitidos: {activePoll._count.votes} {activePoll._count.votes === 1 ? 'voto' : 'votos'}
                    </h4>
                    <div className="space-y-4">
                      {activePoll.options.map((opt, index) => {
                        const totalVotes = activePoll._count.votes;
                        const percentage = totalVotes === 0 ? 0 : Math.round((opt._count.votes / totalVotes) * 100);
                        const barColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"];
                        const colorClass = barColors[index % barColors.length];

                        return (
                          <div key={opt.id} className="relative">
                            <div className="flex justify-between text-xs font-bold mb-1.5 px-1">
                              <span className="text-gray-700">{opt.text}</span>
                              <span className="text-brand-navy">{opt._count.votes} ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-white rounded-full h-2.5 overflow-hidden border border-gray-200 shadow-inner">
                              <div className={`h-full rounded-full transition-all duration-1000 ${colorClass}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
}