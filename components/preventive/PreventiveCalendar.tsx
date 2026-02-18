"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ScheduleCell } from "./ScheduleCell"
import type { PreventiveEquipment, PreventiveSchedule } from "@prisma/client"
import type { PreventiveScheduleWithRelations } from "@/types/preventive"

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const PERIODS = [1, 2, 3]

interface PreventiveCalendarProps {
  year: number
  onYearChange: (year: number) => void
  onCellClick?: (data: {
    schedule?: PreventiveScheduleWithRelations | null
    equipment: PreventiveEquipment
    year: number
    month: number
    period: number
  }) => void
}

export function PreventiveCalendar({ year, onYearChange, onCellClick }: PreventiveCalendarProps) {
  const [equipments, setEquipments] = useState<PreventiveEquipment[]>([])
  const [schedules, setSchedules] = useState<PreventiveScheduleWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/preventive/calendar?year=${year}`)
      if (!res.ok) throw new Error("Erro ao carregar cronograma")
      const data = await res.json()
      setEquipments(data.equipments ?? [])
      setSchedules(data.schedules ?? [])
    } catch (e) {
      console.error(e)
      setEquipments([])
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getSchedule = (equipmentId: string, month: number, period: number) =>
    schedules.find(
      (s) => s.equipmentId === equipmentId && s.year === year && s.month === month && s.period === period
    ) ?? null

  const byFrequency = {
    QUARTERLY: equipments.filter((e) => e.frequency === "QUARTERLY"),
    BIMONTHLY: equipments.filter((e) => e.frequency === "BIMONTHLY"),
    SEMIANNUAL: equipments.filter((e) => e.frequency === "SEMIANNUAL"),
    ANNUAL: equipments.filter((e) => e.frequency === "ANNUAL"),
  }

  const labels = {
    QUARTERLY: "Trimestral (3 meses)",
    BIMONTHLY: "Bimestral (2 meses)",
    SEMIANNUAL: "Semestral (6 meses)",
    ANNUAL: "Anual (12 meses)",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Carregando cronograma...</p>
      </div>
    )
  }

  return (
    <div className="preventive-calendar overflow-x-auto">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onYearChange(year - 1)}
          >
            ← {year - 1}
          </Button>
          <span className="font-semibold text-gray-800 px-2">{year}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onYearChange(year + 1)}
          >
            {year + 1} →
          </Button>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-gray-300 inline-block" /> Planejada</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-yellow-400 inline-block" /> Agendada</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-blue-500 inline-block" /> Em andamento</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-green-500 inline-block" /> Concluída</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-red-500 inline-block" /> Não realizada</span>
        </div>
      </div>

      <table className="w-full border-collapse bg-white rounded-xl shadow-sm overflow-hidden text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b border-gray-200 sticky left-0 bg-gray-50 min-w-[180px]">
              Equipamento
            </th>
            {MONTHS.map((m, i) => (
              <th key={m} colSpan={3} className="px-1 py-2 text-center text-xs font-semibold text-gray-700 border-b border-gray-200">
                {m}
              </th>
            ))}
          </tr>
          <tr className="bg-gray-50">
            <th className="px-3 py-1 border-b border-gray-200 sticky left-0 bg-gray-50" />
            {MONTHS.map((m) => (
              <th key={m} colSpan={3} className="px-1 py-1 text-center text-xs text-gray-500 border-b border-gray-200">
                1-10 | 11-20 | 21-31
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(["QUARTERLY", "BIMONTHLY", "SEMIANNUAL", "ANNUAL"] as const).map((freq) => (
            <React.Fragment key={freq}>
              <tr>
                <td colSpan={37} className="px-3 py-1 bg-primary-50 text-primary-800 font-semibold text-xs border-b border-gray-200">
                  {labels[freq]}
                </td>
              </tr>
              {byFrequency[freq].map((eq) => (
              <tr key={eq.id} className="hover:bg-gray-50 border-b border-gray-100">
                <td className="px-3 py-2 sticky left-0 bg-white border-r border-gray-100">
                  <div className="font-medium text-gray-900">{eq.name}</div>
                  <div className="text-xs text-gray-500">{eq.machine}</div>
                </td>
                {MONTHS.map((_, monthIndex) =>
                  PERIODS.map((period) => {
                    const schedule = getSchedule(eq.id, monthIndex + 1, period)
                    return (
                      <ScheduleCell
                        key={`${eq.id}-${monthIndex + 1}-${period}`}
                        schedule={schedule ?? undefined}
                        equipment={eq}
                        year={year}
                        month={monthIndex + 1}
                        period={period}
                        onClick={() => onCellClick?.({ schedule: schedule ?? undefined, equipment: eq, year, month: monthIndex + 1, period })}
                      />
                    )
                  })
                )}
              </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {equipments.length === 0 && (
        <p className="text-center text-gray-500 py-8">Nenhum equipamento preventivo cadastrado. Cadastre em Equipamentos.</p>
      )}
    </div>
  )
}
