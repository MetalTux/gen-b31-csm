// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Sidebar({ userRole }: { userRole: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* BOTÓN DE HAMBURGUESA (Solo visible en móviles) */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-brand-navy text-white rounded-lg shadow-md"
      >
        <Menu size={24} />
      </button>

      {/* FONDO OSCURO PARA MÓVILES (Cierra el menú al hacer clic fuera) */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* CONTENEDOR DEL MENÚ */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-brand-navy text-white flex flex-col shadow-xl transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}  /* Oculto/Visible en móvil */
          md:relative md:translate-x-0                        /* Siempre visible y anclado en PC */
        `}
      >
        {/* Encabezado del Menú */}
        <div className="p-6 text-center border-b border-brand-navy/50 bg-black/10 relative">
          {/* Botón de Cerrar (Solo visible en móviles) */}
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden absolute top-4 right-4 text-white hover:text-brand-accent"
          >
            <X size={20} />
          </button>

          <div className="w-12 h-12 bg-white text-brand-navy rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
            CSM
          </div>
          <h2 className="text-sm font-bold text-brand-accent tracking-wider uppercase">
            Portal Apoderados
          </h2>
        </div>

        {/* Enlaces de Navegación (El flex-1 empuja el botón de cerrar sesión hacia abajo) */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">
            General
          </p>
          <Link onClick={() => setIsOpen(false)} href="/" className="block px-4 py-2 rounded-lg hover:bg-brand-light hover:text-brand-navy transition-colors">
            📢 Novedades
          </Link>
          <Link onClick={() => setIsOpen(false)} href="/mis-pagos" className="block px-4 py-2 rounded-lg hover:bg-brand-light hover:text-brand-navy transition-colors">
            💳 Mis Pagos
          </Link>
          <Link onClick={() => setIsOpen(false)} href="/transparencia" className="block px-4 py-2 rounded-lg hover:bg-brand-light hover:text-brand-navy transition-colors">
            📊 Transparencia
          </Link>

          {userRole === "ADMIN" && (
            <>
              <p className="text-xs font-semibold text-brand-accent uppercase tracking-wider mb-2 mt-6">
                Administración
              </p>
              <Link onClick={() => setIsOpen(false)} href="/admin/familias" className="block px-4 py-2 rounded-lg hover:bg-brand-light hover:text-brand-navy transition-colors">
                👥 Gestión Familias
              </Link>
              <Link onClick={() => setIsOpen(false)} href="/admin/ingresos" className="block px-4 py-2 rounded-lg hover:bg-brand-light hover:text-brand-navy transition-colors">
                💰 Control Ingresos
              </Link>
              <Link onClick={() => setIsOpen(false)} href="/admin/gastos" className="block px-4 py-2 rounded-lg hover:bg-brand-light hover:text-brand-navy transition-colors">
                🛒 Registro Gastos
              </Link>
              <Link onClick={() => setIsOpen(false)} href="/admin/configuracion" className="block px-4 py-2 rounded-lg hover:bg-brand-light hover:text-brand-navy transition-colors">
                ⚙️ Configuración Anual
              </Link>
            </>
          )}
        </nav>

        {/* Botón de Cerrar Sesión (Ahora siempre visible abajo) */}
        <div className="p-4 border-t border-white/10 shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full px-4 py-2 bg-brand-red text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}