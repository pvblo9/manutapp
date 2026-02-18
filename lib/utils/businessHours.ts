/**
 * Cálculo de tempo em horário útil (Segunda a Sexta, 08h–18h).
 */

const START_HOUR = 8
const END_HOUR = 18

function isWeekday(d: Date): boolean {
  const day = d.getDay()
  return day >= 1 && day <= 5
}

/**
 * Retorna o número de minutos em horário útil entre duas datas.
 * Considera apenas Segunda a Sexta, 08h–18h.
 */
export function businessMinutesBetween(start: Date, end: Date): number {
  if (end <= start) return 0

  let total = 0
  const current = new Date(start.getTime())

  while (current < end) {
    if (!isWeekday(current)) {
      current.setDate(current.getDate() + 1)
      current.setHours(0, 0, 0, 0)
      continue
    }

    const dayStart = new Date(current)
    dayStart.setHours(START_HOUR, 0, 0, 0)
    const dayEnd = new Date(current)
    dayEnd.setHours(END_HOUR, 0, 0, 0)

    const rangeStart = current < dayStart ? dayStart : current
    const rangeEnd = end < dayEnd ? end : dayEnd

    if (rangeStart < rangeEnd) {
      total += (rangeEnd.getTime() - rangeStart.getTime()) / (60 * 1000)
    }

    current.setDate(current.getDate() + 1)
    current.setHours(0, 0, 0, 0)
  }

  return Math.round(total)
}

/**
 * Formata minutos em "Xh Ym" (horas e minutos).
 */
export function formatBusinessMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}
