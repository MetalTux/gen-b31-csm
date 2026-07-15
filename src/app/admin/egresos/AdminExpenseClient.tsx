// src/app/admin/egresos/AdminExpenseClient.tsx
"use client";

import { useState } from "react";
import { createExpense, deleteExpense } from "@/app/actions/expense";
import { 
  Loader2, 
  PlusCircle, 
  Trash2, 
  FileText, 
  Calendar,
  Receipt,
  UploadCloud,
  XCircle,
  X,
  Plus
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";
import { UploadDropzone } from "@/lib/uploadthing"; 

interface Expense {
  id: string;
  amount: number;
  date: Date;
  concept: string;
  receiptUrl: string | null;
}

interface AdminExpenseClientProps {
  expenses: Expense[];
}

export default function AdminExpenseClient({ expenses }: AdminExpenseClientProps) {
  // Estado para el acordeón móvil
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

  // Estados del Formulario
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  
  // Estados de Control
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modales compartidos
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ 
    isOpen: false, type: "success", title: "", message: "" 
  });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => Promise<void>; }>({ 
    isOpen: false, title: "", message: "", onConfirm: async () => {} 
  });

  // Matemáticas rápidas para mostrar un total de gastos
  const totalExpensesAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // --- ACCIÓN: GUARDAR GASTO ---
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept || !amount || !date || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createExpense({
        concept,
        amount: parseFloat(amount),
        date: new Date(date),
        receiptUrl
      });
      
      // Limpiamos el formulario al terminar
      setConcept("");
      setAmount("");
      setDate("");
      setReceiptUrl(null);
      setIsMobileFormOpen(false); // Cerramos el formulario en móvil
      
      setAlertConfig({ isOpen: true, type: "success", title: "Gasto Registrado", message: "El egreso ha sido descontado de la caja exitosamente." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al guardar.";
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACCIÓN: ELIMINAR GASTO ---
  const triggerDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "¿Eliminar registro de Gasto?",
      message: "Esta acción borrará el gasto del historial y el dinero volverá a figurar en la caja. ¿Confirmas la eliminación?",
      onConfirm: async () => {
        setProcessingId(id);
        try {
          await deleteExpense(id);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado al eliminar.";
          setAlertConfig({ isOpen: true, type: "error", title: "No se pudo eliminar", message: errorMessage });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* --- COLUMNA IZQUIERDA: FORMULARIO DE REGISTRO --- */}
      <div className="lg:col-span-1 h-fit lg:sticky lg:top-6 flex flex-col gap-4">
        
        {/* BOTÓN MÓVIL PARA DESPLEGAR FORMULARIO */}
        <button 
          type="button"
          onClick={() => setIsMobileFormOpen(!isMobileFormOpen)}
          className="flex lg:hidden! w-full bg-brand-navy text-white py-3 rounded-xl font-bold items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          {isMobileFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isMobileFormOpen ? "Ocultar Formulario" : "Registrar Nuevo Egreso"}
        </button>

        <form onSubmit={handleCreateExpense} className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 transition-all lg:block! ${isMobileFormOpen ? 'block' : 'hidden'}`}>
          <div>
            <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
              <Receipt size={20} className="text-red-500" />
              Registrar Nuevo Egreso
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Ingresa los detalles de la compra o pago.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Concepto / Descripción</label>
              <input
                type="text"
                value={concept}
                onChange={e => setConcept(e.target.value)}
                placeholder="Ej: Compra de cartulinas y tijeras"
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Monto ($)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Ej: 15000"
                  required
                  min="1"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-700 bg-white cursor-pointer"
                />
              </div>
            </div>

            {/* ZONA DE SUBIDA DE COMPROBANTE (OPCIONAL) */}
            <div className="space-y-1 border-t border-gray-50 pt-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center justify-between">
                Comprobante (Opcional)
                {receiptUrl && <span className="text-emerald-500 text-[10px]">¡Archivo Cargado!</span>}
              </label>
              
              {receiptUrl ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <FileText size={16} /> Boleta Adjunta
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setReceiptUrl(null)}
                    className="text-emerald-600 hover:text-red-500 transition-colors"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-2">
                  <UploadDropzone
                    endpoint="paymentReceiptUploader" // Reutilizamos el endpoint de pagos si tienes uno configurado
                    onClientUploadComplete={(res) => {
                      if (res && res[0]) {
                        setReceiptUrl(res[0].url);
                      }
                    }}
                    onUploadError={(error: Error) => {
                      setAlertConfig({ isOpen: true, type: "error", title: "Error de subida", message: error.message });
                    }}
                    appearance={{
                      button: "bg-brand-navy text-white text-xs py-1.5 px-3 rounded-lg",
                      label: "text-gray-500 text-xs",
                      allowedContent: "text-gray-400 text-[10px]"
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-red-600 text-white font-bold rounded-xl text-xs shadow-md shadow-red-600/10 hover:bg-red-700 transition-all cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
            {isSubmitting ? "Registrando..." : "Guardar Gasto en Historial"}
          </button>
        </form>
      </div>

      {/* --- COLUMNA DERECHA: HISTORIAL DE GASTOS --- */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        
        {/* KPI Miniatura de Gastos Totales */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Total Egresos Registrados</span>
            <span className="text-2xl font-black text-red-600 mt-1 block">
              ${totalExpensesAmount.toLocaleString("es-CL")}
            </span>
          </div>
          <div className="p-3 bg-red-50 text-red-500 rounded-xl">
            <Receipt size={24} />
          </div>
        </div>

        {/* Tabla de Historial */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-sm text-brand-navy">
            📜 Libro de Egresos y Compras ({expenses.length} registros)
          </div>
          
          <div className="overflow-x-auto max-h-[500px]">
            {expenses.length === 0 ? (
              <div className="p-12 text-center text-gray-400 italic text-sm">
                Aún no se han registrado gastos en este año escolar.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-gray-50 text-gray-400 font-bold border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Concepto</th>
                    <th className="p-4">Monto</th>
                    <th className="p-4">Comprobante</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-600">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-4">
                        <span className="text-xs font-semibold bg-gray-100 px-2.5 py-1 rounded-lg text-gray-600 flex items-center w-fit gap-1.5">
                          <Calendar size={12} />
                          {new Date(exp.date).toLocaleDateString("es-CL", { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-brand-navy">{exp.concept}</td>
                      <td className="p-4 font-black text-red-600">${exp.amount.toLocaleString("es-CL")}</td>
                      <td className="p-4">
                        {exp.receiptUrl ? (
                          <a 
                            href={exp.receiptUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100 transition-colors"
                          >
                            <FileText size={14} /> Boleta
                          </a>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium italic">Sin comprobante</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => triggerDelete(exp.id)}
                          disabled={processingId !== null}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer disabled:opacity-40"
                          title="Eliminar Gasto"
                        >
                          {processingId === exp.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isPending={processingId !== null} />
    </div>
  );
}