// src/components/UpcomingEventsWidget.tsx
"use client";

import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { EventCategory } from "@prisma/client";

interface UpcomingEvent {
  id: string;
  title: string;
  startDate: Date;
  isAllDay: boolean;
  category: EventCategory;
}

interface UpcomingEventsWidgetProps {
  events: UpcomingEvent[];
}

// Reutilizamos el mapa de colores para mantener consistencia
const CATEGORY_STYLES: Record<EventCategory, { bg: string; text: string; border: string }> = {
  ACADEMICO: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  REUNION: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  ACTIVIDAD: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  FERIADO: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
  OTRO: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

export default function UpcomingEventsWidget({ events }: UpcomingEventsWidgetProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full animate-fade-in">
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-sm text-brand-navy flex items-center gap-2">
          <Calendar size={18} className="text-brand-accent" />
          Próximos Eventos
        </h3>
        <span className="text-xs font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
          {events.length}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <Calendar size={32} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-500 font-medium">No hay eventos programados próximamente.</p>
          </div>
        ) : (
          <div className="space-y-3 flex-1">
            {events.map((ev) => {
              const style = CATEGORY_STYLES[ev.category];
              const date = new Date(ev.startDate);
              const day = date.getDate();
              const month = date.toLocaleString("es-CL", { month: "short" }).toUpperCase();
              const timeString = ev.isAllDay ? "Todo el día" : date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", hour12: false });

              return (
                <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-xl border ${style.bg} ${style.border} transition-colors hover:bg-opacity-80`}>
                  {/* Bloque de Fecha Izquierdo */}
                  <div className="flex flex-col items-center justify-center min-w-[45px] shrink-0 border-r border-gray-200/50 pr-3">
                    <span className={`text-lg font-black leading-none ${style.text}`}>{day}</span>
                    <span className={`text-[9px] font-bold tracking-wider ${style.text}`}>{month}</span>
                  </div>
                  
                  {/* Detalles del Evento */}
                  <div className="flex flex-col min-w-0">
                    <span className={`text-sm font-bold truncate ${style.text}`}>
                      {ev.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs mt-0.5 opacity-80" style={{ color: style.text.replace('text-', '') }}>
                      <Clock size={12} />
                      <span className="font-medium">{timeString}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-100 bg-gray-50 mt-auto">
        <Link 
          href="/calendario" 
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-brand-navy hover:text-brand-accent transition-colors"
        >
          Ver calendario completo <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}