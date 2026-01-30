"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { AppLayout } from "@/components/layout/AppLayout"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

export default function NotificacoesPage() {
  const { user, isLoading } = useAuth("ADMIN")
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    try {
      setIsLoadingNotifications(true)
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
      setIsLoadingNotifications(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchNotifications()
      // Atualizar a cada 30 segundos
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
        // Fazer de forma não bloqueante
        markAsRead(notification.id).catch((err) => {
          console.error("Erro ao marcar como lida (não bloqueante):", err)
        })
      }

      // Navegar usando router do Next.js
      if (notification.link && notification.link.trim() !== "") {
        // Validar se o link é uma rota válida
        const link = notification.link.startsWith("/") 
          ? notification.link 
          : `/${notification.link}`
        
        try {
          router.push(link)
        } catch (navError) {
          console.error("Erro ao navegar:", navError)
          // Fallback para window.location se router falhar
          window.location.href = link
        }
      }
    } catch (error) {
      console.error("Erro ao processar clique na notificação:", error)
    }
  }

  if (isLoading || !user) {
    return (
      <AppLayout userRole="ADMIN">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout userRole="ADMIN">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
              Notificações
            </h1>
            <p className="text-gray-600">
              {unreadCount > 0
                ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}`
                : "Todas as notificações foram lidas"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {isLoadingNotifications ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-gray-500">Carregando notificações...</p>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-gray-500 text-lg">
                Nenhuma notificação
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  notification.read
                    ? "bg-white border-gray-200"
                    : "bg-blue-50 border-blue-200 shadow-sm"
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`text-lg font-semibold ${
                            notification.read ? "text-gray-700" : "text-gray-900"
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p
                        className={`text-sm ${
                          notification.read ? "text-gray-600" : "text-gray-700"
                        } mb-2`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(
                          new Date(notification.createdAt),
                          "dd/MM/yyyy 'às' HH:mm",
                          { locale: ptBR }
                        )}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notification.id)
                        }}
                        className="flex-shrink-0"
                      >
                        Marcar como lida
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
