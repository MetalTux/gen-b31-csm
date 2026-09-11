// src/app/admin/ingresos/AdminRevenueClient.tsx
"use client";

import { useState } from "react";
import { 
  verifyPayment, 
  rejectPayment, 
  createPresentialPayment, 
  createExtraFee, 
  deleteExtraFee,
  deletePayment
} from "@/app/actions/payment";
import { 
  Check, 
  X, 
  Loader2, 
  FileText, 
  UserCheck, 
  PlusCircle, 
  Trash2, 
  DollarSign, 
  Calendar,
  AlertCircle,
  Minus,
  BarChart3,
  Download,
  TrendingUp,
  CreditCard,
  Wallet,
  Landmark,
  Search,
  Plus,
  Eye,
  Globe,
  Users,
  Wand2 // Ícono para el Botón Mágico
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  startQuotaNumber: number;
}

// ACTUALIZADO: Soporta isGlobal y assignedStudents
interface ExtraFee {
  id: string;
  title: string;
  amount: number;
  dueDate: Date | null;
  isGlobal: boolean;
  assignedStudents?: { id: string; firstName: string; lastName: string }[];
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface Payment {
  id: string;
  amount: number;
  date: Date;
  isVerified: boolean;
  receiptUrl: string | null;
  quotaNumber: number | null;
  studentId: string | null;
  extraFeeId: string | null;
  student: Student | null;
  user: User;
  extraFee?: ExtraFee | null;
}

interface SchoolYear {
  id: string;
  year: number;
  quotaAmount: number;
  totalQuotas: number;
  minimumBaseQuotas: number; // Requerido para el cálculo matemático
}

interface AdminRevenueClientProps {
  activeYear: SchoolYear;
  students: Student[];
  pendingPayments: Payment[];
  verifiedPayments: Payment[];
  extraFees: ExtraFee[];
}

const MONTHS_MAP: { [key: number]: string } = {
  1: "Marzo", 2: "Abril", 3: "Mayo", 4: "Junio", 5: "Julio",
  6: "Agosto", 7: "Septiembre", 8: "Octubre", 9: "Noviembre", 10: "Diciembre"
};

export default function AdminRevenueClient({
  activeYear,
  students,
  pendingPayments,
  verifiedPayments,
  extraFees
}: AdminRevenueClientProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "pending" | "cash" | "fees">("summary");

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean; type: AlertType; title: string; message: string;
  }>({ isOpen: false, type: "success", title: "", message: "" });

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => Promise<void>;
  }>({ isOpen: false, title: "", message: "", onConfirm: async () => {} });

  const [cashStudentId, setCashStudentId] = useState("");
  const [cashQuotas, setCashQuotas] = useState<number[]>([]);
  const [cashExtras, setCashExtras] = useState<string[]>([]);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<"EFECTIVO" | "TRANSFERENCIA MANUAL">("EFECTIVO");

  // NUEVOS ESTADOS PARA COBROS EXTRAS
  const [newFeeTitle, setNewFeeTitle] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [newFeeDueDate, setNewFeeDueDate] = useState("");
  const [newFeeIsGlobal, setNewFeeIsGlobal] = useState(true);
  const [newFeeSelectedStudents, setNewFeeSelectedStudents] = useState<string[]>([]);

  const [cashSearchTerm, setCashSearchTerm] = useState("");
  const [feeSearchTerm, setFeeSearchTerm] = useState("");

  let totalPresupuestadoEsperado = 0;
  students.forEach(s => {
    const mesesCorrespondientes = (activeYear.totalQuotas - s.startQuotaNumber) + 1;
    totalPresupuestadoEsperado += Math.max(0, mesesCorrespondientes * activeYear.quotaAmount);
  });

  const totalRecaudadoCuotas = verifiedPayments.filter(p => p.quotaNumber !== null).reduce((sum, p) => sum + p.amount, 0);
  const totalPorCobrarPendiente = Math.max(0, totalPresupuestadoEsperado - totalRecaudadoCuotas);
  const totalCajaBanco = verifiedPayments.filter(p => p.receiptUrl !== "EFECTIVO").reduce((sum, p) => sum + p.amount, 0);
  const totalCajaEfectivo = verifiedPayments.filter(p => p.receiptUrl === "EFECTIVO").reduce((sum, p) => sum + p.amount, 0);
  const totalGeneralEnCaja = totalCajaBanco + totalCajaEfectivo;

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const response = await fetch("/api/exportar-excel");
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_general_año_${activeYear.year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo compilar el Excel." });
    } finally { setIsExporting(false); }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try { await verifyPayment(id); setAlertConfig({ isOpen: true, type: "success", title: "Aprobado", message: "El pago ha sido verificado." }); } 
    catch { setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo aprobar." }); } 
    finally { setProcessingId(null); }
  };

  const triggerReject = (id: string) => {
    setConfirmConfig({
      isOpen: true, title: "¿Rechazar Comprobante?", message: "Se eliminará el pago. ¿Confirmas?",
      onConfirm: async () => {
        setProcessingId(id);
        try { await rejectPayment(id); setConfirmConfig(prev => ({ ...prev, isOpen: false })); } 
        catch { setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo rechazar." }); } 
        finally { setProcessingId(null); }
      }
    });
  };

  const triggerDeletePayment = (id: string) => {
    setConfirmConfig({
      isOpen: true, title: "¿Eliminar Registro?", message: "Se borrará del libro de caja. ¿Estás seguro?",
      onConfirm: async () => {
        setProcessingId(id);
        try { await deletePayment(id); setConfirmConfig(prev => ({ ...prev, isOpen: false })); } 
        catch { setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo eliminar." }); } 
        finally { setProcessingId(null); }
      }
    });
  };

  const handleRegisterCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashStudentId || (cashQuotas.length === 0 && cashExtras.length === 0) || !paymentDate || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const parsedDate = new Date(paymentDate); parsedDate.setHours(12, 0, 0, 0);
      await createPresentialPayment({ studentId: cashStudentId, selectedQuotas: cashQuotas, selectedExtraFeeIds: cashExtras, paymentDate: parsedDate, paymentMethod });
      setCashStudentId(""); setCashQuotas([]); setCashExtras([]); setPaymentDate(new Date().toISOString().split('T')[0]); setIsMobileFormOpen(false);
      setAlertConfig({ isOpen: true, type: "success", title: "Registrado", message: "Ingreso guardado exitosamente." });
    } catch (error) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: error instanceof Error ? error.message : "Error desconocido." });
    } finally { setIsSubmitting(false); }
  };

  // --- LÓGICA DEL BOTÓN MÁGICO ---
  const handleSelectMorosos = () => {
    const morososIds: string[] = [];

    students.forEach(student => {
      // Calculamos las cuotas efectivas pagadas por el alumno
      const cuotasPagadas = verifiedPayments.filter(p => p.studentId === student.id && p.quotaNumber !== null).length;
      
      // Personalizamos el mínimo por si el alumno entró tarde (ej. si mínimo es 10, pero entró el mes 5, no se le pueden exigir 10)
      const maxExigible = (activeYear.totalQuotas - student.startQuotaNumber) + 1;
      const cuotasExigidas = Math.min(activeYear.minimumBaseQuotas, maxExigible);

      if (cuotasPagadas < cuotasExigidas) {
        morososIds.push(student.id);
      }
    });

    if (morososIds.length === 0) {
      setAlertConfig({ isOpen: true, type: "success", title: "¡Excelente!", message: "Todos los alumnos han cumplido con la cuota mínima establecida." });
    } else {
      setNewFeeSelectedStudents(morososIds);
    }
  };

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeeTitle || !newFeeAmount || isSubmitting) return;
    if (!newFeeIsGlobal && newFeeSelectedStudents.length === 0) {
      return setAlertConfig({ isOpen: true, type: "error", title: "Faltan Alumnos", message: "Debes seleccionar al menos un alumno para este cobro específico." });
    }

    setIsSubmitting(true);
    try {
      const dateParsed = newFeeDueDate ? new Date(newFeeDueDate) : null;
      await createExtraFee(newFeeTitle, parseFloat(newFeeAmount), dateParsed, newFeeIsGlobal, newFeeSelectedStudents);
      setNewFeeTitle(""); setNewFeeAmount(""); setNewFeeDueDate(""); 
      setNewFeeIsGlobal(true); setNewFeeSelectedStudents([]);
      setIsMobileFormOpen(false);
      setAlertConfig({ isOpen: true, type: "success", title: "Cobro Creado", message: "El cobro se ha asignado correctamente." });
    } catch {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo crear." });
    } finally { setIsSubmitting(false); }
  };

  const triggerDeleteFee = (id: string) => {
    setConfirmConfig({
      isOpen: true, title: "¿Eliminar Cobro?", message: "Se borrará de los paneles asignados. ¿Continuar?",
      onConfirm: async () => {
        try { await deleteExtraFee(id); setConfirmConfig(prev => ({ ...prev, isOpen: false })); } 
        catch { setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "Asegúrate que no tenga pagos." }); }
      }
    });
  };

  const filteredVerifiedPayments = verifiedPayments.filter(p => {
    if (!cashSearchTerm) return true;
    const term = cashSearchTerm.toLowerCase();
    const studentName = p.student ? `${p.student.firstName} ${p.student.lastName}`.toLowerCase() : "sin asignar";
    const conceptName = p.quotaNumber ? `cuota ${MONTHS_MAP[p.quotaNumber]}`.toLowerCase() : (p.extraFee?.title?.toLowerCase() || "");
    return studentName.includes(term) || conceptName.includes(term);
  });

  const filteredExtraFees = extraFees.filter(f => {
    if (!feeSearchTerm) return true;
    return f.title.toLowerCase().includes(feeSearchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 relative">
      
      {/* --- BARRA DE PESTAÑAS (TABS) --- */}
      <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-1">
        <button onClick={() => { setActiveTab("summary"); setIsMobileFormOpen(false); }} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === "summary" ? "border-brand-navy text-brand-navy" : "border-transparent text-gray-400 hover:text-gray-600"}`}><BarChart3 size={16} /> 📊 Resumen Ejecutivo</button>
        <button onClick={() => { setActiveTab("pending"); setIsMobileFormOpen(false); }} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === "pending" ? "border-brand-navy text-brand-navy" : "border-transparent text-gray-400 hover:text-gray-600"}`}>📥 Validar Transferencias ({pendingPayments.length})</button>
        <button onClick={() => { setActiveTab("cash"); setIsMobileFormOpen(false); }} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === "cash" ? "border-brand-navy text-brand-navy" : "border-transparent text-gray-400 hover:text-gray-600"}`}>💵 Caja y Pagos Manuales</button>
        <button onClick={() => { setActiveTab("fees"); setIsMobileFormOpen(false); }} className={`px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === "fees" ? "border-brand-navy text-brand-navy" : "border-transparent text-gray-400 hover:text-gray-600"}`}>⚙️ Gestión de Cobros Extras</button>
      </div>

      {/* --- PESTAÑA 1: RESUMEN EJECUTIVO --- */}
      {activeTab === "summary" && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-end">
            <button onClick={handleExportExcel} disabled={isExporting} className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/15 hover:bg-emerald-700 transition-all disabled:bg-gray-100 disabled:text-gray-400">
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {isExporting ? "Compilando Planilla..." : "Descargar Libro de Caja (Excel)"}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center gap-4"><div className="p-3 bg-white text-emerald-600 rounded-xl shadow-sm"><TrendingUp size={24} /></div><div><span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider block">Total Recaudado</span><span className="text-2xl font-black text-emerald-900">${totalRecaudadoCuotas.toLocaleString("es-CL")}</span></div></div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex items-center gap-4"><div className="p-3 bg-white text-brand-navy rounded-xl shadow-sm"><CreditCard size={24} /></div><div><span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Meta Presupuestada</span><span className="text-2xl font-black text-brand-navy">${totalPresupuestadoEsperado.toLocaleString("es-CL")}</span></div></div>
            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center gap-4"><div className="p-3 bg-white text-red-600 rounded-xl shadow-sm"><AlertCircle size={24} /></div><div><span className="text-xs text-red-700 font-semibold uppercase tracking-wider block">Saldo Pendiente</span><span className="text-2xl font-black text-red-900">${totalPorCobrarPendiente.toLocaleString("es-CL")}</span></div></div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-xl space-y-4">
            <h3 className="text-base font-bold text-brand-navy">Fondos Disponibles por Medio de Pago</h3>
            <div className="divide-y divide-gray-50">
              <div className="flex justify-between py-3 text-sm"><span className="text-gray-500 flex items-center gap-2"><Wallet size={16} className="text-blue-500" /> Cuenta Banco</span><span className="font-bold text-gray-900">${totalCajaBanco.toLocaleString("es-CL")}</span></div>
              <div className="flex justify-between py-3 text-sm"><span className="text-gray-500 flex items-center gap-2"><DollarSign size={16} className="text-amber-500" /> Caja Física</span><span className="font-bold text-gray-900">${totalCajaEfectivo.toLocaleString("es-CL")}</span></div>
              <div className="flex justify-between pt-4 pb-1 text-base font-black border-t-2 border-gray-100"><span className="text-brand-navy">Total Neto Disponible</span><span className="text-brand-navy">${totalGeneralEnCaja.toLocaleString("es-CL")}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* --- PESTAÑA 2: VALIDAR TRANSFERENCIAS --- */}
      {activeTab === "pending" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
          {pendingPayments.length === 0 ? (
            <div className="p-12 text-center text-gray-400 italic">🎉 ¡Al día! No tienes transferencias pendientes de revisión.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead><tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100"><th className="p-4">Alumno / Apoderado</th><th className="p-4">Concepto</th><th className="p-4">Monto</th><th className="p-4">Comprobante</th><th className="p-4 text-center">Acciones</th></tr></thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {pendingPayments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="p-4"><div className="font-bold text-brand-navy">🎓 {p.student ? `${p.student.firstName} ${p.student.lastName}` : "No asignado"}</div><div className="text-xs text-gray-400 font-medium">Por: {p.user.name || p.user.email}</div></td>
                      <td className="p-4 font-semibold text-gray-600">{p.quotaNumber ? `Cuota de ${MONTHS_MAP[p.quotaNumber]}` : `🌟 ${p.extraFee?.title}`}</td>
                      <td className="p-4 font-black text-brand-navy">${p.amount.toLocaleString("es-CL")}</td>
                      <td className="p-4">{p.receiptUrl ? (<button type="button" onClick={() => setReceiptModalUrl(p.receiptUrl)} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-accent hover:underline bg-brand-accent/5 px-2.5 py-1 rounded-lg border border-brand-accent/10"><Eye size={14} /> Ver Archivo</button>) : (<span className="text-xs text-gray-400 italic">Sin archivo</span>)}</td>
                      <td className="p-4 flex items-center justify-center gap-2">
                        <button onClick={() => handleApprove(p.id)} disabled={processingId !== null} className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-sm disabled:opacity-40" title="Aprobar"><Check size={16} /></button>
                        <button onClick={() => triggerReject(p.id)} disabled={processingId !== null} className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-sm disabled:opacity-40" title="Rechazar"><X size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- PESTAÑA 3: CAJA Y PAGOS MANUALES --- */}
      {activeTab === "cash" && (() => {
        const studentPending = pendingPayments.filter(p => p.studentId === cashStudentId);
        const studentVerified = verifiedPayments.filter(p => p.studentId === cashStudentId);
        const paidQuotasForStudent = [...studentPending.filter(p => p.quotaNumber !== null).map(p => p.quotaNumber as number), ...studentVerified.filter(p => p.quotaNumber !== null).map(p => p.quotaNumber as number)];
        const paidExtrasForStudent = [...studentPending.filter(p => p.extraFeeId !== null).map(p => p.extraFeeId as string), ...studentVerified.filter(p => p.extraFeeId !== null).map(p => p.extraFeeId as string)];
        
        const selectedStudent = students.find(s => s.id === cashStudentId);
        const startQuota = selectedStudent?.startQuotaNumber || 1;

        // FILTRO UX: Mostrar solo cobros extras globales O asignados a este alumno
        const availableExtraFees = extraFees.filter(f => f.isGlobal || f.assignedStudents?.some(s => s.id === cashStudentId));

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-1 h-fit lg:sticky lg:top-6 flex flex-col gap-4">
              <button type="button" onClick={() => setIsMobileFormOpen(!isMobileFormOpen)} className="flex lg:hidden! w-full bg-brand-navy text-white py-3 rounded-xl font-bold items-center justify-center gap-2 shadow-sm"><Plus size={18} /> Ingresar Pago en Caja</button>
              
              <form onSubmit={handleRegisterCash} className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 transition-all lg:block! ${isMobileFormOpen ? 'block' : 'hidden'}`}>
                <div><h3 className="text-lg font-bold text-brand-navy flex items-center gap-2"><UserCheck size={20} className="text-brand-accent" /> Ingreso Manual</h3></div>
                
                <div className="space-y-4 border-t border-gray-50 pt-4">
                  <div className="space-y-1.5"><label className="text-xs font-bold text-gray-500 uppercase">Fecha del Pago</label><input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white" /></div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Vía</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setPaymentMethod("EFECTIVO")} className={`py-2 px-3 text-xs font-bold rounded-xl border flex justify-center gap-2 items-center ${paymentMethod === "EFECTIVO" ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-white text-gray-500"}`}><DollarSign size={14}/> Efectivo</button>
                      <button type="button" onClick={() => setPaymentMethod("TRANSFERENCIA MANUAL")} className={`py-2 px-3 text-xs font-bold rounded-xl border flex justify-center gap-2 items-center ${paymentMethod === "TRANSFERENCIA MANUAL" ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-white text-gray-500"}`}><Landmark size={14}/> Banco</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Alumno(a)</label>
                    <select value={cashStudentId} onChange={(e) => { setCashStudentId(e.target.value); setCashQuotas([]); setCashExtras([]); }} required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 bg-white">
                      <option value="">-- Seleccionar --</option>
                      {students.map(s => <option key={s.id} value={s.id}>🎓 {s.lastName}, {s.firstName}</option>)}
                    </select>
                  </div>
                </div>

                {cashStudentId && (
                  <>
                    <div className="space-y-2 border-t border-gray-50 pt-3">
                      <label className="text-xs font-bold text-gray-500 uppercase block">Cuotas a Regularizar (${activeYear.quotaAmount})</label>
                      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {Array.from({ length: activeYear.totalQuotas }).map((_, i) => {
                          const qNum = i + 1; const isChecked = cashQuotas.includes(qNum); const isAlreadyPaid = paidQuotasForStudent.includes(qNum); const isExempt = qNum < startQuota;
                          return (
                            <button key={qNum} type="button" disabled={isAlreadyPaid || isExempt} onClick={() => setCashQuotas(isChecked ? cashQuotas.filter(q => q !== qNum) : [...cashQuotas, qNum])} className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all disabled:cursor-not-allowed ${isExempt ? "bg-gray-50 text-gray-400 opacity-60" : isAlreadyPaid ? "bg-gray-50 text-emerald-600" : isChecked ? "bg-brand-navy text-white border-brand-navy" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                              <span>{MONTHS_MAP[qNum]}</span>
                              {isAlreadyPaid && !isExempt && <Check size={14} className="text-emerald-500 stroke-[3]" />}
                              {isExempt && <Minus size={14} className="text-gray-400 stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {availableExtraFees.length > 0 && (
                      <div className="space-y-2 border-t border-gray-50 pt-3">
                        <label className="text-xs font-bold text-gray-500 uppercase block">Cobros Extraordinarios</label>
                        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                          {availableExtraFees.map(f => {
                            const isChecked = cashExtras.includes(f.id); const isAlreadyPaid = paidExtrasForStudent.includes(f.id);
                            return (
                              <div key={f.id} onClick={() => !isAlreadyPaid && setCashExtras(isChecked ? cashExtras.filter(id => id !== f.id) : [...cashExtras, f.id])} className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold ${isAlreadyPaid ? "bg-gray-50 opacity-40 cursor-not-allowed" : "cursor-pointer"} ${isChecked ? "bg-brand-navy/5 border-brand-navy text-brand-navy" : "bg-white text-gray-600"}`}>
                                <div className="flex items-center gap-2"><input type="checkbox" checked={isChecked || isAlreadyPaid} disabled={isAlreadyPaid} onChange={() => {}} className="rounded text-brand-navy" /> <span className="truncate">{f.title}</span></div>
                                <span className="font-bold ml-2">${f.amount}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <button type="submit" disabled={isSubmitting || (cashQuotas.length === 0 && cashExtras.length === 0)} className="w-full py-2.5 bg-brand-accent text-brand-navy font-bold rounded-xl text-sm shadow-md disabled:bg-gray-100 disabled:text-gray-400">{isSubmitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Guardar Pago"}</button>
                  </>
                )}
              </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between gap-3"><div className="font-bold text-sm text-brand-navy flex items-center gap-2"><span>📜 Libro de Caja Principal</span></div><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Buscar..." value={cashSearchTerm} onChange={(e) => setCashSearchTerm(e.target.value)} className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white" /></div></div>
              <div className="overflow-x-auto flex-1 h-full min-h-[400px]">
                {filteredVerifiedPayments.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 italic text-sm">Libro de caja vacío.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-white text-gray-400 font-bold border-b border-gray-100 sticky top-0"><tr className="shadow-sm"><th className="p-3">Fecha</th><th className="p-3">Alumno</th><th className="p-3">Concepto</th><th className="p-3">Monto</th><th className="p-3">Vía</th><th className="p-3 text-center">Acciones</th></tr></thead>
                    <tbody className="divide-y divide-gray-50 text-gray-600">
                      {filteredVerifiedPayments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/30">
                          <td className="p-3 text-[11px] font-medium text-gray-500">{new Date(p.date).toLocaleDateString("es-CL", { timeZone: 'UTC' })}</td>
                          <td className="p-3 font-bold text-brand-navy">🎓 {p.student?.firstName} {p.student?.lastName}</td>
                          <td className="p-3 font-medium">{p.quotaNumber ? `Cuota ${MONTHS_MAP[p.quotaNumber]}` : p.extraFee?.title}</td>
                          <td className="p-3 font-black text-gray-900">${p.amount.toLocaleString("es-CL")}</td>
                          <td className="p-3">
                            {p.receiptUrl === "EFECTIVO" ? <span className="px-2 py-0.5 rounded-md font-bold text-[9px] border bg-amber-50 text-amber-700">💵 EFECTIVO</span> :
                             p.receiptUrl === "TRANSFERENCIA MANUAL" ? <span className="px-2 py-0.5 rounded-md font-bold text-[9px] border bg-emerald-50 text-emerald-700">🏦 TRANSF. (M)</span> :
                             <button type="button" onClick={() => setReceiptModalUrl(p.receiptUrl)} className="px-2 py-0.5 rounded-md font-bold text-[9px] border bg-blue-50 text-blue-700 hover:underline"><Eye size={10} className="inline"/> COMPROBANTE</button>}
                          </td>
                          <td className="p-3 flex justify-center"><button onClick={() => triggerDeletePayment(p.id)} disabled={processingId !== null} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">{processingId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- PESTAÑA 4: GESTIÓN DE COBROS EXTRAS (ACTUALIZADA) --- */}
      {activeTab === "fees" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          
          <div className="lg:col-span-1 h-fit lg:sticky lg:top-6 flex flex-col gap-4">
            <button onClick={() => setIsMobileFormOpen(!isMobileFormOpen)} className="flex lg:hidden! w-full bg-brand-navy text-white py-3 rounded-xl font-bold items-center justify-center gap-2 shadow-sm"><Plus size={18} /> Nuevo Cobro Extra</button>

            <form onSubmit={handleCreateFee} className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 transition-all lg:block! ${isMobileFormOpen ? 'block' : 'hidden'}`}>
              <div>
                <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2"><PlusCircle size={20} className="text-brand-accent" /> Nuevo Cobro</h3>
                <p className="text-xs text-gray-400 mt-0.5">Asigna cargos globales o a alumnos morosos.</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Título</label>
                <input type="text" value={newFeeTitle} onChange={e => setNewFeeTitle(e.target.value)} placeholder="Ej: Multa Atraso" required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-brand-accent bg-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Monto ($)</label><input type="number" value={newFeeAmount} onChange={e => setNewFeeAmount(e.target.value)} placeholder="Ej: 5000" required min="1" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-brand-accent bg-white" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Vencimiento</label><input type="date" value={newFeeDueDate} onChange={e => setNewFeeDueDate(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:ring-brand-accent bg-white cursor-pointer" /></div>
              </div>

              {/* TIPO DE ASIGNACIÓN */}
              <div className="space-y-2 border-t border-gray-50 pt-3">
                <label className="text-xs font-bold text-gray-500 uppercase block">Tipo de Asignación</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setNewFeeIsGlobal(true); setNewFeeSelectedStudents([]); }} className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col justify-center items-center gap-1 ${newFeeIsGlobal ? "bg-brand-navy/5 text-brand-navy border-brand-navy" : "bg-white text-gray-500"}`}><Globe size={16}/> Todo el Curso</button>
                  <button type="button" onClick={() => setNewFeeIsGlobal(false)} className={`py-2 px-3 text-xs font-bold rounded-xl border flex flex-col justify-center items-center gap-1 ${!newFeeIsGlobal ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-white text-gray-500"}`}><Users size={16}/> Específico</button>
                </div>
              </div>

              {/* SELECCIÓN DE ALUMNOS (Si es específico) */}
              {!newFeeIsGlobal && (
                <div className="space-y-2 animate-fade-in border border-amber-200 bg-amber-50/30 p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-amber-700 uppercase">Seleccionar Alumnos</label>
                    <button type="button" onClick={handleSelectMorosos} className="text-[10px] font-bold text-white bg-amber-500 hover:bg-amber-600 px-2 py-1 rounded flex items-center gap-1 transition-colors" title={`Selecciona a quienes deban menos de ${activeYear.minimumBaseQuotas} cuotas`}><Wand2 size={12}/> Auto: Morosos</button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1 bg-white border border-gray-200 rounded-lg p-2">
                    {students.map(s => (
                      <div key={s.id} onClick={() => setNewFeeSelectedStudents(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])} className="flex items-center gap-2 text-xs p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" checked={newFeeSelectedStudents.includes(s.id)} readOnly className="rounded text-brand-navy focus:ring-0" />
                        <span className="truncate">{s.lastName}, {s.firstName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-brand-navy text-white font-bold rounded-xl text-xs shadow-md hover:bg-opacity-95 disabled:bg-gray-100 disabled:text-gray-400 mt-2">
                {isSubmitting ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Publicar Cobro Extraordinario"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><h3 className="text-base font-bold text-brand-navy">Cobros Vigentes</h3><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Buscar cobro..." value={feeSearchTerm} onChange={(e) => setFeeSearchTerm(e.target.value)} className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-gray-50" /></div></div>
            <div className="p-6 space-y-3">
              {filteredExtraFees.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-4">No se han registrado cobros.</p>
              ) : (
                filteredExtraFees.map(fee => (
                  <div key={fee.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group/fee gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {fee.isGlobal ? (
                          <span className="text-[9px] font-bold text-brand-navy bg-brand-navy/10 px-2 py-0.5 rounded-md flex items-center gap-1 border border-brand-navy/20 w-fit"><Globe size={10}/> GLOBAL</span>
                        ) : (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200 w-fit"><Users size={10}/> ESPECÍFICO ({fee.assignedStudents?.length} alumnos)</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-brand-navy">{fee.title}</h4>
                      {fee.dueDate && <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1 mt-0.5"><Calendar size={12} /> Vence el {new Date(fee.dueDate).toLocaleDateString("es-CL", { timeZone: 'UTC' })}</span>}
                      
                      {!fee.isGlobal && fee.assignedStudents && fee.assignedStudents.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {fee.assignedStudents.map(s => (
                            <span key={s.id} className="text-[9px] font-semibold text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded">🎓 {s.firstName} {s.lastName.charAt(0)}.</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <span className="text-base font-black text-brand-navy">${fee.amount.toLocaleString("es-CL")}</span>
                      <button onClick={() => triggerDeleteFee(fee.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-200/50 rounded-lg lg:opacity-0 group-hover/fee:opacity-100"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SECCIÓN MODALES --- */}
      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isPending={processingId !== null} />
      {receiptModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-3xl shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between bg-gray-50"><h3 className="font-bold flex items-center gap-2"><FileText size={18} className="text-brand-accent"/> Comprobante</h3><button onClick={() => setReceiptModalUrl(null)} className="p-1.5 hover:bg-red-50 rounded-full"><X size={20} /></button></div>
            <div className="flex-1 overflow-auto bg-gray-100/50 p-2 flex items-center justify-center min-h-[50vh]"><iframe src={receiptModalUrl} className="w-full h-[60vh] rounded-xl border bg-white" /></div>
          </div>
        </div>
      )}
    </div>
  );
}