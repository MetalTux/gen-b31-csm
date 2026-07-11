// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { 
  Menu, X, Megaphone, CreditCard, Users, ShieldCheck, Wallet, Receipt, Settings, LogOut, HelpCircle
} from "lucide-react";
import Image from "next/image";

export default function Sidebar({ userRole }: { userRole: string }) {
  const [isOpen, setIsOpen] = useState(true); // Por defecto inicia abierto para una mejor UX inicial
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* 1. GATILLADOR: BOTÓN HAMBURGUESA FLOTANTE
          Sólo se renderiza si el Sidebar está completamente cerrado (isOpen === false)
          Funciona idéntico en PC, Tablets o Teléfonos Móviles */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-40 p-2.5 bg-brand-navy text-white rounded-xl shadow-xl hover:bg-opacity-95 active:scale-95 transition-all cursor-pointer animate-fade-in"
          aria-label="Abrir menú de navegación"
        >
          <Menu size={24} />
        </button>
      )}

      {/* 2. CAPA DE FONDO OSCURO (SÓLO PARA MÓVILES)
          Si el usuario abre el menú en el celular, tocar la zona externa también lo cierra */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 3. CONTENEDOR DEL SIDEBAR COMPLETAMENTE ESTÁNDAR
          Controla su visibilidad de forma física con la propiedad 'w-64' o 'w-0'
          acompañado de un overflow-hidden para ocultar el texto limpiamente */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-screen bg-brand-navy text-white flex flex-col 
          transition-all duration-300 ease-in-out shadow-2xl overflow-hidden shrink-0
          ${isOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full md:translate-x-0 md:w-0 md:shadow-none"}
          md:relative
        `}
      >
        {/* ENCABEZADO DEL MENÚ */}
        <div className="p-4 border-b border-white/10 bg-black/20 shrink-0 flex flex-col relative">
          
          {/* BOTÓN X PARA OCULTAR EL MENÚ
              Ubicado estratégicamente arriba a la derecha. Al presionarlo muta al botón de hamburguesa */}
          <div className="w-full flex justify-end mb-2">
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl text-gray-200 transition-all shadow-sm cursor-pointer"
              aria-label="Ocultar menú de navegación"
            >
              <X size={20} />
            </button>
          </div>

          {/* Logo del Colegio San Marcos */}
          <div className="relative w-24 h-28 mx-auto drop-shadow-xl mb-2">
            <Image 
              src="/logocolegio.png"
              alt="Logo Portal Apoderados Colegio San Marcos"
              fill
              className="object-contain"
              sizes="100px"
              priority
            />
          </div>
        </div>

        {/* ENLACES DE NAVEGACIÓN */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar whitespace-nowrap">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-2 px-2">
            Público General
          </p>
          
          {/* Si está en dispositivo móvil, al pulsar el enlace también se auto-oculta */}
          <Link onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }} href="/" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/") ? "bg-brand-accent text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
            <Megaphone size={18} className={isActive("/") ? "text-brand-navy" : "text-brand-accent"} />
            <span>Novedades y Anuncios</span>
          </Link>
          
          <Link onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }} href="/mis-pagos" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/mis-pagos") ? "bg-brand-accent text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
            <CreditCard size={18} className={isActive("/mis-pagos") ? "text-brand-navy" : "text-brand-accent"} />
            <span>Pagos y Transparencia</span>
          </Link>

          {userRole === "ADMIN" && (
            <>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-8 px-2 border-t border-white/10 pt-6">
                Directiva / Tesorería
              </p>
              
              {/* CORREGIDO: Removido el borde especial 'border border-white/10' y el margen 'mt-4' */}
              <Link onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }} href="/admin/configuracion" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/admin/configuracion") ? "bg-white text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <Settings size={18} className={isActive("/admin/configuracion") ? "text-brand-navy" : "text-gray-400"} />
                <span>Configurar Año Escolar</span>
              </Link>
              
              <Link onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }} href="/admin/usuarios" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/admin/usuarios") ? "bg-white text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <ShieldCheck size={18} className={isActive("/admin/usuarios") ? "text-brand-navy" : "text-gray-400"} />
                <span>Accesos y Permisos</span>
              </Link>
              
              <Link onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }} href="/admin/alumnos" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/admin/alumnos") ? "bg-white text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <Users size={18} className={isActive("/admin/alumnos") ? "text-brand-navy" : "text-gray-400"} />
                <span>Directorio Alumnos</span>
              </Link>

              <Link onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }} href="/admin/ingresos" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/admin/ingresos") ? "bg-white text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <Wallet size={18} className={isActive("/admin/ingresos") ? "text-brand-navy" : "text-gray-400"} />
                <span>Control de Ingresos</span>
              </Link>
              
              <Link onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }} href="/admin/egresos" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/admin/egresos") ? "bg-white text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <Receipt size={18} className={isActive("/admin/egresos") ? "text-brand-navy" : "text-gray-400"} />
                <span>Registro de Egresos</span>
              </Link>

              <Link onClick={() => { if (window.innerWidth < 768) setIsOpen(false); }} href="/admin/encuestas" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive("/admin/enmcuestas") ? "bg-white text-brand-navy shadow-md" : "text-gray-300 hover:bg-white/10 hover:text-white"}`}>
                <HelpCircle size={18} className={isActive("/admin/egresos") ? "text-brand-navy" : "text-gray-400"} />
                <span>Consultas y Encuestas</span>
              </Link>
            </>
          )}
        </nav>

        {/* BOTÓN CERRAR SESIÓN */}
        <div className="p-4 border-t border-white/10 shrink-0 bg-black/10">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white hover:shadow-md transition-all font-bold text-sm cursor-pointer"
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}