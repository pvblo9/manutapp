import { prisma } from "@/lib/db/prisma"
import { NotificationType } from "@prisma/client"
import { startOfDay, endOfDay } from "date-fns"

/**
 * Para cada alerta de OS cuja data é hoje e ainda não foi entregue,
 * cria notificações OS_ALERT para os admins e para o técnico da OS,
 * e marca o alerta como entregue (notificationDelivered = true).
 */
export async function deliverDueAlerts(): Promise<void> {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  const alerts = await prisma.serviceOrderAlert.findMany({
    where: {
      alertDate: { gte: todayStart, lte: todayEnd },
      notificationDelivered: false,
    },
    include: {
      serviceOrder: {
        select: {
          id: true,
          technicianId: true,
          machine: true,
          machineCode: true,
          description: true,
        },
      },
    },
  })

  const adminIds = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  })

  for (const alert of alerts) {
    try {
      const title = "Alerta de OS"
      const message = `OS #${alert.serviceOrder.id.slice(0, 8)} - ${alert.serviceOrder.machine} / ${alert.serviceOrder.machineCode}: ${alert.description}`
      const link = `/admin?osId=${alert.serviceOrderId}`

      for (const admin of adminIds) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: NotificationType.OS_ALERT,
            title,
            message,
            link,
          },
        })
      }

      if (alert.serviceOrder.technicianId) {
        await prisma.notification.create({
          data: {
            userId: alert.serviceOrder.technicianId,
            type: NotificationType.OS_ALERT,
            title,
            message,
            link: `/operador?osId=${alert.serviceOrderId}`,
          },
        })
      }

      await prisma.serviceOrderAlert.update({
        where: { id: alert.id },
        data: { notificationDelivered: true },
      })
    } catch (e) {
      console.error("deliverDueAlerts: erro ao processar alerta", alert.id, e)
    }
  }
}
