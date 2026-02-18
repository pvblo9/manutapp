import { prisma } from "@/lib/db/prisma"
import { NotificationType } from "@prisma/client"
import { addDays, startOfDay } from "date-fns"

/**
 * Envia notificações de preventivas: em 7 dias, hoje e atrasadas.
 * Chamado no GET de notificações (como deliverDueAlerts).
 * Verifica se já existe notificação criada HOJE antes de criar nova para evitar duplicatas.
 */
export async function deliverPreventiveAlerts(): Promise<void> {
  const now = new Date()
  const today = startOfDay(now)
  const in7Days = addDays(today, 7)
  const in7DaysEnd = addDays(in7Days, 1)

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  })

  // Preventivas para daqui 7 dias (INTERNAL) - notificar técnico e admins
  const upcoming = await prisma.preventiveSchedule.findMany({
    where: {
      scheduledDate: { gte: in7Days, lt: in7DaysEnd },
      status: "SCHEDULED",
      assignedType: "INTERNAL",
      technicianId: { not: null },
    },
    include: { equipment: true, technician: { select: { id: true, name: true } } },
  })

  for (const s of upcoming) {
    if (s.technicianId) {
      try {
        // Verificar se já existe notificação criada hoje para esta preventiva
        const message = `${s.equipment.name} - Data: ${s.scheduledDate?.toLocaleDateString("pt-BR")}`
        const existingToday = await prisma.notification.findFirst({
          where: {
            userId: s.technicianId,
            type: NotificationType.PREVENTIVE_DUE_SOON,
            createdAt: { gte: today },
            message,
          },
        })

        if (!existingToday) {
          await prisma.notification.create({
            data: {
              userId: s.technicianId,
              type: NotificationType.PREVENTIVE_DUE_SOON,
              title: "Manutenção preventiva próxima",
              message,
              link: "/operador/preventivas",
            },
          })
        }
      } catch (e) {
        console.warn("preventiveAlerts: PREVENTIVE_DUE_SOON técnico", e)
      }
    }
    for (const admin of admins) {
      try {
        // Verificar se já existe notificação criada hoje para esta preventiva
        const message = `${s.equipment.name} - Técnico: ${s.technician?.name ?? "-"}`
        const existingToday = await prisma.notification.findFirst({
          where: {
            userId: admin.id,
            type: NotificationType.PREVENTIVE_DUE_SOON,
            createdAt: { gte: today },
            message,
          },
        })

        if (!existingToday) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: NotificationType.PREVENTIVE_DUE_SOON,
              title: "Manutenção preventiva próxima",
              message,
              link: "/admin/preventivas",
            },
          })
        }
      } catch (e) {
        console.warn("preventiveAlerts: PREVENTIVE_DUE_SOON admin", e)
      }
    }
  }

  // Preventivas HOJE (INTERNAL) - notificar técnico
  // Verificar se já existe notificação criada hoje para evitar duplicatas
  const todayStart = today
  const todayEnd = addDays(today, 1)
  const todaySchedules = await prisma.preventiveSchedule.findMany({
    where: {
      scheduledDate: { gte: todayStart, lt: todayEnd },
      status: "SCHEDULED",
      assignedType: "INTERNAL",
      technicianId: { not: null },
    },
    include: { equipment: true },
  })

  for (const s of todaySchedules) {
    if (s.technicianId) {
      try {
        // Verificar se já existe notificação criada hoje para esta preventiva
        const existingToday = await prisma.notification.findFirst({
          where: {
            userId: s.technicianId,
            type: NotificationType.PREVENTIVE_DUE_TODAY,
            createdAt: { gte: todayStart },
            message: s.equipment.name,
          },
        })

        if (!existingToday) {
          await prisma.notification.create({
            data: {
              userId: s.technicianId,
              type: NotificationType.PREVENTIVE_DUE_TODAY,
              title: "Manutenção preventiva HOJE",
              message: s.equipment.name,
              link: "/operador/preventivas",
            },
          })
        }
      } catch (e) {
        console.warn("preventiveAlerts: PREVENTIVE_DUE_TODAY", e)
      }
    }
  }

  // Preventivas ATRASADAS (scheduledDate < hoje, ainda SCHEDULED) - notificar admins
  const overdue = await prisma.preventiveSchedule.findMany({
    where: {
      scheduledDate: { lt: today },
      status: "SCHEDULED",
    },
    include: { equipment: true },
  })

  for (const s of overdue) {
    for (const admin of admins) {
      try {
        // Verificar se já existe notificação criada hoje para esta preventiva atrasada
        const message = `${s.equipment.name} - Venceu em ${s.scheduledDate?.toLocaleDateString("pt-BR")}`
        const existingToday = await prisma.notification.findFirst({
          where: {
            userId: admin.id,
            type: NotificationType.PREVENTIVE_OVERDUE,
            createdAt: { gte: today },
            message,
          },
        })

        if (!existingToday) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: NotificationType.PREVENTIVE_OVERDUE,
              title: "Manutenção preventiva ATRASADA",
              message,
              link: "/admin/preventivas",
            },
          })
        }
      } catch (e) {
        console.warn("preventiveAlerts: PREVENTIVE_OVERDUE", e)
      }
    }
  }
}
