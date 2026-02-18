import { prisma } from "@/lib/db/prisma"
import type { PreventiveFrequency } from "@prisma/client"

/**
 * Gera os agendamentos (slots) de preventiva para um equipamento no ano,
 * conforme a frequência. Cada slot é (equipmentId, year, month, period) com status PLANNED.
 * period = 1 (decêndio); um slot por ocorrência no ano.
 */
export async function generateSchedulesForYear(
  equipmentId: string,
  year: number,
  frequency: PreventiveFrequency
): Promise<number> {
  const slots: { month: number; period: number }[] = []

  switch (frequency) {
    case "ANNUAL":
      slots.push({ month: 12, period: 1 })
      break
    case "SEMIANNUAL":
      slots.push({ month: 6, period: 1 }, { month: 12, period: 1 })
      break
    case "QUARTERLY":
      slots.push(
        { month: 3, period: 1 },
        { month: 6, period: 1 },
        { month: 9, period: 1 },
        { month: 12, period: 1 }
      )
      break
    case "BIMONTHLY":
      slots.push(
        { month: 2, period: 1 },
        { month: 4, period: 1 },
        { month: 6, period: 1 },
        { month: 8, period: 1 },
        { month: 10, period: 1 },
        { month: 12, period: 1 }
      )
      break
    default:
      return 0
  }

  let created = 0
  for (const { month, period } of slots) {
    try {
      await prisma.preventiveSchedule.upsert({
        where: {
          equipmentId_year_month_period: {
            equipmentId,
            year,
            month,
            period,
          },
        },
        create: {
          equipmentId,
          year,
          month,
          period,
          status: "PLANNED",
        },
        update: {},
      })
      created++
    } catch (e) {
      console.warn("[generateSchedules] skip", equipmentId, year, month, period, e)
    }
  }
  return created
}
