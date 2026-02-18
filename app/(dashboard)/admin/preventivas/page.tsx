"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { AppLayout } from "@/components/layout/AppLayout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PreventiveCalendar } from "@/components/preventive/PreventiveCalendar"
import { AssignPreventiveModal } from "@/components/preventive/AssignPreventiveModal"
import { ScheduleDetailModal } from "@/components/preventive/ScheduleDetailModal"
import { CompletePreventiveModal } from "@/components/preventive/CompletePreventiveModal"
import type { PreventiveEquipment } from "@prisma/client"
import type { PreventiveScheduleWithRelations } from "@/types/preventive"

export default function AdminPreventivasPage() {
  useAuth("ADMIN")
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedCell, setSelectedCell] = useState<{
    schedule?: PreventiveScheduleWithRelations | null
    equipment: PreventiveEquipment
    year: number
    month: number
    period: number
  } | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const handleCellClick = (data: {
    schedule?: PreventiveScheduleWithRelations | null
    equipment: PreventiveEquipment
    year: number
    month: number
    period: number
  }) => {
    setSelectedCell(data)
    if (data.schedule && (data.schedule.status === "SCHEDULED" || data.schedule.status === "IN_PROGRESS" || data.schedule.status === "COMPLETED")) {
      setDetailModalOpen(true)
    } else {
      setAssignModalOpen(true)
    }
  }

  return (
    <AppLayout userRole="ADMIN">
      <div className="p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
            Cronograma de Manutenção Preventiva
          </h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/preventivas/equipamentos">
              <Button>+ Novo Equipamento</Button>
            </Link>
            <Link href="/admin/preventivas/relatorios">
              <Button variant="outline">Relatórios</Button>
            </Link>
          </div>
        </div>

        <PreventiveCalendar
          key={refreshKey}
          year={year}
          onYearChange={setYear}
          onCellClick={handleCellClick}
        />

        {selectedCell && (
          <>
            <AssignPreventiveModal
              open={assignModalOpen}
              onOpenChange={setAssignModalOpen}
              equipment={selectedCell.equipment}
              year={selectedCell.year}
              month={selectedCell.month}
              period={selectedCell.period}
              scheduleId={selectedCell.schedule?.id}
              onSuccess={refresh}
            />
            <ScheduleDetailModal
              open={detailModalOpen}
              onOpenChange={setDetailModalOpen}
              schedule={selectedCell.schedule ?? null}
              isAdmin
              onAssign={() => {
                setDetailModalOpen(false)
                setAssignModalOpen(true)
              }}
              onComplete={() => {
                setDetailModalOpen(false)
                setCompleteModalOpen(true)
              }}
              onRefresh={refresh}
            />
            {selectedCell.schedule && (
              <CompletePreventiveModal
                open={completeModalOpen}
                onOpenChange={setCompleteModalOpen}
                schedule={selectedCell.schedule}
                onSuccess={refresh}
              />
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
