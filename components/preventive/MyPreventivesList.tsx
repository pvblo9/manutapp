"use client"

import { useState, useEffect, useCallback } from "react"
import { PreventiveCard } from "./PreventiveCard"
import { CompletePreventiveModal } from "./CompletePreventiveModal"
import type { PreventiveScheduleWithRelations } from "@/types/preventive"

interface MyPreventivesListProps {
  technicianId: string
}

export function MyPreventivesList({ technicianId }: MyPreventivesListProps) {
  const [schedules, setSchedules] = useState<PreventiveScheduleWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [completeModalSchedule, setCompleteModalSchedule] = useState<PreventiveScheduleWithRelations | null>(null)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/preventive/schedule?technicianId=${encodeURIComponent(technicianId)}&year=${new Date().getFullYear()}`
      )
      if (!res.ok) throw new Error("Erro ao carregar preventivas")
      const data = await res.json()
      setSchedules(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [technicianId])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const scheduled = schedules.filter((s) => s.status === "SCHEDULED")
  const inProgress = schedules.filter((s) => s.status === "IN_PROGRESS")
  const completed = schedules.filter((s) => s.status === "COMPLETED").slice(0, 20)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {inProgress.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Em andamento</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((s) => (
              <PreventiveCard
                key={s.id}
                schedule={s}
                onStart={undefined}
                onComplete={(sch) => setCompleteModalSchedule(sch)}
                showTimer
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Agendadas</h2>
        {scheduled.length === 0 ? (
          <p className="text-gray-500">Nenhuma preventiva agendada no momento.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scheduled.map((s) => (
              <PreventiveCard
                key={s.id}
                schedule={s}
                onStart={() => fetchSchedules()}
                onComplete={undefined}
              />
            ))}
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Concluídas (este ano)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((s) => (
              <PreventiveCard key={s.id} schedule={s} />
            ))}
          </div>
        </section>
      )}

      {schedules.length === 0 && (
        <p className="text-gray-500 text-center py-8">Nenhuma preventiva atribuída a você.</p>
      )}

      {completeModalSchedule && (
        <CompletePreventiveModal
          open={!!completeModalSchedule}
          onOpenChange={(open) => !open && setCompleteModalSchedule(null)}
          schedule={completeModalSchedule}
          completedByUserId={technicianId}
          onSuccess={() => {
            setCompleteModalSchedule(null)
            fetchSchedules()
          }}
        />
      )}
    </div>
  )
}
