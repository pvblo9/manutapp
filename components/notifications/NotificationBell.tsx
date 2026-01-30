"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/notifications?userId=${user.id}`)
      
      if (!response.ok) {
        // Verificar rate limit primeiro (antes de tentar ler o body)
        if (response.status === 429) {
          // Rate limit - não logar como erro, apenas warning
          // Não atualizar estado - manter notificações atuais
          return
        }
        
        // Tentar ler o corpo da resposta como texto primeiro
        let errorMessage = `Erro ${response.status}: ${response.statusText}`
        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json()
            errorMessage = errorData.error || errorData.message || errorMessage
          } else {
            const text = await response.text()
            if (text) errorMessage = text
          }
        } catch (parseError) {
          // Se não conseguir parsear, usar a mensagem padrão
          console.error("Erro ao parsear resposta de erro:", parseError)
        }
        
        // Se erro 500, pode ser que a tabela não exista ainda
        if (response.status === 500) {
          console.error("Erro na API de notificações (500):", errorMessage)
          setNotifications([])
          setUnreadCount(0)
          return
        }
        
        // Para outros erros, também retornar vazio ao invés de lançar exceção
        console.error("Erro na API de notificações:", errorMessage)
        setNotifications([])
        setUnreadCount(0)
        return
      }
      
      const data = await response.json()
      
      if (data.notifications) {
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount || 0)
      } else {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("Erro ao buscar notificações:", error)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchNotifications()
      // Polling a cada 30 segundos
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user, fetchNotifications])

  const markAsRead = async (notificationId: string) => {
    // Otimistic update - atualizar UI primeiro
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))

    // Fazer requisição em background (não bloquear)
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      })

      if (!response.ok) {
        console.warn(`Falha ao marcar notificação como lida: ${response.status}`)
      }
    } catch (error: any) {
      // Ignorar erros de rede causados por navegação ou aborto
      const isNetworkError = 
        error?.name === "NetworkError" ||
        error?.name === "AbortError" ||
        error?.message?.includes("fetch") ||
        error?.message?.includes("network")
      
      if (!isNetworkError) {
        // Só logar erros que não são de rede
        console.warn("Erro ao marcar como lida (não crítico):", error)
      }
      // Não fazer nada - a UI já foi atualizada (otimistic update)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      await fetch(`/api/notifications?userId=${user.id}`, {
        method: "PUT",
      })
      
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Marcar como lida se necessário (não aguardar para não bloquear navegação)
      if (!notification.read) {
        // Fazer de forma não bloqueante para evitar NetworkError ao navegar
        markAsRead(notification.id).catch((err) => {
          // Erro silencioso - a UI já foi atualizada (otimistic update)
          if (err.name !== "AbortError" && !err.message?.includes("fetch")) {
            console.warn("Erro ao marcar como lida (não bloqueante):", err)
          }
        })
      }

      // Fechar o modal primeiro
      setIsOpen(false)
      
      // Navegar usando router do Next.js
      if (notification.link && notification.link.trim() !== "") {
        // Validar se o link é uma rota válida
        const link = notification.link.startsWith("/") 
          ? notification.link 
          : `/${notification.link}`
        
        // Pequeno delay para garantir que o modal feche antes de navegar
        setTimeout(() => {
          try {
            router.push(link)
          } catch (navError) {
            console.error("Erro ao navegar:", navError)
            // Fallback para window.location se router falhar
            window.location.href = link
          }
        }, 100)
      }
    } catch (error) {
      console.error("Erro ao processar clique na notificação:", error)
    }
  }

  // Não renderizar se não houver usuário (ainda carregando ou não autenticado)
  // Renderizar sempre, mas só mostrar badge quando tiver usuário e não estiver carregando
  const showBadge = !authLoading && user && unreadCount > 0

  return (
    <>
      <button
        onClick={() => {
          if (!authLoading && user) {
            setIsOpen(true)
          }
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Notificações"
        title="Notificações"
        disabled={authLoading || !user}
      >
        <Bell className="w-6 h-6" />
        {showBadge && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Dialog open={isOpen && !authLoading && !!user} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Notificações</DialogTitle>
                <DialogDescription>
                  {unreadCount > 0
                    ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}`
                    : "Todas as notificações foram lidas"}
                </DialogDescription>
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Marcar todas como lidas
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto mt-4 space-y-2">
            {isLoading ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Carregando...
              </p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhuma notificação
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    notification.read
                      ? "bg-gray-50 border-gray-200"
                      : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`text-sm font-semibold ${
                          notification.read ? "text-gray-700" : "text-gray-900"
                        }`}
                      >
                        {notification.title}
                      </h4>
                      <p
                        className={`text-xs mt-1 ${
                          notification.read ? "text-gray-600" : "text-gray-700"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(
                          new Date(notification.createdAt),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
