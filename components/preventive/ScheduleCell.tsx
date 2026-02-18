"use client"

import { cn } from "@/lib/utils"
import type { PreventiveEquipment } from "@prisma/client"
import type { PreventiveStatus } from "@prisma/client"

type ScheduleLike = {
  status: PreventiveStatus
  assignedType?: string | null
  technician?: { name?: string } | null
}

interface ScheduleCellProps {
  schedule?: ScheduleLike | null
  equipment: PreventiveEquipment
  year: number
  month: number
  period: number
  onClick: () => void
}

const statusClass: Record<PreventiveStatus, string> = {
  PLANNED: "bg-gray-300",
  SCHEDULED: "bg-yellow-400",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-green-500",
  NOT_DONE: "bg-red-500",
  CANCELLED: "bg-gray-400 opacity-50",
}

export function ScheduleCell({ schedule, equipment, year, month, period, onClick }: ScheduleCellProps) {
  const status = schedule?.status ?? "PLANNED"
  const label =
    schedule?.assignedType === "INTERNAL" && schedule?.technician
      ? (schedule.technician as { name?: string }).name ?? "Técnico"
      : schedule?.assignedType === "OUTSOURCED"
        ? "[Terceiro]"
        : ""

  return (
    <td className="px-1 py-1 text-center align-middle">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "schedule-cell w-8 h-8 min-w-[2rem] rounded-full cursor-pointer flex items-center justify-center transition-all hover:scale-110 text-white text-xs font-medium",
          statusClass[status]
        )}
        title={schedule ? `${status}${label ? ` - ${label}` : ""}` : "Planejada"}
        aria-label={schedule ? `Preventiva ${status} ${label}` : "Célula planejada"}
      >
        {label ? (
          <span className="sr-only">{label}</span>
        ) : null}
      </button>
    </td>
  )
}
