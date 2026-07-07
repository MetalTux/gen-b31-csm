// src/app/admin/configuracion/AdminConfigClient.tsx
"use client";

import { useState } from "react";
import { createSchoolYear, updateSchoolYear, setActiveSchoolYear } from "@/app/actions/schoolYear";
import { 
  Loader2, 
  Settings, 
  Calendar, 
  Layers, 
  DollarSign, 
  User, 
  CheckCircle2, 
  PlusCircle, 
  Edit2, // <-- Importamos el ícono de edición
  X
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

interface SchoolYear {
  id: string;
  year: number;
  className: string;
  isActive: boolean;
  initialBalance: number;
  quotaAmount: number;
  totalQuotas: number;
  teacherName: string | null;
}

interface AdminConfigClientProps {
  schoolYears: SchoolYear[];
}

export default function AdminConfigClient({ schoolYears }: AdminConfigClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // NUEVO: Estado para saber si estamos editando un año existente
  const [editingId, setEditingId] = useState<string | null>(null);

  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [className, setClassName] = useState("");
  const [quotaAmount, setQuotaAmount] = useState("");
  const [totalQuotas, setTotalQuotas] = useState("10");
  const [initialBalance, setInitialBalance] = useState("0");
  const [teacherName, setTeacherName] = useState("");

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ isOpen: false, type: "success", title: "", message: "" });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => Promise<void>; }>({ isOpen: false, title: "", message: "", onConfirm: async () => {} });

  // Función para resetear el formulario a su estado de "Creación"
  const resetForm = () => {
    setEditingId(null);
    setYear(new Date().getFullYear().toString());
    setClassName("");
    setQuotaAmount("");
    setTotalQuotas("10");
    setInitialBalance("0");
    setTeacherName("");
  };

  // Función para cargar los datos en el formulario cuando le dan a "Editar"
  const startEditing = (targetYear: SchoolYear) => {
    setEditingId(targetYear.id);
    setYear(targetYear.year.toString());
    setClassName(targetYear.className);
    setQuotaAmount(targetYear.quotaAmount.toString());
    setTotalQuotas(targetYear.totalQuotas.toString());
    setInitialBalance(targetYear.initialBalance.toString());
    setTeacherName(targetYear.teacherName || "");
    
    // Hacemos scroll suave hacia el inicio (útil en móviles)
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // --- ACCIÓN: GUARDAR (Crear o Actualizar) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!year || !className || !quotaAmount || !totalQuotas || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        // MODO EDICIÓN
        await updateSchoolYear({
          id: editingId,
          year: parseInt(year),
          className,
          quotaAmount: parseFloat(quotaAmount),
          totalQuotas: parseInt(totalQuotas),
          initialBalance: parseFloat(initialBalance || "0"),
          teacherName
        });
        setAlertConfig({ isOpen: true, type: "success", title: "Cambios Guardados", message: "La configuración del periodo se ha actualizado con éxito." });
      } else {
        // MODO CREACIÓN
        await createSchoolYear({
          year: parseInt(year),
          className,
          quotaAmount: parseFloat(quotaAmount),
          totalQuotas: parseInt(totalQuotas),
          initialBalance: parseFloat(initialBalance || "0"),
          teacherName
        });
        setAlertConfig({ isOpen: true, type: "success", title: "Año Escolar Creado", message: "El periodo ha sido registrado y está listo para ser activado." });
      }
      
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al registrar el periodo.";
      setAlertConfig({ isOpen: true, type: "error", title: "Error de Guardado", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerActivation = (targetYear: SchoolYear) => {
    if (targetYear.isActive) return;

    setConfirmConfig({
      isOpen: true,
      title: `¿Activar Año Escolar ${targetYear.year}?`,
      message: `⚠️ ¡Atención! Activar este periodo apagará automáticamente cualquier otro año activo. Todos los portales de los apoderados y de tesorería mutarán para desplegar los cobros de la clase "${targetYear.className}". ¿Confirmas el cambio de switch maestro?`,
      onConfirm: async () => {
        setProcessingId(targetYear.id);
        try {
          await setActiveSchoolYear(targetYear.id);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al alternar periodos.";
          setAlertConfig({ isOpen: true, type: "error", title: "Error Crítico", message: errorMessage });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* --- COLUMNA IZQUIERDA: FORMULARIO (CREAR/EDITAR) --- */}
      <form onSubmit={handleSubmit} className={`lg:col-span-1 p-6 rounded-2xl border shadow-sm space-y-4 h-fit sticky top-6 transition-all ${editingId ? "bg-blue-50/50 border-blue-200" : "bg-white border-gray-100"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-bold flex items-center gap-2 ${editingId ? "text-blue-700" : "text-brand-navy"}`}>
              {editingId ? <Edit2 size={20} className="text-blue-500" /> : <Settings size={20} className="text-brand-accent animate-spin-slow" />}
              {editingId ? "Editar Configuración" : "Abrir Ciclo Académico"}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {editingId ? "Modifica los parámetros de este periodo." : "Inicializa los parámetros obligatorios del curso."}
            </p>
          </div>
          {editingId && (
            <button type="button" onClick={resetForm} className="p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-full border border-gray-200 shadow-sm transition-all" title="Cancelar Edición">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Año Cale. (Ej: 2026)</label>
              <input type="number" value={year} onChange={e => setYear(e.target.value)} required min="2020" max="2100" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 font-bold bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">ID Curso</label>
              <input type="text" value={className} onChange={e => setClassName(e.target.value)} placeholder="Ej: 1° Medio B" required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Monto Cuota ($)</label>
              <input type="number" value={quotaAmount} onChange={e => setQuotaAmount(e.target.value)} placeholder="Ej: 4000" required min="0" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cuotas Totales</label>
              <select value={totalQuotas} onChange={e => setTotalQuotas(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white cursor-pointer">
                <option value="10">10 Meses (Mar-Dic)</option>
                <option value="11">11 Meses (Ene-Dic ex. Feb)</option>
                <option value="12">12 Meses (Año Comp.)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Saldo Caja Anterior ($)</label>
            <input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} placeholder="Ej: 35000" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Profesor(a) Jefe (Opcional)</label>
            <input type="text" value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="Ej: Carolina Constanzo" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white" />
          </div>
        </div>

        <button
          type="submit" disabled={isSubmitting}
          className={`w-full py-2.5 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex justify-center items-center gap-2 pt-3 disabled:bg-gray-100 disabled:text-gray-400 ${
            editingId ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20" : "bg-brand-navy text-white hover:bg-opacity-95"
          }`}
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (editingId ? <Edit2 size={16} /> : <PlusCircle size={16} />)}
          {isSubmitting ? "Guardando..." : (editingId ? "Actualizar Periodo" : "Registrar Nuevo Periodo")}
        </button>
      </form>

      {/* --- COLUMNA DERECHA: HISTORIAL Y ACTIVACIÓN --- */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-fit">
        <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-sm text-brand-navy flex items-center gap-2">
          <Layers size={18} className="text-brand-accent" />
          Líneas de Tiempo e Historial de Años Escolares
        </div>

        <div className="p-6 space-y-4">
          {schoolYears.length === 0 ? (
            <div className="p-8 text-center text-gray-400 italic text-sm">No se han instanciado periodos anuales aún.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {schoolYears.map(yearObj => (
                <div 
                  key={yearObj.id} 
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between min-h-[170px] relative ${
                    yearObj.isActive 
                      ? "border-emerald-200 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-100" 
                      : editingId === yearObj.id
                      ? "border-blue-300 bg-blue-50/20 ring-1 ring-blue-200"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  {yearObj.isActive && (
                    <span className="absolute top-4 right-4 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={10}/> ACTIVO GLOBAL
                    </span>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className={yearObj.isActive ? "text-emerald-600" : "text-gray-400"} />
                      <span className="text-xl font-black text-brand-navy">Año {yearObj.year}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-500 block mt-1 uppercase tracking-wide">
                      🛑 Clase: {yearObj.className}
                    </span>

                    <div className="mt-4 space-y-1 text-xs text-gray-600 font-medium">
                      <div className="flex items-center gap-1"><DollarSign size={13} className="text-gray-400"/> Cuota Base: <strong>${yearObj.quotaAmount.toLocaleString("es-CL")} ({yearObj.totalQuotas} meses)</strong></div>
                      <div className="flex items-center gap-1"><Layers size={13} className="text-gray-400"/> Pozo Inicial: <strong className={yearObj.initialBalance >= 0 ? "text-emerald-700" : "text-red-700"}>${yearObj.initialBalance.toLocaleString("es-CL")}</strong></div>
                      {yearObj.teacherName && (
                        <div className="flex items-center gap-1"><User size={13} className="text-gray-400"/> Profesor(a): <span>{yearObj.teacherName}</span></div>
                      )}
                    </div>
                  </div>

                  {/* Acciones de Tarjeta */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => startEditing(yearObj)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} /> Editar
                    </button>

                    <button
                      onClick={() => triggerActivation(yearObj)}
                      disabled={yearObj.isActive || processingId !== null}
                      className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        yearObj.isActive 
                          ? "bg-emerald-600 text-white cursor-not-allowed" 
                          : "bg-gray-100 text-gray-700 hover:bg-brand-navy hover:text-white cursor-pointer"
                      }`}
                    >
                      {processingId === yearObj.id ? <Loader2 size={14} className="animate-spin" /> : yearObj.isActive ? "Año en Curso" : "⚡ Activar Periodo"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isPending={processingId !== null} />
    </div>
  );
}