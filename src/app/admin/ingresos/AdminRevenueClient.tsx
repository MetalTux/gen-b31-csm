// src/app/admin/ingresos/AdminRevenueClient.tsx
"use client";

import { useState } from "react";
import { 
  verifyPayment, 
  rejectPayment, 
  createPresentialPayment, 
  createExtraFee, 
  deleteExtraFee 
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
  Wallet
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  startQuotaNumber: number;
}

interface ExtraFee {
  id: string;
  title: string;
  amount: number;
  dueDate: Date | null;
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
  // CAMBIO 1: La pestaña por defecto ahora es "summary" (Resumen)
  const [activeTab, setActiveTab] = useState<"summary" | "pending" | "cash" | "fees">("summary");

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // Estado para la carga de Excel

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ isOpen: false, type: "success", title: "", message: "" });

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({ isOpen: false, title: "", message: "", onConfirm: async () => {} });

  const [cashStudentId, setCashStudentId] = useState("");
  const [cashQuotas, setCashQuotas] = useState<number[]>([]);
  const [cashExtras, setCashExtras] = useState<string[]>([]);

  const [newFeeTitle, setNewFeeTitle] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [newFeeDueDate, setNewFeeDueDate] = useState("");

  // --- NUEVO: CÁLCULOS MATEMÁTICOS DEL RESUMEN EN TIEMPO REAL ---
  let totalPresupuestadoEsperado = 0;
  students.forEach(s => {
    const mesesCorrespondientes = (activeYear.totalQuotas - s.startQuotaNumber) + 1;
    totalPresupuestadoEsperado += Math.max(0, mesesCorrespondientes * activeYear.quotaAmount);
  });

  const totalRecaudadoCuotas = verifiedPayments
    .filter(p => p.quotaNumber !== null)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPorCobrarPendiente = Math.max(0, totalPresupuestadoEsperado - totalRecaudadoCuotas);

  const totalCajaBanco = verifiedPayments.filter(p => p.receiptUrl !== "EFECTIVO").reduce((sum, p) => sum + p.amount, 0);
  const totalCajaEfectivo = verifiedPayments.filter(p => p.receiptUrl === "EFECTIVO").reduce((sum, p) => sum + p.amount, 0);
  const totalGeneralEnCaja = totalCajaBanco + totalCajaEfectivo;

  // --- NUEVO: GATILLADOR DE DESCARGA DE EXCEL BANCARIO ---
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
      setAlertConfig({
        isOpen: true,
        type: "error",
        title: "Error de Exportación",
        message: "No se pudo compilar el archivo Excel. Por favor, vuelve a intentarlo."
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await verifyPayment(id);
      setAlertConfig({ isOpen: true, type: "success", title: "Pago Verificado", message: "El pago ha sido aprobado con éxito." });
    } catch {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo aprobar el pago." });
    } finally {
      setProcessingId(null);
    }
  };

  const triggerReject = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "¿Rechazar Comprobante?",
      message: "Esta acción eliminará la declaración del pago. ¿Confirmas el rechazo?",
      onConfirm: async () => {
        setProcessingId(id);
        try {
          await rejectPayment(id);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch {
          setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo rechazar." });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const handleRegisterCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashStudentId || (cashQuotas.length === 0 && cashExtras.length === 0) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createPresentialPayment({
        studentId: cashStudentId,
        selectedQuotas: cashQuotas,
        selectedExtraFeeIds: cashExtras
      });
      setCashStudentId(""); setCashQuotas([]); setCashExtras([]);
      setAlertConfig({ isOpen: true, type: "success", title: "Pago en Efectivo Guardado", message: "Ingreso registrado con éxito." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al guardar.";
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeeTitle || !newFeeAmount || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const dateParsed = newFeeDueDate ? new Date(newFeeDueDate) : null;
      await createExtraFee(newFeeTitle, parseFloat(newFeeAmount), dateParsed);
      setNewFeeTitle(""); setNewFeeAmount(""); setNewFeeDueDate("");
      setAlertConfig({ isOpen: true, type: "success", title: "Cobro Creado", message: "Habilitado en el panel de todos los apoderados." });
    } catch {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: "No se pudo crear." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDeleteFee = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "¿Eliminar Cobro Extraordinario?",
      message: "⚠️ ¡Atención! Si eliminas este cobro, se borrará de los paneles de todos los apoderados. Solo procede si no hay pagos asociados.",
      onConfirm: async () => {
        try {
          await deleteExtraFee(id);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Ocurrió un error inesperado al eliminar.";
          setAlertConfig({ isOpen: true, type: "error", title: "No se pudo eliminar", message: errorMessage });
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* --- BARRA DE PESTAÑAS (TABS) --- */}
      <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === "summary" ? "border-brand-navy text-brand-navy" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <BarChart3 size={16} /> 📊 Resumen Ejecutivo
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "pending" ? "border-brand-navy text-brand-navy" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          📥 Validar Transferencias ({pendingPayments.length})
        </button>
        <button
          onClick={() => setActiveTab("cash")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "cash" ? "border-brand-navy text-brand-navy" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          💵 Caja y Efectivo
        </button>
        <button
          onClick={() => setActiveTab("fees")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "fees" ? "border-brand-navy text-brand-navy" : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          ⚙️ Gestión de Cobros Extras
        </button>
      </div>

      {/* --- NUEVA PESTAÑA: RESUMEN EJECUTIVO CON EXCEL --- */}
      {activeTab === "summary" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Botón Maestro de Descarga */}
          <div className="flex justify-end">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/15 hover:bg-emerald-700 transition-all cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {isExporting ? "Compilando Planilla..." : "Descargar Libro de Caja (Excel)"}
            </button>
          </div>

          {/* Tarjetas KPI de Estado Macroeconómico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center gap-4">
              <div className="p-3 bg-white text-emerald-600 rounded-xl shadow-sm"><TrendingUp size={24} /></div>
              <div>
                <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider block">Total Recaudado</span>
                <span className="text-2xl font-black text-emerald-900">${totalRecaudadoCuotas.toLocaleString("es-CL")}</span>
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex items-center gap-4">
              <div className="p-3 bg-white text-brand-navy rounded-xl shadow-sm"><CreditCard size={24} /></div>
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Meta Presupuestada</span>
                <span className="text-2xl font-black text-brand-navy">${totalPresupuestadoEsperado.toLocaleString("es-CL")}</span>
              </div>
            </div>
            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="p-3 bg-white text-red-600 rounded-xl shadow-sm"><AlertCircle size={24} /></div>
              <div>
                <span className="text-xs text-red-700 font-semibold uppercase tracking-wider block">Saldo Pendiente</span>
                <span className="text-2xl font-black text-red-900">${totalPorCobrarPendiente.toLocaleString("es-CL")}</span>
              </div>
            </div>
          </div>

          {/* Tarjeta Detalle de Caja y Auditoría */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-xl space-y-4">
            <h3 className="text-base font-bold text-brand-navy">Fondos Disponibles por Medio de Pago</h3>
            <div className="divide-y divide-gray-50">
              <div className="flex justify-between py-3 text-sm">
                <span className="text-gray-500 flex items-center gap-2"><Wallet size={16} className="text-blue-500" /> Cuenta Banco (Transferencias)</span>
                <span className="font-bold text-gray-900">${totalCajaBanco.toLocaleString("es-CL")}</span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-gray-500 flex items-center gap-2"><DollarSign size={16} className="text-amber-500" /> Caja Física (Efectivo Reuniones)</span>
                <span className="font-bold text-gray-900">${totalCajaEfectivo.toLocaleString("es-CL")}</span>
              </div>
              <div className="flex justify-between pt-4 pb-1 text-base font-black border-t-2 border-gray-100">
                <span className="text-brand-navy">Total Neto Disponible en Curso</span>
                <span className="text-brand-navy">${totalGeneralEnCaja.toLocaleString("es-CL")}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* --- PESTAÑA 2: VALIDAR TRANSFERENCIAS --- */}
      {activeTab === "pending" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
          {pendingPayments.length === 0 ? (
            <div className="p-12 text-center text-gray-400 italic">
              🎉 ¡Al día! No tienes transferencias pendientes de revisión.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                    <th className="p-4">Alumno / Apoderado</th>
                    <th className="p-4">Concepto Declarado</th>
                    <th className="p-4">Monto</th>
                    <th className="p-4">Comprobante</th>
                    <th className="p-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-gray-700">
                  {pendingPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-brand-navy">
                          🎓 {p.student ? `${p.student.firstName} ${p.student.lastName}` : "No asignado"}
                        </div>
                        <div className="text-xs text-gray-400 font-medium">Por: {p.user.name || p.user.email}</div>
                      </td>
                      <td className="p-4 font-semibold text-gray-600">
                        {p.quotaNumber ? `Cuota de ${MONTHS_MAP[p.quotaNumber]}` : `🌟 ${p.extraFee?.title}`}
                      </td>
                      <td className="p-4 font-black text-brand-navy">${p.amount.toLocaleString("es-CL")}</td>
                      <td className="p-4">
                        {p.receiptUrl ? (
                          <a 
                            href={p.receiptUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-accent hover:underline cursor-pointer bg-brand-accent/5 px-2.5 py-1 rounded-lg border border-brand-accent/10"
                          >
                            <FileText size={14} /> Ver Archivo
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Sin archivo</span>
                        )}
                      </td>
                      <td className="p-4 flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleApprove(p.id)}
                          disabled={processingId !== null}
                          className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Aprobar Pago"
                        >
                          {processingId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button
                          onClick={() => triggerReject(p.id)}
                          disabled={processingId !== null}
                          className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Rechazar Pago"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- PESTAÑA 3: CAJA Y EFECTIVO (REGISTRO MANUAL) --- */}
      {activeTab === "cash" && (() => {
        const studentPending = pendingPayments.filter(p => p.studentId === cashStudentId);
        const studentVerified = verifiedPayments.filter(p => p.studentId === cashStudentId);

        const paidQuotasForStudent = [
          ...studentPending.filter(p => p.quotaNumber !== null).map(p => p.quotaNumber as number),
          ...studentVerified.filter(p => p.quotaNumber !== null).map(p => p.quotaNumber as number)
        ];

        const paidExtrasForStudent = [
          ...studentPending.filter(p => p.extraFeeId !== null).map(p => p.extraFeeId as string),
          ...studentVerified.filter(p => p.extraFeeId !== null).map(p => p.extraFeeId as string)
        ];

        const selectedStudent = students.find(s => s.id === cashStudentId);
        const startQuota = selectedStudent?.startQuotaNumber || 1;

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            <form onSubmit={handleRegisterCash} className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 h-fit">
              <div>
                <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
                  <UserCheck size={20} className="text-brand-accent" />
                  Pago en Reunión / Efectivo
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Ingresa los pagos físicos recibidos de forma presencial.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">1. Seleccionar Alumno(a)</label>
                <select
                  value={cashStudentId}
                  onChange={(e) => { setCashStudentId(e.target.value); setCashQuotas([]); setCashExtras([]); }}
                  required
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white cursor-pointer"
                >
                  <option value="">-- Buscar Alumno --</option>
                  {students.map(s => <option key={s.id} value={s.id}>🎓 {s.lastName}, {s.firstName}</option>)}
                </select>
              </div>

              {cashStudentId && (
                <>
                  <div className="space-y-2 border-t border-gray-50 pt-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">2. Cuotas Mensuales (${activeYear.quotaAmount})</label>
                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {Array.from({ length: activeYear.totalQuotas }).map((_, i) => {
                        const qNum = i + 1;
                        const isChecked = cashQuotas.includes(qNum);
                        const isAlreadyPaid = paidQuotasForStudent.includes(qNum);
                        const isExempt = qNum < startQuota;

                        return (
                          <button
                            key={qNum}
                            type="button"
                            disabled={isAlreadyPaid || isExempt}
                            onClick={() => setCashQuotas(isChecked ? cashQuotas.filter(q => q !== qNum) : [...cashQuotas, qNum])}
                            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:cursor-not-allowed ${
                              isExempt ? "bg-gray-50 border-gray-100 text-gray-400 opacity-60" :
                              isAlreadyPaid ? "bg-gray-50 border-gray-200 text-gray-500" :
                              isChecked ? "bg-brand-navy text-white border-brand-navy shadow-sm" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <span>{MONTHS_MAP[qNum]}</span>
                            {isAlreadyPaid && !isExempt && <Check size={14} className="text-emerald-500 stroke-[3]" />}
                            {isExempt && <Minus size={14} className="text-gray-400 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {extraFees.length > 0 && (
                    <div className="space-y-2 border-t border-gray-50 pt-3">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">3. Cobros Extraordinarios</label>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {extraFees.map(f => {
                          const isChecked = cashExtras.includes(f.id);
                          const isAlreadyPaid = paidExtrasForStudent.includes(f.id);

                          return (
                            <div 
                              key={f.id}
                              onClick={() => !isAlreadyPaid && setCashExtras(isChecked ? cashExtras.filter(id => id !== f.id) : [...cashExtras, f.id])}
                              className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold transition-all ${
                                isAlreadyPaid ? "bg-gray-50 border-gray-100 text-gray-400 opacity-40 cursor-not-allowed" : "cursor-pointer"
                              } ${isChecked ? "bg-brand-navy/5 border-brand-navy text-brand-navy font-bold" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked || isAlreadyPaid}
                                  disabled={isAlreadyPaid}
                                  onChange={() => {}}
                                  className="rounded text-brand-navy focus:ring-brand-navy shrink-0 disabled:cursor-not-allowed"
                                />
                                <span className="truncate">{f.title}</span>
                              </div>
                              <span className="font-bold text-gray-700 shrink-0 ml-2">${f.amount}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || (cashQuotas.length === 0 && cashExtras.length === 0)}
                    className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/10 hover:bg-emerald-700 transition-all cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Confirmar Recepción Efectivo"}
                  </button>
                </>
              )}
            </form>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-sm text-brand-navy">
                📜 Libro de Ingresos Verificados ({verifiedPayments.length} registros)
              </div>
              <div className="overflow-x-auto flex-1 max-h-[460px]">
                {verifiedPayments.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 italic text-sm">El libro de caja está vacío.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-50 text-gray-400 font-bold border-b border-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="p-3">Alumno</th>
                        <th className="p-3">Concepto</th>
                        <th className="p-3">Monto</th>
                        <th className="p-3">Vía</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-600">
                      {verifiedPayments.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/30">
                          <td className="p-3 font-bold text-brand-navy">🎓 {p.student?.firstName} {p.student?.lastName}</td>
                          <td className="p-3 font-medium">{p.quotaNumber ? `Cuota ${MONTHS_MAP[p.quotaNumber]}` : p.extraFee?.title}</td>
                          <td className="p-3 font-black text-gray-900">${p.amount.toLocaleString("es-CL")}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] border ${p.receiptUrl === "EFECTIVO" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                              {p.receiptUrl === "EFECTIVO" ? "💵 EFECTIVO" : "🏦 TRANSF."}
                            </span>
                          </td>
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

      {/* --- PESTAÑA 4: GESTIÓN DE COBROS EXTRAS --- */}
      {activeTab === "fees" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          <form onSubmit={handleCreateFee} className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 h-fit">
            <div>
              <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
                <PlusCircle size={20} className="text-brand-accent" />
                Nuevo Cobro Extraordinario
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">Crear cargos opcionales o eventos de recaudación.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Título del Cobro</label>
              <input
                type="text" value={newFeeTitle} onChange={e => setNewFeeTitle(e.target.value)}
                placeholder="Ej: Rifa Pro-Fondos Paseo" required
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Monto ($)</label>
                <input
                  type="number" value={newFeeAmount} onChange={e => setNewFeeAmount(e.target.value)}
                  placeholder="Ej: 5000" required min="1"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Vencimiento</label>
                <input
                  type="date" value={newFeeDueDate} onChange={e => setNewFeeDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit" disabled={isSubmitting}
              className="w-full py-2.5 bg-brand-navy text-white font-bold rounded-xl text-xs shadow-md hover:bg-opacity-95 transition-all cursor-pointer disabled:bg-gray-100"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Publicar Cobro Extraordinario"}
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-brand-navy">Cobros Vigentes en el Año Escolar</h3>
            {extraFees.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No se han registrado cobros extraordinarios todavía.</p>
            ) : (
              <div className="space-y-3">
                {extraFees.map(fee => (
                  <div key={fee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group/fee">
                    <div>
                      <h4 className="text-sm font-bold text-brand-navy">{fee.title}</h4>
                      {fee.dueDate && (
                        <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                          <Calendar size={12} /> Vence el {new Date(fee.dueDate).toLocaleDateString("es-CL")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-base font-black text-brand-navy">${fee.amount.toLocaleString("es-CL")}</span>
                      <button
                        onClick={() => triggerDeleteFee(fee.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-200/50 rounded-lg transition-all cursor-pointer md:opacity-0 group-hover/fee:opacity-100"
                        title="Eliminar Cobro"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SECCIÓN MODALES COMPARTIDOS --- */}
      <AlertModal 
        isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />

      <ConfirmModal 
        isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        isPending={processingId !== null}
      />

    </div>
  );
}