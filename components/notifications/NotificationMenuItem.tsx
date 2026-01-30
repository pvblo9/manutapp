"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface NotificationMenuItemProps {
  onNavigate?: () => void
}

export function NotificationMenuItem({ onNavigate }: NotificationMenuItemProps) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [user, setUser] = useState<{ id: string; role: string } | null>(null)

  // Buscar usuário de forma não bloqueante
  useEffect(() => {
    if (typeof window === "undefined") return
    
    const session = localStorage.getItem("session")
    if (session) {
      try {
        const parsed = JSON.parse(session)
        if (parsed.user) {
          setUser(parsed.user)
        }
      } catch {
        // Ignorar erro
      }
    }
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    if (!user || user.role !== "ADMIN") {
      setUnreadCount(0)
      return
    }

    try {
      const response = await fetch(`/api/notifications?userId=${user.id}&unreadOnly=true`)
      
      if (!response.ok) {
        setUnreadCount(0)
        return
      }
      
      const data = await response.json()
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error("Erro ao buscar contador de notificações:", error)
      setUnreadCount(0)
    }
  }, [user])

  useEffect(() => {
    if (user && user.role === "ADMIN") {
      fetchUnreadCount()
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    } else {
      setUnreadCount(0)
    }
  }, [user, fetchUnreadCount])

  const isActive = pathname === "/admin/notificacoes"
  const showBadge = user && user.role === "ADMIN" && unreadCount > 0

  // SEMPRE renderizar - nunca retornar null
  // O componente sempre renderiza, independente do estado do usuário
  return (
    <Link
      href="/admin/notificacoes"
      className={`sidebar-item ${isActive ? "active" : ""}`}
      onClick={onNavigate}
    >
      <Bell size={20} />
      <span className="flex-1">Notificações</span>
      {showBadge && (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  )
}
