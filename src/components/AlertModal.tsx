// src/components/AlertModal.tsx
"use client";

import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";

export type AlertType = "success" | "error" | "warning" | "info";

interface AlertModalProps {
  isOpen: boolean;
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
}

export default function AlertModal({ isOpen, type, title, message, onClose }: AlertModalProps) {
  if (!isOpen) return null;

  // Diccionario de estilos dinámicos según el tipo de alerta
  const styles = {
    success: {
      icon: <CheckCircle2 size={28} className="text-emerald-600" />,
      headerBg: "bg-emerald-50",
      headerBorder: "border-emerald-100",
      btnBg: "bg-emerald-600 hover:bg-emerald-700",
    },
    error: {
      icon: <XCircle size={28} className="text-red-600" />,
      headerBg: "bg-red-50",
      headerBorder: "border-red-100",
      btnBg: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: <AlertCircle size={28} className="text-amber-600" />,
      headerBg: "bg-amber-50",
      headerBorder: "border-amber-100",
      btnBg: "bg-amber-600 hover:bg-amber-700",
    },
    info: {
      icon: <Info size={28} className="text-blue-600" />,
      headerBg: "bg-blue-50",
      headerBorder: "border-blue-100",
      btnBg: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const currentStyle = styles[type];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-fade-in">
        
        {/* Encabezado Dinámico */}
        <div className={`${currentStyle.headerBg} p-5 flex flex-col items-center gap-3 border-b ${currentStyle.headerBorder} text-center`}>
          <div className="bg-white p-2.5 rounded-full shadow-sm">
            {currentStyle.icon}
          </div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        
        {/* Cuerpo del Modal */}
        <div className="p-6 text-center">
          <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">
            {message}
          </p>
        </div>

        {/* Botón de Acción Único */}
        <div className="bg-gray-50 px-6 py-4 flex justify-center border-t border-gray-100">
          <button
            onClick={onClose}
            className={`w-full py-2.5 rounded-xl font-bold text-white transition-colors shadow-md cursor-pointer ${currentStyle.btnBg}`}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}