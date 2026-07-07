// src/app/admin/alumnos/AdminStudentClient.tsx
"use client";

import { useState } from "react";
import { 
  createStudent, 
  updateStudent, 
  linkParentToStudent, 
  unlinkParentFromStudent 
} from "@/app/actions/student";
import { 
  Loader2, 
  UserPlus, 
  Link as LinkIcon, 
  Mail, 
  Edit, 
  X, 
  Users,
  CheckCircle2,
  XCircle,
  Unlink
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

// --- INTERFACES ---
interface Parent {
  id: string;
  name: string | null;
  email: string | null;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  startQuotaNumber: number;
  parents: Parent[];
}

interface AdminStudentClientProps {
  students: Student[];
}

const MONTHS_MAP: { [key: number]: string } = {
  1: "Marzo", 2: "Abril", 3: "Mayo", 4: "Junio", 5: "Julio",
  6: "Agosto", 7: "Septiembre", 8: "Octubre", 9: "Noviembre", 10: "Diciembre"
};

export default function AdminStudentClient({ students }: AdminStudentClientProps) {
  // Estados de carga generales
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Estados Formulario Crear
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [startQuota, setStartQuota] = useState("1"); // Por defecto Marzo

  // Estados Modal Vincular Apoderado
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [parentEmail, setParentEmail] = useState("");

  // Modales Compartidos
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ isOpen: false, type: "success", title: "", message: "" });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => Promise<void>; }>({ isOpen: false, title: "", message: "", onConfirm: async () => {} });

  // --- ACCIÓN: CREAR ALUMNO ---
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createStudent({
        firstName,
        lastName,
        startQuotaNumber: parseInt(startQuota)
      });
      setFirstName("");
      setLastName("");
      setStartQuota("1");
      setAlertConfig({ isOpen: true, type: "success", title: "Alumno Matriculado", message: "El registro ha sido creado exitosamente." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al guardar.";
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACCIÓN: VINCULAR APODERADO ---
  const handleLinkParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !parentEmail || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await linkParentToStudent(selectedStudent.id, parentEmail);
      setParentEmail("");
      setLinkModalOpen(false);
      setAlertConfig({ isOpen: true, type: "success", title: "Apoderado Vinculado", message: "El apoderado ahora podrá ver los pagos de este alumno." });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al vincular.";
      setAlertConfig({ isOpen: true, type: "error", title: "Error de Vinculación", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- ACCIÓN: DESVINCULAR APODERADO ---
  const triggerUnlink = (studentId: string, parentId: string, parentEmailStr: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "¿Desvincular Apoderado?",
      message: `El usuario con correo ${parentEmailStr} perderá el acceso a la cuenta de este alumno. ¿Estás seguro?`,
      onConfirm: async () => {
        setProcessingId(parentId);
        try {
          await unlinkParentFromStudent(studentId, parentId);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al desvincular.";
          setAlertConfig({ isOpen: true, type: "error", title: "Error", message: errorMessage });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  // --- ACCIÓN: DAR DE BAJA/ALTA (ACTIVO/INACTIVO) ---
  const triggerToggleStatus = (student: Student) => {
    const newStatus = !student.isActive;
    const actionText = newStatus ? "Dar de Alta" : "Dar de Baja (Retirar)";
    
    setConfirmConfig({
      isOpen: true,
      title: `¿${actionText} a ${student.firstName}?`,
      message: newStatus 
        ? "El alumno volverá a aparecer en el listado activo y se reanudarán sus cobros." 
        : "El alumno será marcado como inactivo. No se eliminará su historial, pero dejará de generar deudas futuras.",
      onConfirm: async () => {
        setProcessingId(student.id);
        try {
          await updateStudent({
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            startQuotaNumber: student.startQuotaNumber,
            isActive: newStatus
          });
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al cambiar estado.";
          setAlertConfig({ isOpen: true, type: "error", title: "Error", message: errorMessage });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      
      {/* --- COLUMNA IZQUIERDA: CREAR ALUMNO --- */}
      <form onSubmit={handleCreateStudent} className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 h-fit sticky top-6">
        <div>
          <h3 className="text-lg font-bold text-brand-navy flex items-center gap-2">
            <UserPlus size={20} className="text-brand-accent" />
            Matricular Alumno
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Ingresa los datos para registrar un niño en el curso.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nombres</label>
            <input
              type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
              placeholder="Ej: Juan Pablo" required
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Apellidos</label>
            <input
              type="text" value={lastName} onChange={e => setLastName(e.target.value)}
              placeholder="Ej: Pérez González" required
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Mes de Ingreso</label>
            <select
              value={startQuota} onChange={e => setStartQuota(e.target.value)} required
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white cursor-pointer"
            >
              {[1,2,3,4,5,6,7,8,9,10].map(num => (
                <option key={num} value={num}>{MONTHS_MAP[num]} (Cuota {num})</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-400 mt-1 leading-tight">Define desde qué mes debe comenzar a pagar. Los meses anteriores quedarán &quot;Exentos&quot;.</p>
          </div>
        </div>

        <button
          type="submit" disabled={isSubmitting}
          className="w-full py-2.5 bg-brand-navy text-white font-bold rounded-xl text-xs shadow-md hover:bg-opacity-95 transition-all cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 flex justify-center items-center gap-2"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {isSubmitting ? "Guardando..." : "Crear Registro"}
        </button>
      </form>

      {/* --- COLUMNA DERECHA: DIRECTORIO --- */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-sm text-brand-navy flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-brand-accent" />
            Nómina de Alumnos ({students.length})
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {students.length === 0 ? (
            <div className="p-12 text-center text-gray-400 italic text-sm">Aún no hay alumnos matriculados.</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-gray-50 text-gray-400 font-bold border-b border-gray-100">
                <tr>
                  <th className="p-4">Alumno</th>
                  <th className="p-4">Mes de Ingreso</th>
                  <th className="p-4">Apoderado(s) Vinculado(s)</th>
                  <th className="p-4 text-center">Gestión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-600">
                {students.map(student => (
                  <tr key={student.id} className={`hover:bg-gray-50/50 transition-colors ${!student.isActive && "opacity-60 bg-gray-50"}`}>
                    <td className="p-4">
                      <div className="font-bold text-brand-navy">
                        {student.lastName}, {student.firstName}
                      </div>
                      <div className="flex items-center mt-1">
                        {student.isActive 
                          ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1"><CheckCircle2 size={10}/> Activo</span>
                          : <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 flex items-center gap-1"><XCircle size={10}/> Retirado</span>
                        }
                      </div>
                    </td>
                    <td className="p-4 font-semibold">
                      <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs">
                        {MONTHS_MAP[student.startQuotaNumber]}
                      </span>
                    </td>
                    <td className="p-4">
                      {student.parents.length === 0 ? (
                        <span className="text-xs italic text-amber-600 font-medium">Sin apoderado asignado</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {student.parents.map(parent => (
                            <div key={parent.id} className="flex items-center justify-between bg-brand-navy/5 border border-brand-navy/10 px-2.5 py-1.5 rounded-lg w-full group">
                              <span className="text-[11px] font-bold text-brand-navy flex items-center gap-1.5 truncate max-w-[180px]">
                                <Mail size={12} className="shrink-0 text-brand-accent"/> {parent.email}
                              </span>
                              <button 
                                onClick={() => triggerUnlink(student.id, parent.id, parent.email || '')}
                                disabled={processingId !== null}
                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Desvincular"
                              >
                                {processingId === parent.id ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-4 flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setSelectedStudent(student); setLinkModalOpen(true); }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Vincular Apoderado"
                      >
                        <LinkIcon size={16} />
                      </button>
                      <button
                        onClick={() => triggerToggleStatus(student)}
                        disabled={processingId === student.id}
                        className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-colors"
                        title={student.isActive ? "Dar de Baja" : "Dar de Alta"}
                      >
                        {processingId === student.id ? <Loader2 size={16} className="animate-spin" /> : <Edit size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- MODAL FLOTANTE: VINCULAR APODERADO --- */}
      {linkModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => { setLinkModalOpen(false); setParentEmail(""); }}
              className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
            
            <div className="text-center mb-6">
              <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <LinkIcon size={24} className="text-blue-500" />
              </div>
              <h3 className="text-xl font-black text-brand-navy">Vincular Apoderado</h3>
              <p className="text-sm text-gray-500 mt-1">
                Conecta a <strong className="text-brand-navy">{selectedStudent.firstName} {selectedStudent.lastName}</strong> con su responsable.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[11px] p-3 rounded-xl mb-5 font-medium text-center">
              El apoderado <strong>debe haber iniciado sesión en la plataforma</strong> al menos una vez para que su correo exista en nuestro sistema.
            </div>

            <form onSubmit={handleLinkParent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Correo Electrónico (Google o Magic Link)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={e => setParentEmail(e.target.value)}
                    placeholder="ejemplo@gmail.com"
                    required
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-blue-700 transition-all cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 flex justify-center items-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Vincular a la Cuenta"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- SECCIÓN MODALES COMPARTIDOS --- */}
      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isPending={processingId !== null} />
    </div>
  );
}