// src/components/PaymentDashboard.tsx
"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  FileText,
  Calendar,
  Eye,
  X // <-- Importamos la X para cerrar el modal
} from "lucide-react";
import RenderPaymentForm from "./RenderPaymentForm";

// --- INTERFACES ---
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

interface Payment {
  id: string;
  amount: number;
  date: Date;
  isVerified: boolean;
  quotaNumber: number | null;
  extraFeeId: string | null;
  studentId: string | null;
  extraFee?: ExtraFee | null;
}

interface Expense {
  id: string;
  amount: number;
  date: Date;
  concept: string;
  receiptUrl: string | null;
}

interface SchoolYear {
  id: string;
  year: number;
  quotaAmount: number;
  totalQuotas: number;
  initialBalance: number;
  extraFees: ExtraFee[];
}

interface PaymentDashboardProps {
  activeYear: SchoolYear;
  students: Student[];
  payments: Payment[];
  allCoursePayments: { amount: number; isVerified: boolean }[];
  expenses: Expense[];
  currentUserId: string;
}

const MONTHS_MAP: { [key: number]: string } = {
  1: "Marzo", 2: "Abril", 3: "Mayo", 4: "Junio", 5: "Julio",
  6: "Agosto", 7: "Septiembre", 8: "Octubre", 9: "Noviembre", 10: "Diciembre"
};

export default function PaymentDashboard({ 
  activeYear, 
  students, 
  payments, 
  allCoursePayments,
  expenses, 
  currentUserId 
}: PaymentDashboardProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || "");
  
  // --- NUEVO ESTADO PARA EL MODAL DEL COMPROBANTE ---
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);

  // 1. Filtrados individuales para las tarjetas del hijo seleccionado
  const studentPayments = payments.filter(p => p.studentId === selectedStudentId);
  const currentStudent = students.find(s => s.id === selectedStudentId);
  const startQuota = currentStudent?.startQuotaNumber || 1;

  const totalMonthsToPay = (activeYear.totalQuotas - startQuota) + 1;
  const totalExpectedQuotasAmount = activeYear.quotaAmount * Math.max(0, totalMonthsToPay);

  const totalVerifiedQuotasAmount = studentPayments
    .filter(p => p.isVerified && p.quotaNumber !== null && p.quotaNumber >= startQuota)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPendingQuotasAmount = Math.max(0, totalExpectedQuotasAmount - totalVerifiedQuotasAmount);


  // --- MATEMÁTICA MAESTRA DE TRANSPARENCIA GLOBAL DEL CURSO ---
  const totalIngresosCurso = allCoursePayments
    .filter(p => p.isVerified)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalEgresosCurso = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const saldoFinalDisponible = (totalIngresosCurso + activeYear.initialBalance) - totalEgresosCurso;

  if (students.length === 0) {
    return (
      <div className="bg-amber-50 p-8 rounded-2xl border border-amber-200 text-center max-w-2xl mx-auto shadow-sm">
        <AlertCircle size={48} className="text-amber-500 mx-auto mb-4 opacity-80" />
        <h2 className="text-xl font-bold text-amber-900 mb-2">No tienes alumnos asociados</h2>
        <p className="text-amber-700">
          Para poder visualizar tu estado de cuenta y rendir pagos, necesitas tener al menos un alumno(a) vinculado a tu perfil.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      
      {/* --- PANEL DE CONTROL MACRO: RESUMEN DE TRANSPARENCIA GLOBAL --- */}
      <div className="bg-gradient-to-br from-brand-navy to-slate-900 text-white p-6 rounded-3xl shadow-md space-y-6">
        <div>
          <span className="text-xs font-bold text-brand-accent uppercase tracking-wider block">Transparencia Financiera</span>
          <h2 className="text-xl font-black mt-0.5">Estado de Caja General del Curso</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 text-red-400 rounded-xl"><TrendingDown size={20} /></div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide block">Total Egresos</span>
              <span className="text-lg font-black text-red-400">${totalEgresosCurso.toLocaleString("es-CL")}</span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl"><Wallet size={20} /></div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide block">Fondo Inicial ({activeYear.year})</span>
              <span className="text-lg font-black text-blue-400">${activeYear.initialBalance.toLocaleString("es-CL")}</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border flex items-center gap-3 shadow-inner ${
            saldoFinalDisponible >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
          }`}>
            <div className={`p-2.5 rounded-xl ${saldoFinalDisponible >= 0 ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
              <DollarSign size={20} />
            </div>
            <div>
              <span className="text-[10px] text-gray-300 font-bold uppercase tracking-wide block">Saldo Real Neto</span>
              <span className={`text-xl font-black ${saldoFinalDisponible >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                ${saldoFinalDisponible.toLocaleString("es-CL")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* --- DISEÑO TRADICIONAL EN COLUMNAS (OPERACIONES PARTICULARES) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SECCIÓN IZQUIERDA Y CENTRAL: GRILLAS DEL ALUMNO SELECCIONADO */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Selector de Alumnos */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <span className="text-sm font-bold text-gray-500">
              {students.length === 1 ? "Visualizando pagos de:" : "Selecciona el alumno:"}
            </span>
            <div className="flex gap-2 flex-wrap">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  disabled={students.length === 1}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedStudentId === student.id
                      ? "bg-brand-navy text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer"
                  }`}
                >
                  🎓 {student.firstName} {student.lastName}
                </button>
              ))}
            </div>
          </div>

          {/* Tarjetas de Indicadores Personales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl text-emerald-600 shadow-sm"><CheckCircle2 size={22} /></div>
              <div>
                <span className="text-xs text-emerald-700 font-semibold uppercase tracking-wider block">Total Pagado</span>
                <span className="text-2xl font-black text-emerald-900">${totalVerifiedQuotasAmount.toLocaleString("es-CL")}</span>
              </div>
            </div>
            <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl text-red-600 shadow-sm"><AlertCircle size={22} /></div>
              <div>
                <span className="text-xs text-red-700 font-semibold uppercase tracking-wider block">Por Pagar</span>
                <span className="text-2xl font-black text-red-900">${totalPendingQuotasAmount.toLocaleString("es-CL")}</span>
              </div>
            </div>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl text-brand-navy shadow-sm"><DollarSign size={22} /></div>
              <div>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider block">Valor Cuota</span>
                <span className="text-2xl font-black text-brand-navy">${activeYear.quotaAmount.toLocaleString("es-CL")}</span>
              </div>
            </div>
          </div>

          {/* Grilla Mensualidades */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-brand-navy">Estado de Cuotas Mensuales - Año {activeYear.year}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Array.from({ length: activeYear.totalQuotas }).map((_, index) => {
                const quotaNum = index + 1;
                const monthName = MONTHS_MAP[quotaNum] || `Cuota ${quotaNum}`;
                
                const isExempt = quotaNum < startQuota;
                const paymentForQuota = studentPayments.find(p => p.quotaNumber === quotaNum);

                let statusClass = "bg-red-50 text-red-700 border-red-100";
                let StatusIcon = <AlertCircle size={14} className="text-red-500" />;
                let statusText = "Pendiente";

                if (isExempt) {
                  statusClass = "bg-gray-50 text-gray-400 border-gray-100 opacity-60";
                  StatusIcon = <Minus size={14} className="text-gray-400" />;
                  statusText = "Exento";
                } else if (paymentForQuota) {
                  if (paymentForQuota.isVerified) {
                    statusClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    StatusIcon = <CheckCircle2 size={14} className="text-emerald-500" />;
                    statusText = "Verificado";
                  } else {
                    statusClass = "bg-amber-50 text-amber-700 border-amber-100";
                    StatusIcon = <Clock size={14} className="text-amber-500 animate-pulse" />;
                    statusText = "Por Validar";
                  }
                }

                return (
                  <div 
                    key={quotaNum} 
                    className={`p-3 rounded-xl border text-center flex flex-col justify-between min-h-[90px] transition-all hover:shadow-sm ${statusClass}`}
                  >
                    <span className="text-xs font-black uppercase tracking-wide block">{monthName}</span>
                    <span className="text-sm font-bold block my-1">
                      {isExempt ? "—" : `$${activeYear.quotaAmount.toLocaleString("es-CL")}`}
                    </span>
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase mt-1">
                      {StatusIcon}
                      {statusText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cobros Extraordinarios */}
          {activeYear.extraFees.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-brand-navy">Cobros Extraordinarios / Eventos Especiales</h2>
              <div className="space-y-3">
                {activeYear.extraFees.map((fee) => {
                  const paymentForExtra = studentPayments.find(p => p.extraFeeId === fee.id);
                  
                  let badgeClass = "bg-red-50 text-red-700 border-red-100";
                  let badgeText = "Pendiente";
                  if (paymentForExtra) {
                    badgeText = paymentForExtra.isVerified ? "Pagado y Verificado" : "Comprobante en Revisión";
                    badgeClass = paymentForExtra.isVerified 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                      : "bg-amber-50 text-amber-700 border-amber-100";
                  }

                  return (
                    <div key={fee.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-brand-navy">{fee.title}</h4>
                        {fee.dueDate && (
                          <span className="text-xs text-gray-400 font-medium block mt-0.5">
                            📅 Vence: {new Date(fee.dueDate).toLocaleDateString("es-CL")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <span className="text-base font-black text-brand-navy">${fee.amount.toLocaleString("es-CL")}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}>
                          {badgeText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Libro Público de Compras y Gastos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-sm text-brand-navy flex items-center gap-2">
              <FileText size={18} className="text-red-500" />
              Rendición de Gastos y Bitácora de Compras del Curso
            </div>
            
            <div className="overflow-x-auto max-h-[350px]">
              {expenses.length === 0 ? (
                <div className="p-8 text-center text-gray-400 italic text-xs">
                  Aún no se registran egresos en el año en curso. La caja está intacta.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 text-gray-400 font-bold border-b border-gray-100">
                    <tr>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Concepto / Detalle</th>
                      <th className="p-3">Monto</th>
                      <th className="p-3 text-center">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-gray-600">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-gray-50/30">
                        <td className="p-3 whitespace-nowrap">
                          <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-500 inline-flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(exp.date).toLocaleDateString("es-CL")}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-brand-navy">{exp.concept}</td>
                        <td className="p-3 font-black text-red-600">-${exp.amount.toLocaleString("es-CL")}</td>
                        <td className="p-3 text-center">
                          {exp.receiptUrl ? (
                            <button 
                              type="button"
                              onClick={() => setReceiptModalUrl(exp.receiptUrl)} 
                              className="inline-flex items-center gap-1 text-[10px] font-black text-brand-accent hover:bg-brand-accent/10 bg-brand-accent/5 border border-brand-accent/10 px-2 py-1 rounded transition-colors cursor-pointer"
                            >
                              <Eye size={12} /> Ver Boleta
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Sin archivo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* SECCIÓN DERECHA: FORMULARIO DE RENDICIÓN */}
        <div className="lg:col-span-1">
          <RenderPaymentForm 
            key={selectedStudentId}
            activeYear={activeYear}
            studentId={selectedStudentId}
            studentPayments={studentPayments}
            startQuotaNumber={startQuota}
          />
        </div>

      </div>

      {/* --- MODAL FLOTANTE PARA VER COMPROBANTES (IFRAME) --- */}
      {receiptModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl overflow-hidden w-full max-w-3xl shadow-2xl relative flex flex-col max-h-[90vh]">
            
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-brand-navy flex items-center gap-2">
                <FileText size={18} className="text-brand-accent"/>
                Comprobante Adjunto
              </h3>
              <button 
                onClick={() => setReceiptModalUrl(null)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                title="Cerrar visor"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-100/50 p-2 sm:p-4 flex items-center justify-center min-h-[50vh]">
              {/* Usamos iframe que es compatible nativamente con PDFs e imágenes */}
              <iframe 
                src={receiptModalUrl} 
                className="w-full h-[60vh] rounded-xl border border-gray-200 bg-white shadow-sm"
                title="Visor de Comprobante"
              />
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-500">¿El documento no carga correctamente?</span>
              <a 
                href={receiptModalUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
              >
                Abrir en pestaña nueva
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}