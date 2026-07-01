// src/components/ConfirmModal.tsx
"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean; // Para mostrar el spinner dentro del modal
}

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  isPending = false 
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
        {/* Encabezado del Modal */}
        <div className="bg-red-50 p-6 flex items-center gap-4 border-b border-red-100">
          <div className="bg-white p-2 rounded-full shadow-sm text-red-600">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        
        {/* Cuerpo del Modal */}
        <div className="p-6">
          <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
            {message}
          </p>
        </div>

        {/* Botones de Acción */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending && <Loader2 size={18} className="animate-spin" />}
            {isPending ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}