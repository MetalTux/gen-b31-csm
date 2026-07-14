// src/app/admin/encuestas/AdminPollClient.tsx
"use client";

import { useState } from "react";
import { 
  createPoll, 
  togglePollStatus, 
  deletePoll, 
  updatePoll, 
  deleteVote 
} from "@/app/actions/poll";
import { 
  Loader2, HelpCircle, Plus, Trash2, Lock, Unlock, 
  Clock, Users, BarChart2, AlertCircle, X, Share2, Pencil 
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

interface PollVoteDetail {
  id: string; // <-- Ahora tenemos el ID del voto para poder anularlo
  student: { firstName: string; lastName: string };
  user: { name: string | null; email: string | null };
  pollOption: { text: string };
  createdAt: Date;
}

interface PollOption {
  id: string;
  text: string;
  _count: { votes: number };
}

interface Poll {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  expiresAt: Date | string | null;
  isActive: boolean;
  options: PollOption[];
  _count: { votes: number };
  votes: PollVoteDetail[];
}

export default function AdminPollClient({ polls }: { polls: Poll[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const [expandedPollId, setExpandedPollId] = useState<string | null>(null);

  // Estado para el acordeón móvil
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

  // Estados Formulario Crear
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [options, setOptions] = useState([{ id: 1, text: "" }, { id: 2, text: "" }]);

  // Estados Formulario Editar
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");

  // Modales
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ isOpen: false, type: "success", title: "", message: "" });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => Promise<void>; }>({ isOpen: false, title: "", message: "", onConfirm: async () => {} });

  const addOption = () => setOptions([...options, { id: Date.now(), text: "" }]);
  const updateOption = (id: number, text: string) => setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  const removeOption = (id: number) => { if (options.length > 2) setOptions(options.filter(opt => opt.id !== id)); };

  const handleShareWhatsApp = (poll: Poll) => {
    const baseText = `📢 *CONSULTA OFICIAL DEL CURSO* 📢\n\nEstimados apoderados, se ha publicado una nueva votación: *"${poll.title}"*.\n\nPor favor, ingresen al Muro de Novedades de la plataforma para registrar su opinión. Recuerden que el voto es por alumno.\n\n🔗 ${window.location.origin}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(baseText)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map(o => o.text.trim()).filter(text => text !== "");
    
    if (!title || validOptions.length < 2 || isSubmitting) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "La encuesta necesita un título y al menos 2 opciones completadas." });
      return;
    }

    setIsSubmitting(true);
    try {
      const dateParsed = expiresAt ? new Date(expiresAt) : null;
      await createPoll({ title, description, expiresAt: dateParsed, options: validOptions });
      setTitle(""); setDescription(""); setExpiresAt(""); setOptions([{ id: 1, text: "" }, { id: 2, text: "" }]);
      setAlertConfig({ isOpen: true, type: "success", title: "Encuesta Creada", message: "La consulta ya está disponible para los apoderados." });
      setIsMobileFormOpen(false); // Cerramos en móvil al terminar
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar.";
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (poll: Poll) => {
    setEditingPoll(poll);
    setEditTitle(poll.title);
    setEditDescription(poll.description || "");
    
    if (poll.expiresAt) {
      const date = new Date(poll.expiresAt);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      setEditExpiresAt(date.toISOString().slice(0, 16));
    } else {
      setEditExpiresAt("");
    }
  };

  const handleUpdatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPoll || !editTitle || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const dateParsed = editExpiresAt ? new Date(editExpiresAt) : null;
      await updatePoll(editingPoll.id, editTitle, editDescription, dateParsed);
      setEditingPoll(null);
      setAlertConfig({ isOpen: true, type: "success", title: "Datos Actualizados", message: "La encuesta ha sido modificada con éxito." });
    } catch (error) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudieron guardar los cambios." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerToggleStatus = (poll: Poll) => {
    const actionText = poll.isActive ? "Cerrar Votación" : "Reabrir Votación";
    setConfirmConfig({
      isOpen: true,
      title: `¿${actionText}?`,
      message: poll.isActive 
        ? "Los apoderados ya no podrán emitir nuevos votos en esta consulta."
        : "Se permitirá nuevamente la recepción de votos en esta consulta.",
      onConfirm: async () => {
        setProcessingId(poll.id);
        try {
          await togglePollStatus(poll.id, !poll.isActive);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch {
          setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo cambiar el estado." });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const triggerDelete = (pollId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "¿Eliminar Encuesta?",
      message: "Esta acción es irreversible y borrará todo el historial de votos. ¿Estás seguro?",
      onConfirm: async () => {
        setProcessingId(pollId);
        try {
          await deletePoll(pollId);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch {
          setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo eliminar." });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const triggerAnnulVote = (voteId: string, studentName: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Anular Voto de Apoderado",
      message: `¿Estás seguro de anular el voto asociado al alumno ${studentName}? Al confirmar, el apoderado podrá volver a votar en su panel.`,
      onConfirm: async () => {
        setProcessingId(voteId);
        try {
          await deleteVote(voteId);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch {
          setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo anular el voto." });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      
      {/* --- COLUMNA IZQUIERDA: CREAR ENCUESTA --- */}
      <div className="lg:col-span-1 h-fit lg:sticky lg:top-6 flex flex-col gap-4">
        
        <button 
          type="button"
          onClick={() => setIsMobileFormOpen(!isMobileFormOpen)}
          className="flex lg:hidden! w-full bg-brand-navy text-white py-3 rounded-xl font-bold items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          {isMobileFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isMobileFormOpen ? "Ocultar Formulario" : "Publicar Nueva Encuesta"}
        </button>

        <form onSubmit={handleCreatePoll} className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 transition-all lg:block! ${isMobileFormOpen ? 'block' : 'hidden'}`}>
          <div>
            <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
              <HelpCircle size={20} className="text-brand-accent" /> Nueva Consulta
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Diseña una encuesta vinculante para el curso.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pregunta o Título</label>
              <input
                type="text" value={title} onChange={e => setTitle(e.target.value)} required
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Descripción (Opcional)</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Clock size={13} className="text-brand-accent"/> Vencimiento (Opcional)
              </label>
              <input
                type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white cursor-pointer"
              />
            </div>

            <div className="space-y-2 border-t border-gray-50 pt-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">Alternativas de Voto</label>
              {options.map((opt, index) => (
                <div key={opt.id} className="flex gap-2">
                  <input
                    type="text" value={opt.text} onChange={e => updateOption(opt.id, e.target.value)} required
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700"
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => removeOption(opt.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-xl transition-colors cursor-pointer">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addOption} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2 p-1 cursor-pointer">
                <Plus size={14} /> Añadir otra opción
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={isSubmitting}
            className="w-full py-2.5 bg-brand-navy text-white font-bold rounded-xl text-xs shadow-md hover:bg-opacity-95 transition-all cursor-pointer disabled:bg-gray-100 flex justify-center items-center gap-2 mt-4"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Publicar Encuesta"}
          </button>
        </form>
      </div>

      {/* --- COLUMNA DERECHA: HISTORIAL DE ENCUESTAS --- */}
      <div className="lg:col-span-2 space-y-6">
        {polls.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 italic text-sm flex flex-col items-center">
            <BarChart2 size={32} className="mb-3 text-gray-300" /> No hay encuestas publicadas actualmente.
          </div>
        ) : (
          polls.map(poll => {
            const totalVotes = poll._count.votes;
            const isExpired = poll.expiresAt && new Date() > new Date(poll.expiresAt);
            const effectivelyActive = poll.isActive && !isExpired;

            return (
              <div key={poll.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in transition-all">
                
                <div className={`p-5 border-b border-gray-100 flex items-start justify-between gap-4 ${effectivelyActive ? 'bg-white' : 'bg-gray-50'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {effectivelyActive 
                        ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1"><Unlock size={10}/> Abierta</span>
                        : <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 flex items-center gap-1"><Lock size={10}/> Cerrada</span>
                      }
                      <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                        <Users size={10}/> {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-brand-navy">{poll.title}</h3>
                      <button onClick={() => openEditModal(poll)} className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors cursor-pointer" title="Corregir textos">
                        <Pencil size={14} />
                      </button>
                    </div>

                    {poll.description && <p className="text-sm text-gray-600 mt-1">{poll.description}</p>}
                    
                    {poll.expiresAt && (
                      <p className={`text-xs mt-2 font-medium flex items-center gap-1 ${isExpired ? 'text-red-500' : 'text-amber-600'}`}>
                        {isExpired ? <AlertCircle size={12}/> : <Clock size={12}/>}
                        {isExpired ? 'Vencida el' : 'Vence el'} {new Date(poll.expiresAt).toLocaleString("es-CL", { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {effectivelyActive && (
                      <button onClick={() => handleShareWhatsApp(poll)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer" title="Difundir en WhatsApp">
                        <Share2 size={16} />
                      </button>
                    )}
                    <button onClick={() => triggerToggleStatus(poll)} disabled={processingId === poll.id} className="p-2 text-gray-400 hover:text-brand-navy hover:bg-gray-100 rounded-xl transition-colors cursor-pointer" title={effectivelyActive ? "Cerrar Encuesta" : "Reabrir Encuesta"}>
                      {processingId === poll.id ? <Loader2 size={16} className="animate-spin" /> : effectivelyActive ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <button onClick={() => triggerDelete(poll.id)} disabled={processingId === poll.id} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer" title="Eliminar Encuesta">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {poll.options.map((opt, index) => {
                    const percentage = totalVotes === 0 ? 0 : Math.round((opt._count.votes / totalVotes) * 100);
                    const barColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"];
                    const colorClass = barColors[index % barColors.length];

                    return (
                      <div key={opt.id} className="relative">
                        <div className="flex justify-between text-xs font-bold mb-1.5 px-1">
                          <span className="text-gray-700">{opt.text}</span>
                          <span className="text-brand-navy">{opt._count.votes} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className={`h-2.5 rounded-full transition-all duration-1000 ${colorClass}`} style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}

                  {totalVotes > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button 
                        onClick={() => setExpandedPollId(expandedPollId === poll.id ? null : poll.id)}
                        className="text-xs font-bold text-blue-600 hover:underline w-full text-center py-1 cursor-pointer"
                      >
                        {expandedPollId === poll.id ? "Ocultar detalle de votos" : "Ver detalle de quién votó"}
                      </button>
                      
                      {expandedPollId === poll.id && (
                        <div className="mt-3 max-h-48 overflow-y-auto bg-gray-50 rounded-xl border border-gray-100 p-2 divide-y divide-gray-200">
                          {poll.votes.map((v) => (
                            <div key={v.id} className="py-2 px-2 text-xs flex justify-between items-center group/vote">
                              <div>
                                <span className="font-bold text-brand-navy block">{v.student.firstName} {v.student.lastName}</span>
                                <span className="text-gray-400 text-[10px]">Por: {v.user.name || v.user.email}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">{v.pollOption.text}</span>
                                
                                <button
                                  onClick={() => triggerAnnulVote(v.id, `${v.student.firstName} ${v.student.lastName}`)}
                                  disabled={processingId !== null}
                                  className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all cursor-pointer opacity-100 lg:opacity-0 group-hover/vote:opacity-100"
                                  title="Anular voto del apoderado"
                                >
                                  {processingId === v.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              </div>
                            </div>
                          ))}
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

      {/* --- MODAL DE EDICIÓN FLOTANTE --- */}
      {editingPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setEditingPoll(null)}
              className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            
            <div className="text-center mb-6">
              <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Pencil size={20} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-black text-brand-navy">Editar Encuesta</h3>
              <p className="text-sm text-gray-500 mt-1">Corrige los textos de la consulta activa.</p>
            </div>

            <form onSubmit={handleUpdatePoll} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Título</label>
                <input
                  type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} required
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Descripción</label>
                <textarea
                  value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vencimiento</label>
                <input
                  type="datetime-local" value={editExpiresAt} onChange={e => setEditExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 cursor-pointer bg-white"
                />
              </div>
              
              <button
                type="submit" disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-blue-700 transition-all cursor-pointer disabled:bg-gray-100 flex justify-center items-center mt-4"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Guardar Cambios"}
              </button>
            </form>
          </div>
        </div>
      )}

      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isPending={processingId !== null} />
    </div>
  );
}