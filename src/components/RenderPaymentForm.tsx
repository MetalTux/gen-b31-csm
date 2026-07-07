// src/components/RenderPaymentForm.tsx
"use client";

import { useState, useEffect } from "react";
import { renderPayments } from "@/app/actions/payment";
import { UploadButton } from "@/lib/uploadthing";
import { Loader2, Receipt, ArrowUpRight, Check, DollarSign } from "lucide-react";
import AlertModal, { AlertType } from "./AlertModal";

interface ExtraFee {
  id: string;
  title: string;
  amount: number;
  dueDate: Date | null;
}

interface SchoolYear {
  id: string;
  year: number;
  quotaAmount: number;
  totalQuotas: number;
  extraFees: ExtraFee[];
}

interface Payment {
  id: string;
  amount: number;
  isVerified: boolean;
  quotaNumber: number | null;
  extraFeeId: string | null;
}

interface RenderPaymentFormProps {
  activeYear: SchoolYear;
  studentId: string;
  studentPayments: Payment[];
  startQuotaNumber: number;
}

const MONTHS_MAP: { [key: number]: string } = {
  1: "Marzo", 2: "Abril", 3: "Mayo", 4: "Junio", 5: "Julio",
  6: "Agosto", 7: "Septiembre", 8: "Octubre", 9: "Noviembre", 10: "Diciembre"
};

export default function RenderPaymentForm({ activeYear, studentId, studentPayments, startQuotaNumber }: RenderPaymentFormProps) {
  const [selectedQuotas, setSelectedQuotas] = useState<number[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
  }>({ isOpen: false, type: "success", title: "", message: "" });

  // MANEJADORES DE SELECCIÓN (Checkboxes)
  const toggleQuota = (quotaNum: number) => {
    if (selectedQuotas.includes(quotaNum)) {
      setSelectedQuotas(selectedQuotas.filter(q => q !== quotaNum));
    } else {
      setSelectedQuotas([...selectedQuotas, quotaNum]);
    }
  };

  const toggleExtra = (feeId: string) => {
    if (selectedExtras.includes(feeId)) {
      setSelectedExtras(selectedExtras.filter(id => id !== feeId));
    } else {
      setSelectedExtras([...selectedExtras, feeId]);
    }
  };

  // CÁLCULO DINÁMICO DEL TOTAL EN TIEMPO REAL
  const totalQuotasAmount = selectedQuotas.length * activeYear.quotaAmount;
  const totalExtrasAmount = activeYear.extraFees
    .filter(fee => selectedExtras.includes(fee.id))
    .reduce((sum, fee) => sum + fee.amount, 0);
  
  const totalToPay = totalQuotasAmount + totalExtrasAmount;

  // ENVÍO DEL FORMULARIO AL SERVER ACTION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalToPay === 0 || !receiptUrl || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await renderPayments({
        amountPerItem: activeYear.quotaAmount,
        receiptUrl,
        selectedQuotas,
        selectedExtraFeeIds: selectedExtras,
        studentId
      });

      // Éxito: Limpiamos el formulario
      setSelectedQuotas([]);
      setSelectedExtras([]);
      setReceiptUrl("");
      setAlertConfig({
        isOpen: true,
        type: "success",
        title: "¡Rendición Enviada!",
        message: "Tu comprobante de transferencia ha sido enviado con éxito. La directiva lo revisará y validará a la brevedad."
      });
    } catch (error) {
      setAlertConfig({
        isOpen: true,
        type: "error",
        title: "Error de Sistema",
        message: "Hubo un error al procesar la rendición del pago. Por favor, inténtalo nuevamente más tarde."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 sticky top-6">
      <div>
        <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
          <Receipt size={20} className="text-brand-accent" />
          Rendir Transferencia
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          Selecciona los ítems que transferiste y adjunta el comprobante bancario.
        </p>
      </div>

      {/* 1. SELECCIÓN DE CUOTAS DEL AÑO */}
      <div className="space-y-2.5">
        <label className="text-xs font-black text-brand-navy uppercase tracking-wider block">1. Cuotas Mensuales</label>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {Array.from({ length: activeYear.totalQuotas }).map((_, index) => {
            const quotaNum = index + 1;
            const monthName = MONTHS_MAP[quotaNum] || `Cuota ${quotaNum}`;
            
            // Verificamos si esta cuota ya se pagó o está por validar
            const existingPayment = studentPayments.find(p => p.quotaNumber === quotaNum);
            const isAlreadyPaid = !!existingPayment;
            const isExempt = quotaNum < startQuotaNumber;

            return (
              <button
                key={quotaNum}
                type="button"
                disabled={isAlreadyPaid || isExempt || isSubmitting}
                onClick={() => toggleQuota(quotaNum)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${
                  isAlreadyPaid
                    ? "bg-gray-50 border-gray-100 text-gray-400"
                    : selectedQuotas.includes(quotaNum)
                    ? "bg-brand-navy text-white border-brand-navy shadow-sm shadow-brand-navy/10"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{monthName}</span>
                {isAlreadyPaid ? (
                  <span className="text-[9px] uppercase font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">Ok</span>
                ) : selectedQuotas.includes(quotaNum) ? (
                  <Check size={14} className="text-brand-accent shrink-0" />
                ) : (
                  <span className="text-gray-400 text-[10px]">${activeYear.quotaAmount / 1000}k</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. SELECCIÓN DE COBROS EXTRAORDINARIOS */}
      {activeYear.extraFees.length > 0 && (
        <div className="space-y-2.5 border-t border-gray-50 pt-4">
          <label className="text-xs font-black text-brand-navy uppercase tracking-wider block">2. Cobros Extraordinarios</label>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {activeYear.extraFees.map((fee) => {
              const existingPayment = studentPayments.find(p => p.extraFeeId === fee.id);
              const isAlreadyPaid = !!existingPayment;
              const isChecked = selectedExtras.includes(fee.id);

              return (
                <div
                  key={fee.id}
                  onClick={() => !isAlreadyPaid && !isSubmitting && toggleExtra(fee.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all select-none ${
                    isAlreadyPaid
                      ? "bg-gray-50 border-gray-100 text-gray-400 opacity-40 cursor-not-allowed"
                      : "cursor-pointer"
                  } ${
                    isChecked 
                      ? "bg-brand-navy/5 border-brand-navy text-brand-navy font-bold" 
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <input
                      type="checkbox"
                      checked={isChecked || isAlreadyPaid}
                      disabled={isAlreadyPaid || isSubmitting}
                      onChange={() => {}} // Manejado por el div parent
                      className="rounded text-brand-navy focus:ring-brand-navy shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span className="truncate" title={fee.title}>{fee.title}</span>
                  </div>
                  <span className="shrink-0 font-bold text-gray-700">${fee.amount.toLocaleString("es-CL")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. CARGA DE COMPROBANTE CON UPLOADTHING */}
      <div className="space-y-2.5 border-t border-gray-50 pt-4">
        <label className="text-xs font-black text-brand-navy uppercase tracking-wider block">3. Adjuntar Comprobante</label>
        
        {receiptUrl ? (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-800">
            <div className="flex items-center gap-2 truncate">
              <div className="p-1.5 bg-white text-emerald-600 rounded-md shadow-sm shrink-0"><Check size={14} /></div>
              <span className="truncate">¡Archivo cargado con éxito!</span>
            </div>
            <button
              type="button"
              onClick={() => setReceiptUrl("")}
              disabled={isSubmitting}
              className="text-[10px] text-red-600 hover:underline cursor-pointer font-bold shrink-0 pl-2 disabled:opacity-40"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-2 bg-gray-50 hover:bg-gray-100/50 transition-colors flex justify-center text-center">
            {/* OJO: Conectamos al endpoint "paymentReceiptUploader" que definimos en tu Core de UploadThing */}
            <UploadButton
              endpoint="paymentReceiptUploader"
              onClientUploadComplete={(res) => {
                if (res && res[0]) {
                  setReceiptUrl(res[0].url);
                }
              }}
              onUploadError={(error: Error) => {
                setAlertConfig({
                  isOpen: true,
                  type: "error",
                  title: "Error de Archivo",
                  message: `No se pudo subir el comprobante: ${error.message}`
                });
              }}
              content={{
                button({ ready }: { ready: boolean }) {
                  if (ready) return "Seleccionar Documento"; // Texto más corto y directo
                  return "Preparando...";
                },
                allowedContent: "Imágenes o PDF hasta 4MB"
              }}
              // NUEVA CONFIGURACIÓN DE APARIENCIA
              appearance={{
                container: "flex flex-col items-center justify-center",
                button: "bg-brand-navy text-white text-xs font-bold px-6 py-2 rounded-xl cursor-pointer hover:bg-brand-navy/90 transition-all shadow-sm w-auto",
                allowedContent: "text-[10px] text-gray-400 font-medium mt-1.5"
              }}
            />
          </div>
        )}
      </div>

      {/* 4. TOTALIZADOR Y BOTÓN DE ACCIÓN FINAL */}
      <div className="border-t border-gray-100 pt-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Monto Declarado:</span>
          <span className="text-2xl font-black text-brand-navy flex items-center">
            <DollarSign size={20} className="-mr-0.5 text-gray-400 font-normal" />
            {totalToPay.toLocaleString("es-CL")}
          </span>
        </div>

        <button
          type="submit"
          disabled={totalToPay === 0 || !receiptUrl || isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-brand-navy text-white py-3 rounded-xl font-bold shadow-md shadow-brand-navy/10 hover:bg-opacity-95 transition-all cursor-pointer disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed text-sm"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowUpRight size={16} />
          )}
          {isSubmitting ? "Procesando Pago..." : "Enviar Rendición de Pago"}
        </button>
      </div>

      {/* RENDERIZAMOS EL MODAL AL FINAL */}
      <AlertModal 
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
    </form>
  );
}