// src/app/calendario/CalendarClient.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { EventCategory } from "@prisma/client";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin, AlignLeft, Trash2, Edit2, X, Loader2, CalendarPlus } from "lucide-react";
import { createEvent, updateEvent, deleteEvent } from "@/app/actions/event";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startDate: Date;
  endDate: Date | null;
  isAllDay: boolean;
  category: EventCategory;
  userId: string;
}

interface CalendarClientProps {
  initialEvents: CalendarEvent[];
  userRole: string;
  currentUserId: string;
}

const CATEGORY_STYLES: Record<EventCategory, { bg: string; text: string; border: string; label: string }> = {
  ACADEMICO: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Académico" },
  REUNION: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Reunión" },
  ACTIVIDAD: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Actividad" },
  FERIADO: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300", label: "Feriado" },
  OTRO: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Otro" },
};

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// --- FUNCIÓN AUXILIAR: FECHAS LOCALES SEGURAS ---
const parseLocal = (dateStr: string) => {
  if (!dateStr) return null;
  if (dateStr.includes("T")) {
    return new Date(dateStr); 
  }
  const [year, month, day] = dateStr.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0);
};

export default function CalendarClient({ initialEvents, userRole, currentUserId }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ isOpen: false, type: "success", title: "", message: "" });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => Promise<void>; }>({ isOpen: false, title: "", message: "", onConfirm: async () => {} });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");
  const [category, setCategory] = useState<EventCategory>("ACADEMICO");

  // MATEMÁTICA DEL CALENDARIO
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const daysArray = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDayIndex + 1;
    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      return new Date(currentYear, currentMonth, dayNumber);
    }
    return null;
  });

  const prevMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const formatForInput = (d: Date, allDay: boolean) => {
    const date = new Date(d);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISO = new Date(date.getTime() - tzOffset).toISOString();
    return allDay ? localISO.split("T")[0] : localISO.slice(0, 16);
  };

  const handleDayClick = (date: Date) => {
    if (userRole !== "ADMIN") return;
    
    setSelectedEvent(null);
    setTitle(""); setDescription(""); setLocation(""); setIsAllDay(true); setCategory("ACADEMICO");
    setStartDateStr(formatForInput(date, true));
    setEndDateStr("");
    setIsFormOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation(); 
    setSelectedEvent(event);
    setIsViewOpen(true);
  };

  const openEditForm = () => {
    if (!selectedEvent) return;
    setIsViewOpen(false);
    setTitle(selectedEvent.title);
    setDescription(selectedEvent.description || "");
    setLocation(selectedEvent.location || "");
    setIsAllDay(selectedEvent.isAllDay);
    setCategory(selectedEvent.category);
    
    setStartDateStr(formatForInput(selectedEvent.startDate, selectedEvent.isAllDay));
    setEndDateStr(selectedEvent.endDate ? formatForInput(selectedEvent.endDate, selectedEvent.isAllDay) : "");
    setIsFormOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startDateStr || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const finalStartDate = parseLocal(startDateStr);
      const finalEndDate = endDateStr ? parseLocal(endDateStr) : null;

      if (!finalStartDate) throw new Error("Fecha inválida");

      const dataToSave = {
        title,
        description: description || undefined,
        location: location || undefined,
        isAllDay,
        category,
        startDate: finalStartDate,
        endDate: finalEndDate,
      };

      if (selectedEvent) {
        await updateEvent(selectedEvent.id, dataToSave);
        setAlertConfig({ isOpen: true, type: "success", title: "Evento Actualizado", message: "Los cambios se guardaron correctamente." });
      } else {
        await createEvent(dataToSave);
        setAlertConfig({ isOpen: true, type: "success", title: "Evento Creado", message: "El evento ya está visible en el calendario." });
      }
      setIsFormOpen(false);
    } catch (error) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: error instanceof Error ? error.message : "Error al guardar el evento." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDelete = () => {
    if (!selectedEvent) return;
    setConfirmConfig({
      isOpen: true,
      title: "¿Eliminar Evento?",
      message: `El evento "${selectedEvent.title}" será eliminado permanentemente del calendario.`,
      onConfirm: async () => {
        try {
          await deleteEvent(selectedEvent.id);
          setIsViewOpen(false);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setAlertConfig({ isOpen: true, type: "success", title: "Eliminado", message: "Evento eliminado correctamente." });
        } catch (error) {
          setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo eliminar el evento." });
        }
      }
    });
  };

  const getEventsForDay = (date: Date) => {
    return initialEvents.filter(ev => {
      const evDate = new Date(ev.startDate);
      return evDate.getDate() === date.getDate() && 
             evDate.getMonth() === date.getMonth() && 
             evDate.getFullYear() === date.getFullYear();
    });
  };

  const handleToggleAllDay = (checked: boolean) => {
    setIsAllDay(checked);
    if (!startDateStr) return;
    
    if (checked && startDateStr.includes("T")) {
      setStartDateStr(startDateStr.split("T")[0]);
      if (endDateStr) setEndDateStr(endDateStr.split("T")[0]);
    } else if (!checked && !startDateStr.includes("T")) {
      setStartDateStr(`${startDateStr}T08:00`);
      if (endDateStr) setEndDateStr(`${endDateStr}T09:00`);
    }
  };

  // --- GENERADOR DE ENLACE DE GOOGLE CALENDAR ---
  const getGoogleCalendarUrl = (ev: CalendarEvent) => {
    const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    const titleParam = encodeURIComponent(ev.title);
    const detailsParam = encodeURIComponent(ev.description || "");
    const locationParam = encodeURIComponent(ev.location || "");

    let datesParam = "";
    if (ev.isAllDay) {
      const start = new Date(ev.startDate);
      const end = new Date(ev.startDate);
      end.setDate(end.getDate() + 1); 
      
      const startStr = start.toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 8);
      const endStr = end.toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 8);
      datesParam = `${startStr}/${endStr}`;
    } else {
      const startStr = new Date(ev.startDate).toISOString().replace(/-|:|\.\d\d\d/g, "");
      const endObj = ev.endDate ? new Date(ev.endDate) : new Date(new Date(ev.startDate).getTime() + 3600000);
      const endStr = endObj.toISOString().replace(/-|:|\.\d\d\d/g, "");
      datesParam = `${startStr}/${endStr}`;
    }

    return `${baseUrl}&text=${titleParam}&dates=${datesParam}&details=${detailsParam}&location=${locationParam}`;
  };

  // --- NUEVO: GENERADOR DE ENLACE DE OUTLOOK CALENDAR ---
  const getOutlookCalendarUrl = (ev: CalendarEvent) => {
    const baseUrl = "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent";
    const titleParam = encodeURIComponent(ev.title);
    const detailsParam = encodeURIComponent(ev.description || "");
    const locationParam = encodeURIComponent(ev.location || "");

    let startStr = "";
    let endStr = "";
    let alldayParam = "";

    if (ev.isAllDay) {
      const start = new Date(ev.startDate);
      const end = new Date(ev.startDate);
      end.setDate(end.getDate() + 1);
      
      startStr = encodeURIComponent(start.toISOString());
      endStr = encodeURIComponent(end.toISOString());
      alldayParam = "&allday=true";
    } else {
      startStr = encodeURIComponent(new Date(ev.startDate).toISOString());
      const endObj = ev.endDate ? new Date(ev.endDate) : new Date(new Date(ev.startDate).getTime() + 3600000);
      endStr = encodeURIComponent(endObj.toISOString());
      alldayParam = "&allday=false";
    }

    return `${baseUrl}&subject=${titleParam}&body=${detailsParam}&location=${locationParam}&startdt=${startStr}&enddt=${endStr}${alldayParam}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-fade-in">
      
      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <h2 className="text-xl font-bold text-brand-navy capitalize w-40">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <div className="flex bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-50 text-gray-600 transition-colors" title="Mes Anterior"><ChevronLeft size={20}/></button>
            <button onClick={goToday} className="px-4 py-2 border-x border-gray-200 text-sm font-bold text-brand-navy hover:bg-gray-50 transition-colors">Hoy</button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-50 text-gray-600 transition-colors" title="Mes Siguiente"><ChevronRight size={20}/></button>
          </div>
        </div>

        {userRole === "ADMIN" && (
          <button 
            onClick={() => handleDayClick(new Date())}
            className="w-full sm:w-auto bg-brand-navy text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-opacity-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Crear Evento
          </button>
        )}
      </div>

      {/* GRILLA DEL CALENDARIO */}
      <div className="grid grid-cols-7 bg-gray-100 gap-[1px] border-b border-gray-100">
        {DAYS_OF_WEEK.map(day => (
          <div key={day} className="bg-white py-3 text-center text-xs font-bold text-gray-500 tracking-wide uppercase">
            {day}
          </div>
        ))}

        {daysArray.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="bg-gray-50/50 min-h-[100px] md:min-h-[120px]"></div>;

          const isToday = new Date().toDateString() === date.toDateString();
          const dayEvents = getEventsForDay(date);

          return (
            <div 
              key={date.toISOString()}
              onClick={() => handleDayClick(date)}
              className={`bg-white min-h-[100px] md:min-h-[120px] p-1.5 md:p-2 flex flex-col group transition-colors ${userRole === "ADMIN" ? "cursor-pointer hover:bg-blue-50/30" : ""}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-brand-accent text-brand-navy" : "text-gray-700 group-hover:text-brand-navy"}`}>
                  {date.getDate()}
                </span>
              </div>
              
              <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar flex-1 max-h-[80px] md:max-h-[100px]">
                {dayEvents.map(ev => {
                  const style = CATEGORY_STYLES[ev.category];
                  const eventDate = new Date(ev.startDate);
                  const timeString = ev.isAllDay ? "" : eventDate.toLocaleTimeString("es-CL", { hour: '2-digit', minute: '2-digit', hour12: false });

                  return (
                    <div 
                      key={ev.id}
                      onClick={(e) => handleEventClick(e, ev)}
                      className={`text-[10px] md:text-xs px-1.5 py-1 rounded truncate border cursor-pointer hover:opacity-80 transition-opacity ${style.bg} ${style.text} ${style.border}`}
                      title={ev.title}
                    >
                      {!ev.isAllDay && <span className="font-bold mr-1">{timeString}</span>}
                      {ev.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* --- MODAL PARA VER DETALLES DEL EVENTO --- */}
      {isViewOpen && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className={`h-2 w-full ${CATEGORY_STYLES[selectedEvent.category].bg.replace('50', '500').replace('100', '400')}`} />
            
            <button onClick={() => setIsViewOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition-colors"><X size={18} /></button>
            
            <div className="p-6 space-y-4">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${CATEGORY_STYLES[selectedEvent.category].bg} ${CATEGORY_STYLES[selectedEvent.category].text} ${CATEGORY_STYLES[selectedEvent.category].border} uppercase tracking-wider`}>
                  {CATEGORY_STYLES[selectedEvent.category].label}
                </span>
                <h3 className="text-xl font-bold text-brand-navy mt-2">{selectedEvent.title}</h3>
              </div>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <CalendarIcon size={16} className="mt-0.5 text-gray-400 shrink-0"/>
                  <div>
                    <p className="font-medium">
                      {new Date(selectedEvent.startDate).toLocaleDateString("es-CL", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    {selectedEvent.endDate && (
                      <p className="text-xs text-gray-500">Hasta: {new Date(selectedEvent.endDate).toLocaleDateString("es-CL")}</p>
                    )}
                  </div>
                </div>

                {!selectedEvent.isAllDay && (
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-gray-400 shrink-0"/>
                    <p>{new Date(selectedEvent.startDate).toLocaleTimeString("es-CL", { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
                  </div>
                )}

                {selectedEvent.location && (
                  <div className="flex items-start gap-3">
                    <MapPin size={16} className="mt-0.5 text-gray-400 shrink-0"/>
                    <p>{selectedEvent.location}</p>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="flex items-start gap-3 border-t border-gray-100 pt-3">
                    <AlignLeft size={16} className="mt-0.5 text-gray-400 shrink-0"/>
                    <p className="whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                {/* BOTÓN AGREGAR A GOOGLE CALENDAR */}
                <a 
                  href={getGoogleCalendarUrl(selectedEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <CalendarPlus size={18} /> Google Calendar
                </a>

                {/* NUEVO BOTÓN: AGREGAR A OUTLOOK CALENDAR */}
                <a 
                  href={getOutlookCalendarUrl(selectedEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <CalendarPlus size={18} /> Outlook / Office 365
                </a>

                {/* Controles de Administración (Solo Directiva) */}
                {userRole === "ADMIN" && (
                  <div className="flex gap-2 pt-2">
                    <button onClick={openEditForm} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                      <Edit2 size={16} /> Editar
                    </button>
                    <button onClick={triggerDelete} className="py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-xl transition-colors flex items-center justify-center">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL PARA CREAR / EDITAR EVENTO (Solo ADMIN) --- */}
      {isFormOpen && userRole === "ADMIN" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition-colors"><X size={18} /></button>
            <h3 className="text-xl font-bold text-brand-navy mb-4 flex items-center gap-2">
              {selectedEvent ? <Edit2 size={20} className="text-blue-500"/> : <CalendarIcon size={20} className="text-brand-accent"/>}
              {selectedEvent ? "Editar Evento" : "Nuevo Evento"}
            </h3>

            <form onSubmit={handleSaveEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Título del Evento</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Ej: Prueba Coef 2 de Historia" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
                  <select value={category} onChange={e => setCategory(e.target.value as EventCategory)} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white cursor-pointer">
                    <option value="ACADEMICO">Académico</option>
                    <option value="REUNION">Reunión</option>
                    <option value="ACTIVIDAD">Actividad</option>
                    <option value="FERIADO">Feriado</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="allDay" checked={isAllDay} onChange={(e) => handleToggleAllDay(e.target.checked)} className="w-4 h-4 text-brand-accent rounded border-gray-300 focus:ring-brand-accent cursor-pointer" />
                  <label htmlFor="allDay" className="text-sm font-bold text-gray-700 cursor-pointer">Todo el día</label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Inicio</label>
                  <input type={isAllDay ? "date" : "datetime-local"} value={startDateStr} onChange={e => setStartDateStr(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Término (Opcional)</label>
                  <input type={isAllDay ? "date" : "datetime-local"} value={endDateStr} onChange={e => setEndDateStr(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5"><MapPin size={12}/> Ubicación (Opcional)</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Sala 7B" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5"><AlignLeft size={12}/> Detalles / Temario (Opcional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Escribe detalles adicionales..." className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white resize-none" />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-brand-navy text-white font-bold rounded-xl text-sm shadow-md hover:bg-opacity-95 transition-all cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 flex justify-center items-center gap-2 mt-2">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Guardar Evento"}
              </button>
            </form>
          </div>
        </div>
      )}

      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isPending={isSubmitting} />
    </div>
  );
}