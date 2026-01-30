import { NotificationType } from "@prisma/client"

/**
 * Helper para criar notificações
 */
export async function createNotification(data: {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}) {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      console.error("Erro ao criar notificação:", await response.text())
    }
  } catch (error) {
    console.error("Erro ao criar notificação:", error)
  }
}

/**
 * Criar notificações para todos os admins
 */
export async function notifyAllAdmins(data: {
  type: NotificationType
  title: string
  message: string
  link?: string
}) {
  try {
    // Buscar todos os admins
    const response = await fetch("/api/users")
    const users = await response.json()
    
    const admins = users.filter((user: { role: string }) => user.role === "ADMIN")
    
    // Criar notificação para cada admin
    await Promise.all(
      admins.map((admin: { id: string }) =>
        createNotification({
          ...data,
          userId: admin.id,
        })
      )
    )
  } catch (error) {
    console.error("Erro ao notificar admins:", error)
  }
}
