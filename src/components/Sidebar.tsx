// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { 
  Menu, 
  X, 
  Megaphone, 
  CreditCard, 
  Users, 
  ShieldCheck, 
  Wallet, 
  Receipt, 
  Settings,
  LogOut
} from "lucide-react";
import Image from "next/image";

export default function Sidebar({ userRole }: { userRole: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* 1. BOTÓN DE HAMBURGUESA (MÓVIL) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2.5 bg-brand-navy text-white rounded-lg shadow-lg hover:bg-opacity-90 active:scale-95 transition-all"
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      {/* 2. FONDO OSCURO EN MÓVIL (CIERRA AL TOCAR FUERA) */}
      {isOpen && (
        <div 
          className="hidden md:fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 3. MENÚ LATERAL (SOLUCIÓN ANULADORA DE BUGS) */}
      <aside 
        className={`
          /* Posicionamiento base para pantallas */
          fixed inset-y-0 left-0 z-50 w-64 bg-brand-navy text-white flex-col shadow-2xl h-screen
          
          /* LÓGICA MAESTRA INTERRUPTORA: 
             Si está abierto: se muestra (flex).
             Si está cerrado: se oculta por completo en móvil (hidden) pero se fuerza en PC (md:flex) 
          */
          ${isOpen ? "flex" : "md:hidden flex"}
        `}
      >
        {/* Encabezado del Menú */}
        <div className="p-4 border-b border-white/10 bg-black/20 shrink-0 flex flex-col">
          
          {/* Fila para el Botón de Cerrar (Solo visible en Móvil) */}
          <div className="w-full flex justify-end md:hidden mb-2">
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl text-gray-200 transition-all shadow-sm"
              aria-label="Cerrar menú"
            >
              <X size={22} />
            </button>
          </div>

          {/* Logo del Colegio */}
          <div className="relative w-24 h-28 mx-auto drop-shadow-xl mb-2">
            <Image 
              src="/logocolegio.png"
              alt="Logo Portal Apoderados Colegio San Marcos"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 150px"
              priority
            />
          </div>
        </div>

        {/* Enlaces de Navegación */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-2 px-2">
            Público General
          </p>
          
          <Link onClick={() => setIsOpen(false)} href="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/") ? "bg-brand-accent text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
            <Megaphone size={18} className={isActive("/") ? "text-brand-navy" : "text-brand-accent"} />
            Novedades y Anuncios
          </Link>
          
          <Link onClick={() => setIsOpen(false)} href="/mis-pagos" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/mis-pagos") ? "bg-brand-accent text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
            <CreditCard size={18} className={isActive("/mis-pagos") ? "text-brand-navy" : "text-brand-accent"} />
            Pagos y Transparencia
          </Link>

          {userRole === "ADMIN" && (
            <>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-8 px-2 border-t border-white/10 pt-6">
                Directiva / Tesorería
              </p>
              
              <Link onClick={() => setIsOpen(false)} href="/admin/configuracion" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mt-4 border border-white/10 ${isActive("/admin/configuracion") ? "bg-white text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <Settings size={18} className={isActive("/admin/configuracion") ? "text-brand-navy" : "text-gray-400"} />
                Configurar Año Escolar
              </Link>
              
              <Link onClick={() => setIsOpen(false)} href="/admin/usuarios" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/admin/usuarios") ? "bg-white text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <ShieldCheck size={18} className={isActive("/admin/usuarios") ? "text-brand-navy" : "text-gray-400"} />
                Accesos y Permisos
              </Link>
              
              <Link onClick={() => setIsOpen(false)} href="/admin/alumnos" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/admin/alumnos") ? "bg-white text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <Users size={18} className={isActive("/admin/alumnos") ? "text-brand-navy" : "text-gray-400"} />
                Directorio Alumnos
              </Link>

              <Link onClick={() => setIsOpen(false)} href="/admin/ingresos" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/admin/ingresos") ? "bg-white text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <Wallet size={18} className={isActive("/admin/ingresos") ? "text-brand-navy" : "text-gray-400"} />
                Control de Ingresos
              </Link>
              
              <Link onClick={() => setIsOpen(false)} href="/admin/egresos" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/admin/egresos") ? "bg-white text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <Receipt size={18} className={isActive("/admin/egresos") ? "text-brand-navy" : "text-gray-400"} />
                Registro de Egresos
              </Link>
            </>
          )}
        </nav>

        {/* Botón de Cerrar Sesión */}
        <div className="p-4 border-t border-white/10 shrink-0 bg-black/10">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white hover:shadow-md transition-all font-bold text-sm"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}