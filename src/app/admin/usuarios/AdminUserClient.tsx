// src/app/admin/usuarios/AdminUserClient.tsx
"use client";

import { useState } from "react";
import { createUser, updateUser, deleteUser, toggleUserAccess } from "@/app/actions/user";
import { Role, BoardPosition } from "@prisma/client";
import { 
  Loader2, 
  Shield, 
  User as UserIcon, 
  Mail, 
  ShieldAlert,
  UserPlus,
  Edit2,
  Trash2,
  X,
  Ban,
  UserCheck,
  Plus
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

interface SimpleStudent {
  id: string;
  firstName: string;
  lastName: string;
}

interface AppUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: Role;
  isActive: boolean;
  boardPosition: BoardPosition | null;
  students: SimpleStudent[];
}

interface AdminUserClientProps {
  users: AppUser[];
}

export default function AdminUserClient({ users }: AdminUserClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Estado para el acordeón móvil
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

  // Estados Formulario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [boardPosition, setBoardPosition] = useState<BoardPosition>("TESORERO");

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ isOpen: false, type: "success", title: "", message: "" });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => Promise<void>; }>({ isOpen: false, title: "", message: "", onConfirm: async () => {} });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setEmail("");
    setRole("USER");
    setBoardPosition("TESORERO");
    setIsMobileFormOpen(false); // Cerramos en móvil al limpiar
  };

  const startEditing = (user: AppUser) => {
    setEditingId(user.id);
    setName(user.name || "");
    setEmail(user.email || "");
    setRole(user.role);
    setBoardPosition(user.boardPosition || "TESORERO");
    setIsMobileFormOpen(true); // Forzamos abrir en móvil al editar
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateUser({ id: editingId, name, email, role, boardPosition });
        setAlertConfig({ isOpen: true, type: "success", title: "Usuario Actualizado", message: "Los datos y permisos se guardaron correctamente." });
      } else {
        await createUser({ name, email, role, boardPosition });
        setAlertConfig({ isOpen: true, type: "success", title: "Usuario Creado", message: "El usuario ha sido pre-registrado. Sus permisos se activarán cuando inicie sesión." });
      }
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error de guardado.";
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDelete = (user: AppUser) => {
    setConfirmConfig({
      isOpen: true,
      title: `¿Eliminar a ${user.name || user.email}?`,
      message: "Esta acción borrará el acceso del usuario a la plataforma de forma permanente. Si el usuario ya tiene pagos registrados, el sistema bloqueará la eliminación por seguridad contable.",
      onConfirm: async () => {
        setProcessingId(user.id);
        try {
          await deleteUser(user.id);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          if (editingId === user.id) resetForm();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error al eliminar.";
          setAlertConfig({ isOpen: true, type: "error", title: "No se pudo eliminar", message: errorMessage });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const triggerToggleAccess = (user: AppUser) => {
    const newStatus = !user.isActive;
    const actionText = newStatus ? "Reactivar Acceso" : "Suspender Cuenta";
    
    setConfirmConfig({
      isOpen: true,
      title: `¿${actionText} a ${user.name || user.email}?`,
      message: newStatus 
        ? "El usuario recuperará inmediatamente su acceso a la plataforma."
        : "Se le negará el acceso a la plataforma. No podrá ver el muro ni la información del curso hasta que lo reactives.",
      onConfirm: async () => {
        setProcessingId(user.id);
        try {
          await toggleUserAccess(user.id, newStatus);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* --- COLUMNA IZQUIERDA: FORMULARIO --- */}
      <div className="lg:col-span-1 h-fit lg:sticky lg:top-6 flex flex-col gap-4">
        
        <button 
          type="button"
          onClick={() => setIsMobileFormOpen(!isMobileFormOpen)}
          className="flex lg:hidden! w-full bg-brand-navy text-white py-3 rounded-xl font-bold items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          {isMobileFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isMobileFormOpen ? "Ocultar Formulario" : (editingId ? "Continuar Editando Usuario" : "Crear Pre-Registro")}
        </button>

        <form onSubmit={handleSubmit} className={`p-6 rounded-2xl border shadow-sm space-y-4 transition-all lg:block! ${isMobileFormOpen ? 'block' : 'hidden'} ${editingId ? "bg-amber-50/50 border-amber-200" : "bg-white border-gray-100"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-bold flex items-center gap-2 ${editingId ? "text-amber-700" : "text-brand-navy"}`}>
                {editingId ? <Edit2 size={20} className="text-amber-500" /> : <UserPlus size={20} className="text-brand-accent" />}
                {editingId ? "Editar Usuario" : "Crear Pre-Registro"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {editingId ? "Actualiza datos y privilegios." : "Registra un apoderado manualmente."}
              </p>
            </div>
            {editingId && (
              <button type="button" onClick={resetForm} className="p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-full border border-gray-200 shadow-sm cursor-pointer">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre Completo</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ej: Camila Rojas" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Correo Electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="correo@ejemplo.com" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Privilegios</label>
                <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white cursor-pointer">
                  <option value="USER">Apoderado</option>
                  <option value="ADMIN">Directiva</option>
                </select>
              </div>

              {role === "ADMIN" && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-xs font-bold text-brand-navy uppercase tracking-wide">Cargo</label>
                  <select value={boardPosition} onChange={e => setBoardPosition(e.target.value as BoardPosition)} className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-brand-accent/50 bg-brand-navy/5 focus:outline-none focus:ring-2 focus:ring-brand-accent text-brand-navy cursor-pointer">
                    <option value="TESORERO">Tesorero</option>
                    <option value="PRESIDENTE">Presidente</option>
                    <option value="SECRETARIO">Secretario</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className={`w-full py-2.5 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer flex justify-center items-center gap-2 pt-3 disabled:bg-gray-100 disabled:text-gray-400 ${editingId ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-brand-navy text-white hover:bg-opacity-95"}`}>
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : (editingId ? <Edit2 size={16} /> : <UserPlus size={16} />)}
            {isSubmitting ? "Guardando..." : (editingId ? "Guardar Cambios" : "Crear Usuario")}
          </button>
        </form>
      </div>

      {/* --- COLUMNA DERECHA: TABLA DE USUARIOS --- */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
        <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-sm text-brand-navy flex items-center gap-2">
          <Shield size={18} className="text-brand-accent" />
          Directorio de Usuarios ({users.length})
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left border-collapse text-sm min-w-[600px]">
            <thead className="bg-gray-50 text-gray-400 font-bold border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="p-4">Apoderado</th>
                <th className="p-4">Perfil / Privilegios</th>
                <th className="p-4">Alumnos a Cargo</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-600">
              {users.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50/40 transition-colors ${editingId === u.id ? "bg-amber-50/30" : ""} ${!u.isActive ? "bg-red-50/20" : ""}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {u.image ? (
                        <img src={u.image} alt={u.name || "Avatar"} className={`w-9 h-9 rounded-full border border-gray-200 object-cover ${!u.isActive ? "opacity-50 grayscale" : ""}`} />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold border shrink-0 ${!u.isActive ? "bg-red-100 text-red-400 border-red-200" : "bg-brand-navy/5 text-brand-navy border-brand-navy/10"}`}>
                          <UserIcon size={16} />
                        </div>
                      )}
                      <div>
                        <div className={`font-bold whitespace-nowrap ${!u.isActive ? "text-gray-400 line-through" : "text-brand-navy"}`}>
                          {u.name || "Sin nombre"}
                        </div>
                        <div className="text-xs text-gray-400 font-medium flex items-center gap-1 mt-0.5">
                          <Mail size={11} className="shrink-0"/> {u.email}
                        </div>
                        {!u.isActive && (
                          <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md mt-1.5 inline-flex items-center gap-1 w-max">
                            <Ban size={10} /> SUSPENDIDO
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    {u.role === "ADMIN" ? (
                      <div>
                        <span className={`text-xs font-bold border px-2 py-0.5 rounded-md inline-block mb-1 ${!u.isActive ? "text-gray-400 bg-gray-50 border-gray-200" : "text-red-700 bg-red-50 border-red-200"}`}>🛡️ DIRECTIVA</span>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide pl-1">{u.boardPosition}</div>
                      </div>
                    ) : (
                      <span className={`text-xs font-bold border px-2 py-0.5 rounded-md ${!u.isActive ? "text-gray-400 bg-gray-50 border-gray-200" : "text-gray-600 bg-gray-100 border-gray-200"}`}>👤 Apoderado</span>
                    )}
                  </td>

                  <td className="p-4">
                    {u.students.length === 0 ? (
                      <span className={`text-[10px] font-bold border px-2 py-1 rounded flex items-center gap-1 w-fit ${!u.isActive ? "text-gray-400 bg-gray-50 border-gray-200" : "text-amber-600 bg-amber-50 border-amber-100"}`}>
                        <ShieldAlert size={12} /> Sin asignar
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {u.students.map(s => (
                          <span key={s.id} className={`text-[11px] font-bold border px-2 py-0.5 rounded-md truncate max-w-[150px] ${!u.isActive ? "text-gray-400 bg-gray-50 border-gray-200" : "text-emerald-700 bg-emerald-50 border-emerald-100"}`}>
                            🎓 {s.firstName} {s.lastName}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => startEditing(u)} disabled={processingId !== null} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="Editar">
                        <Edit2 size={16} />
                      </button>
                      
                      <button 
                        onClick={() => triggerToggleAccess(u)} 
                        disabled={processingId !== null} 
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${u.isActive ? "text-amber-500 hover:bg-amber-50" : "text-emerald-500 hover:bg-emerald-50"}`} 
                        title={u.isActive ? "Suspender Acceso" : "Reactivar Cuenta"}
                      >
                        {processingId === u.id ? <Loader2 size={16} className="animate-spin" /> : u.isActive ? <Ban size={16} /> : <UserCheck size={16} />}
                      </button>

                      <button onClick={() => triggerDelete(u)} disabled={processingId !== null} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isPending={processingId !== null} />
    </div>
  );
}