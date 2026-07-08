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

  // Función auxiliar para saber si un link está activo
  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* 1. BOTÓN DE HAMBURGUESA (MÓVIL) - z-40 para estar visible arriba de todo en la vista móvil */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2.5 bg-brand-navy text-white rounded-lg shadow-lg hover:bg-opacity-90 active:scale-95 transition-all"
        aria-label="Abrir menú"
      >
        <Menu size={24} />
      </button>

      {/* 2. FONDO OSCURO (MÓVIL) - z-40 para estar debajo del menú pero sobre el contenido */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 3. MENÚ LATERAL (SOLUCIÓN DEFINITIVA) */}
      <aside 
        className={`
          /* Base posicionamiento estándar para todas las pantallas */
          fixed inset-y-0 left-0 z-50 w-64 bg-brand-navy text-white flex flex-col shadow-2xl h-screen
          transition-transform duration-300 ease-in-out // suave smoothness para móvil

          /* MÓVIL (<= md): el comportamiento de visibilidad se controla por translate-x puro */
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 

          /* ESCRITORIO (>= md): siempre visible, posición estática */
          md:static md:translate-x-0 md:h-screen md:flex md:w-64 md:shadow-none // Always show on desktop.
        `}
      >
        {/* Encabezado del Menú */}
        <div className="p-6 text-center border-b border-white/10 bg-black/20 relative shrink-0">
          
          {/* Logo del Colegio con fill inside relative container */}
          <div className="relative w-28 h-32 mx-auto mb-2 drop-shadow-xl hover:scale-105 transition-transform duration-300">
            <Image 
              src="/logocolegio.png"
              alt="Logo Portal Apoderados Colegio San Marcos"
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 150px"
              priority // Prioridad alta para cargar rápido
            />
          </div>
          
          {/* 4. BOTÓN DE CERRAR CORREGIDO (z-[100] extremo y type button) */}
          {/* Lo bajamos en el DOM para que se dibuje DESPUÉS de la imagen y le dimos un z-index extremo. 
              type="button" asegura que no haya conflictos de formulario. */}
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="md:hidden absolute top-3 right-3 p-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full z-[100] text-gray-200 hover:text-white transition-all cursor-pointer shadow-md"
            aria-label="Cerrar menú"
          >
            <X size={22} />
          </button>
        </div>

        {/* Enlaces de Navegación */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-2 px-2">
            Público General
          </p>
          
          {/* Auto-cierre del menú al cambiar de página en móviles con onClick={() => setIsOpen(false)} */}
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