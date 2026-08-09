// src/app/admin/alumnos/AdminStudentClient.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  createStudent, updateStudent, linkParentToStudent, unlinkParentFromStudent 
} from "@/app/actions/student";
import { 
  Loader2, UserPlus, Link as LinkIcon, Mail, X, Users,
  CheckCircle2, XCircle, Unlink, Pencil, UserMinus, UserCheck, ChevronDown, Hash, Plus, Search
} from "lucide-react";
import AlertModal, { AlertType } from "@/components/AlertModal";
import ConfirmModal from "@/components/ConfirmModal";

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
  orderNumber: number;
  parents: Parent[];
}

interface AdminStudentClientProps {
  students: Student[];
  availableParents: Parent[];
}

const MONTHS_MAP: { [key: number]: string } = {
  1: "Marzo", 2: "Abril", 3: "Mayo", 4: "Junio", 5: "Julio",
  6: "Agosto", 7: "Septiembre", 8: "Octubre", 9: "Noviembre", 10: "Diciembre"
};

// --- FUNCIÓN AUXILIAR PARA IGNORAR TILDES ---
const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default function AdminStudentClient({ students, availableParents }: AdminStudentClientProps) {
  const router = useRouter(); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVOS" | "RETIRADOS">("ACTIVOS");
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

  // Estados Búsqueda y ComboBox
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [parentSearchTerm, setParentSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); 
  const [highlightedIndex, setHighlightedIndex] = useState(-1); 

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Estados Formularios
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [startQuota, setStartQuota] = useState("1"); 
  const [orderNumber, setOrderNumber] = useState(""); 

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editStartQuota, setEditStartQuota] = useState("1");
  const [editOrderNumber, setEditOrderNumber] = useState("");

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [parentId, setParentId] = useState("");

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; type: AlertType; title: string; message: string; }>({ isOpen: false, type: "success", title: "", message: "" });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => Promise<void>; }>({ isOpen: false, title: "", message: "", onConfirm: async () => {} });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (highlightedIndex >= 0) {
      const el = document.getElementById(`parent-option-${highlightedIndex}`);
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  // --- 1. LÓGICA DE FILTRADO ALUMNOS SIN TILDES ---
  const filteredStudents = students.filter(s => {
    const matchesTab = activeTab === "ACTIVOS" ? s.isActive : !s.isActive;
    const normalizedSearch = removeAccents(studentSearchTerm.toLowerCase());
    const normalizedName = removeAccents(`${s.firstName} ${s.lastName}`.toLowerCase());
    const matchesSearch = normalizedName.includes(normalizedSearch);
    return matchesTab && matchesSearch;
  });

  // --- 2. LÓGICA DE FILTRADO COMBOBOX APODERADOS SIN TILDES ---
  const unlinkedParents = availableParents.filter(
    (ap) => !selectedStudent?.parents.some((linkedParent) => linkedParent.id === ap.id)
  );

  const currentlySelectedParent = unlinkedParents.find(p => p.id === parentId);
  const selectedParentDisplay = currentlySelectedParent 
    ? (currentlySelectedParent.name ? `${currentlySelectedParent.name} (${currentlySelectedParent.email})` : currentlySelectedParent.email || "")
    : "";

  const effectiveSearchTerm = (parentId && parentSearchTerm === selectedParentDisplay) ? "" : parentSearchTerm;
  const normalizedParentSearch = removeAccents(effectiveSearchTerm.toLowerCase());
  
  const filteredUnlinkedParents = unlinkedParents.filter(p => {
    const nameMatch = p.name ? removeAccents(p.name.toLowerCase()).includes(normalizedParentSearch) : false;
    const emailMatch = p.email ? removeAccents(p.email.toLowerCase()).includes(normalizedParentSearch) : false;
    return nameMatch || emailMatch;
  });

  const handleSelectParent = (parent: Parent) => {
    setParentId(parent.id);
    setParentSearchTerm(parent.name ? `${parent.name} (${parent.email})` : parent.email || "");
    setIsDropdownOpen(false); setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setIsDropdownOpen(true); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault(); setHighlightedIndex(prev => prev < filteredUnlinkedParents.length - 1 ? prev + 1 : prev);
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && filteredUnlinkedParents[highlightedIndex]) {
        e.preventDefault(); handleSelectParent(filteredUnlinkedParents[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !orderNumber || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createStudent({ firstName, lastName, startQuotaNumber: parseInt(startQuota), orderNumber: parseInt(orderNumber) });
      setFirstName(""); setLastName(""); setStartQuota("1"); setOrderNumber("");
      setAlertConfig({ isOpen: true, type: "success", title: "Alumno Matriculado", message: "El registro ha sido creado exitosamente." });
      setActiveTab("ACTIVOS"); setIsMobileFormOpen(false); router.refresh(); 
    } catch (error) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: error instanceof Error ? error.message : "Error." });
    } finally { setIsSubmitting(false); }
  };

  const activateEditMode = (student: Student) => {
    setEditingStudent(student); setEditFirstName(student.firstName); setEditLastName(student.lastName);
    setEditStartQuota(student.startQuotaNumber.toString()); setEditOrderNumber(student.orderNumber.toString());
    setIsMobileFormOpen(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEditMode = () => { setEditingStudent(null); setIsMobileFormOpen(false); };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editFirstName || !editLastName || !editOrderNumber || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateStudent({
        id: editingStudent.id, firstName: editFirstName, lastName: editLastName,
        startQuotaNumber: parseInt(editStartQuota), isActive: editingStudent.isActive, orderNumber: parseInt(editOrderNumber)
      });
      setEditingStudent(null); setIsMobileFormOpen(false);
      setAlertConfig({ isOpen: true, type: "success", title: "Actualizado", message: "La información se guardó correctamente." });
      router.refresh();
    } catch (error) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: error instanceof Error ? error.message : "Error." });
    } finally { setIsSubmitting(false); }
  };

  const openLinkModal = (student: Student) => {
    setSelectedStudent(student); setParentId(""); setParentSearchTerm(""); setIsDropdownOpen(false); setHighlightedIndex(-1);
    setLinkModalOpen(true); router.refresh(); 
  };

  const handleLinkParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !parentId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await linkParentToStudent(selectedStudent.id, parentId);
      setParentId(""); setLinkModalOpen(false);
      setAlertConfig({ isOpen: true, type: "success", title: "Vinculado", message: "Asignado correctamente." });
      router.refresh();
    } catch (error) {
      setAlertConfig({ isOpen: true, type: "error", title: "Error", message: error instanceof Error ? error.message : "Error." });
    } finally { setIsSubmitting(false); }
  };

  const triggerUnlink = (studentId: string, parentId: string, parentEmailStr: string) => {
    setConfirmConfig({
      isOpen: true, title: "¿Desvincular Apoderado?", message: `¿Quitar acceso a ${parentEmailStr}?`,
      onConfirm: async () => {
        setProcessingId(parentId);
        try {
          await unlinkParentFromStudent(studentId, parentId);
          setConfirmConfig(prev => ({ ...prev, isOpen: false })); router.refresh();
        } catch (error) {
          setAlertConfig({ isOpen: true, type: "error", title: "Error", message: error instanceof Error ? error.message : "Error." });
        } finally { setProcessingId(null); }
      }
    });
  };

  const triggerToggleStatus = (student: Student) => {
    const newStatus = !student.isActive;
    setConfirmConfig({
      isOpen: true, title: `¿${newStatus ? "Dar de Alta" : "Dar de Baja"} a ${student.firstName}?`,
      message: newStatus ? "Se reanudarán sus cobros." : "Será movido a 'Retirados'.",
      onConfirm: async () => {
        setProcessingId(student.id);
        try {
          await updateStudent({
            id: student.id, firstName: student.firstName, lastName: student.lastName,
            startQuotaNumber: student.startQuotaNumber, isActive: newStatus, orderNumber: student.orderNumber
          });
          setConfirmConfig(prev => ({ ...prev, isOpen: false })); setActiveTab(newStatus ? "ACTIVOS" : "RETIRADOS");
          if (editingStudent?.id === student.id) cancelEditMode(); router.refresh();
        } catch (error) {
          setAlertConfig({ isOpen: true, type: "error", title: "Error", message: error instanceof Error ? error.message : "Error." });
        } finally { setProcessingId(null); }
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      {/* --- COLUMNA IZQUIERDA: FORMULARIOS --- */}
      <div className="lg:col-span-1 h-fit lg:sticky lg:top-6 flex flex-col gap-4">
        <button type="button" onClick={() => setIsMobileFormOpen(!isMobileFormOpen)} className="flex lg:hidden! w-full bg-brand-navy text-white py-3 rounded-xl font-bold items-center justify-center gap-2 shadow-sm cursor-pointer">
          {isMobileFormOpen ? <X size={18} /> : <Plus size={18} />}
          {isMobileFormOpen ? "Ocultar Formulario" : (editingStudent ? "Continuar Editando" : "Matricular Nuevo Alumno")}
        </button>

        <div className={`lg:block! ${isMobileFormOpen ? 'block' : 'hidden'}`}>
          {editingStudent ? (
            <form onSubmit={handleEditStudent} className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 shadow-sm space-y-5 relative animate-fade-in">
              <button type="button" onClick={cancelEditMode} className="absolute top-4 right-4 text-gray-400 hover:bg-white hover:text-gray-700 p-1.5 rounded-full transition-colors cursor-pointer"><X size={18} /></button>
              <div><h3 className="text-lg font-bold text-brand-navy flex items-center gap-2"><Pencil size={18} className="text-blue-500" /> Editar Alumno</h3></div>
              <div className="space-y-4">
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5"><Hash size={13} className="text-blue-500"/> N° de Lista</label><input type="number" value={editOrderNumber} onChange={e => setEditOrderNumber(e.target.value)} required min="1" className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-bold bg-white" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Nombres</label><input type="text" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Apellidos</label><input type="text" value={editLastName} onChange={e => setEditLastName(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white" /></div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Mes de Ingreso</label>
                  <div className="relative">
                    <select value={editStartQuota} onChange={e => setEditStartQuota(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white appearance-none cursor-pointer">
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (<option key={num} value={num}>{MONTHS_MAP[num]} (Cuota {num})</option>))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-md hover:bg-blue-700 disabled:bg-blue-300 flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Guardar Cambios"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateStudent} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5 animate-fade-in">
              <div><h3 className="text-lg font-bold text-brand-navy flex items-center gap-2"><UserPlus size={20} className="text-brand-accent" /> Matricular Alumno</h3></div>
              <div className="space-y-4">
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5"><Hash size={13} className="text-brand-accent"/> N° de Lista</label><input type="number" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="Ej: 1" required min="1" className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 font-bold" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Nombres</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ej: Juan Pablo" required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase">Apellidos</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Ej: Pérez González" required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700" /></div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Mes de Ingreso</label>
                  <div className="relative">
                    <select value={startQuota} onChange={e => setStartQuota(e.target.value)} required className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent text-gray-700 bg-white appearance-none cursor-pointer">
                      {[1,2,3,4,5,6,7,8,9,10].map(num => (<option key={num} value={num}>{MONTHS_MAP[num]} (Cuota {num})</option>))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-2.5 bg-brand-navy text-white font-bold rounded-xl text-xs shadow-md hover:bg-opacity-95 disabled:bg-gray-100 disabled:text-gray-400 flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} {isSubmitting ? "Guardando..." : "Crear Registro"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* --- COLUMNA DERECHA: DIRECTORIO --- */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col animate-fade-in">
        <div className="bg-gray-50 border-b border-gray-100">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-bold text-sm text-brand-navy"><Users size={18} className="text-brand-accent" /> Directorio del Curso</div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Buscar alumno..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-accent bg-white" />
            </div>
          </div>
          <div className="flex px-4 gap-4 overflow-x-auto">
            <button onClick={() => setActiveTab("ACTIVOS")} className={`py-2 px-1 text-sm font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === "ACTIVOS" ? "border-brand-navy text-brand-navy" : "border-transparent text-gray-400 hover:text-gray-600"}`}>Alumnos Activos ({students.filter(s => s.isActive).length})</button>
            <button onClick={() => setActiveTab("RETIRADOS")} className={`py-2 px-1 text-sm font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${activeTab === "RETIRADOS" ? "border-red-500 text-red-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>Retirados / Bajas ({students.filter(s => !s.isActive).length})</button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-gray-400 italic text-sm">{studentSearchTerm ? "No se encontraron coincidencias." : "No hay alumnos en este listado."}</div>
          ) : (
            <table className="w-full text-left border-collapse text-sm min-w-[700px]">
              <thead className="bg-white text-gray-400 font-bold border-b border-gray-100">
                <tr><th className="p-4 w-[60px] text-center">N°</th><th className="p-4">Alumno</th><th className="p-4">Ingreso</th><th className="p-4 w-[280px]">Apoderado(s)</th><th className="p-4 text-center">Gestión</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-600">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 align-top text-center"><span className="text-sm font-black text-brand-navy bg-gray-100 px-3 py-1.5 rounded-lg inline-block mt-1 min-w-[40px]">{student.orderNumber}</span></td>
                    <td className="p-4 align-top">
                      <div className="font-bold text-brand-navy">{student.lastName}, {student.firstName}</div>
                      <div className="flex items-center mt-1">
                        {student.isActive ? <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1 w-max"><CheckCircle2 size={10}/> Activo</span> : <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 flex items-center gap-1 w-max"><XCircle size={10}/> Retirado</span>}
                      </div>
                    </td>
                    <td className="p-4 font-semibold align-top"><span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs inline-block mt-1">{MONTHS_MAP[student.startQuotaNumber]}</span></td>
                    <td className="p-4 align-top">
                      {student.parents.length === 0 ? (
                        <span className="text-[11px] uppercase tracking-wide font-bold bg-amber-50 text-amber-600 px-2 py-1 rounded-md border border-amber-100 inline-block mt-1">Sin Asignar</span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {student.parents.map(parent => (
                            <div key={parent.id} className="flex items-start justify-between bg-white border border-gray-200 shadow-sm px-3 py-2 rounded-xl w-full group">
                              <div className="flex flex-col min-w-0 pr-2">
                                {parent.name && <span className="text-xs font-bold text-brand-navy truncate">{parent.name}</span>}
                                <span className={`text-[11px] text-gray-500 flex items-center gap-1.5 truncate mt-0.5 ${!parent.name ? 'font-bold text-brand-navy' : ''}`}><Mail size={12} className="shrink-0 text-brand-accent"/>{parent.email}</span>
                              </div>
                              <button onClick={() => triggerUnlink(student.id, parent.id, parent.email || '')} disabled={processingId !== null} className="text-gray-300 hover:text-red-500 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity cursor-pointer shrink-0 mt-0.5"><Loader2 size={14} className={processingId === parent.id ? "animate-spin" : "hidden"} />{processingId !== parent.id && <Unlink size={14} />}</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <button onClick={() => activateEditMode(student)} className="p-2 text-gray-400 hover:text-brand-navy hover:bg-gray-100 rounded-xl transition-colors cursor-pointer" title="Editar Información"><Pencil size={16} /></button>
                        <button onClick={() => openLinkModal(student)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer" title="Vincular Apoderado"><LinkIcon size={16} /></button>
                        <button onClick={() => triggerToggleStatus(student)} disabled={processingId === student.id} className={`p-2 rounded-xl transition-colors cursor-pointer ${student.isActive ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"}`} title={student.isActive ? "Dar de Baja (Retirar)" : "Dar de Alta (Reintegrar)"}>{processingId === student.id ? <Loader2 size={16} className="animate-spin" /> : student.isActive ? <UserMinus size={16} /> : <UserCheck size={16} />}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- MODAL VINCULAR APODERADO --- */}
      {linkModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => { setLinkModalOpen(false); setParentId(""); setParentSearchTerm(""); setIsDropdownOpen(false); setHighlightedIndex(-1); }} className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-1.5 rounded-full transition-colors cursor-pointer"><X size={18} /></button>
            <div className="text-center mb-6">
              <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><LinkIcon size={24} className="text-blue-500" /></div>
              <h3 className="text-xl font-black text-brand-navy">Vincular Apoderado</h3>
              <p className="text-sm text-gray-500 mt-1">Asigna responsables a <strong className="text-brand-navy">{selectedStudent.firstName} {selectedStudent.lastName}</strong>.</p>
            </div>

            <form onSubmit={handleLinkParent} className="space-y-4">
              <div className="space-y-1 relative" ref={dropdownRef}>
                <label className="text-xs font-bold text-gray-500 uppercase">Buscar y Seleccionar</label>
                {unlinkedParents.length === 0 ? (
                  <div className="text-sm text-center p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 italic">No hay más apoderados disponibles.</div>
                ) : (
                  <div className="relative">
                    <div className="relative flex items-center border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-blue-500">
                      <Search size={16} className="absolute left-3 text-gray-400" />
                      <input
                        type="text" placeholder="Escribe un nombre o correo..." value={parentSearchTerm}
                        onChange={(e) => { setParentSearchTerm(e.target.value); setIsDropdownOpen(true); if (parentId) setParentId(""); setHighlightedIndex(-1); }}
                        onFocus={() => setIsDropdownOpen(true)} onKeyDown={handleKeyDown}
                        className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl focus:outline-none text-gray-700 bg-transparent"
                      />
                      <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer">
                        <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredUnlinkedParents.length === 0 ? (
                          <div className="p-3 text-xs text-gray-500 text-center italic">No se encontraron resultados</div>
                        ) : (
                          filteredUnlinkedParents.map((parent, index) => (
                            <div 
                              key={parent.id} id={`parent-option-${index}`}
                              onMouseDown={() => handleSelectParent(parent)} onMouseEnter={() => setHighlightedIndex(index)}
                              className={`p-3 text-sm cursor-pointer border-b border-gray-50 transition-colors ${(parentId === parent.id || highlightedIndex === index) ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-700 hover:bg-gray-50"}`}
                            >
                              {parent.name ? (
                                <div className="flex flex-col"><span>{parent.name}</span><span className="text-[10px] text-gray-400 font-medium">{parent.email}</span></div>
                              ) : (<span>{parent.email}</span>)}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button type="submit" disabled={isSubmitting || !parentId} className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-md hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 flex justify-center items-center gap-2 mt-2">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Vincular a la Cuenta"}
              </button>
            </form>
          </div>
        </div>
      )}

      <AlertModal isOpen={alertConfig.isOpen} type={alertConfig.type} title={alertConfig.title} message={alertConfig.message} onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))} />
      <ConfirmModal isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} isPending={processingId !== null} />
    </div>
  );
}