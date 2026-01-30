"use client"

import { useState } from "react"
import { Home, ClipboardList, Settings, BarChart3, LogOut, Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { NotificationMenuItem } from "@/components/notifications/NotificationMenuItem"

export function AppLayout({
  children,
  userRole,
}: {
  children: React.ReactNode
  userRole: "ADMIN" | "OPERATOR"
}) {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
  }

  const isActive = (path: string) => pathname === path

  return (
    <div className="min-h-screen">
      {/* Botão de menu mobile */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-md border border-gray-200"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay para fechar sidebar em mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <h1 className="font-display font-bold text-xl text-gray-900">ManutApp</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {userRole === "OPERATOR" ? (
            <>
              <Link
                href="/operador"
                className={`sidebar-item ${isActive("/operador") ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Home size={20} />
                <span>Dashboard</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/admin"
                className={`sidebar-item ${isActive("/admin") && !pathname.includes("dashboard") && !pathname.includes("configuracoes") && !pathname.includes("notificacoes") ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <ClipboardList size={20} />
                <span>Ordens de Serviço</span>
              </Link>
              <Link
                href="/admin/dashboard"
                className={`sidebar-item ${isActive("/admin/dashboard") ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <BarChart3 size={20} />
                <span>Relatórios</span>
              </Link>
              <Link
                href="/admin/configuracoes"
                className={`sidebar-item ${isActive("/admin/configuracoes") ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Settings size={20} />
                <span>Configurações</span>
              </Link>
              <NotificationMenuItem onNavigate={() => setSidebarOpen(false)} />
            </>
          )}
        </nav>

        <button onClick={handleLogout} className="sidebar-item w-full">
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </aside>

      {/* Header com notificações */}
      <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-30 flex items-center justify-end px-4 lg:px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </header>

      <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-20">{children}</main>
    </div>
  )
}
