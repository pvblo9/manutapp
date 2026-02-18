"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { PreventiveScheduleWithRelations } from "@/types/preventive"

interface PreventiveCardProps {
  schedule: PreventiveScheduleWithRelations
  onStart?: () => void
  onComplete?: (schedule: PreventiveScheduleWithRelations) => void
  showTimer?: boolean
}

const statusLabel: Record<string, string> = {
  PLANNED: "Planejada",
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  NOT_DONE: "Não realizada",
  CANCELLED: "Cancelada",
}

export function PreventiveCard({ schedule, onStart, onComplete, showTimer }: PreventiveCardProps) {
  const [loading, setLoading] = useState(false)
  const isInternal = schedule.assignedType === "INTERNAL"
  const canStart = isInternal && schedule.status === "SCHEDULED" && onStart
  const canComplete = schedule.status === "IN_PROGRESS" && onComplete

  const handleStart = async () => {
    if (!canStart) return
    setLoading(true)
    try {
      const res = await fetch(`/api/preventive/schedule/${schedule.id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: (schedule.technician as { id?: string })?.id }),
      })
      if (res.ok) onStart?.()
      else {
        const err = await res.json()
        alert(err.error || "Erro ao iniciar")
      }
    } catch (e) {
      alert("Erro ao iniciar preventiva")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="preventive-card bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{schedule.equipment.name}</h3>
          <p className="text-xs text-gray-500">
            {schedule.equipment.machine} - {schedule.equipment.machineCode}
          </p>
        </div>
        <span
          className={`preventive-badge px-2.5 py-0.5 rounded-full text-xs font-medium ${
            schedule.status === "SCHEDULED"
              ? "bg-yellow-100 text-yellow-800"
              : schedule.status === "IN_PROGRESS"
                ? "bg-blue-100 text-blue-800"
                : schedule.status === "COMPLETED"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
          }`}
        >
          {statusLabel[schedule.status] ?? schedule.status}
        </span>
      </div>
      {schedule.scheduledDate && (
        <p className="text-sm text-gray-600 mb-2">
          Data: {format(new Date(schedule.scheduledDate), "dd/MM/yyyy", { locale: ptBR })}
        </p>
      )}
      {schedule.observations && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{schedule.observations}</p>
      )}
      {showTimer && schedule.startedAt && (
        <p className="text-xs text-blue-600 mb-2">
          Iniciada às {format(new Date(schedule.startedAt), "HH:mm", { locale: ptBR })}
        </p>
      )}
      <div className="flex gap-2 mt-3">
        {canStart && (
          <Button size="sm" onClick={handleStart} disabled={loading}>
            {loading ? "..." : "Iniciar"}
          </Button>
        )}
        {canComplete && (
          <Button size="sm" variant="outline" onClick={() => onComplete?.(schedule)}>
            Finalizar
          </Button>
        )}
      </div>
    </div>
  )
}
