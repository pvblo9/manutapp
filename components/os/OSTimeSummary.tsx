"use client"

import { businessMinutesBetween, formatBusinessMinutes } from "@/lib/utils/businessHours"
import type { ServiceOrder } from "@/types"

interface OSTimeSummaryProps {
  os: ServiceOrder
}

/**
 * Exibe os tempos medidos (máquina parada e trabalho do operador) em horário útil (Seg–Sex 08h–18h).
 */
export function OSTimeSummary({ os }: OSTimeSummaryProps) {
  if (os.status !== "COMPLETED" || !os.completedAt) return null

  const completedAt = new Date(os.completedAt)
  let machineStoppedMinutes: number | null = null
  let operatorWorkMinutes: number | null = null

  if (os.machineStopped && os.machineStoppedAt) {
    machineStoppedMinutes = businessMinutesBetween(new Date(os.machineStoppedAt), completedAt)
  }
  if (os.operatorStartedAt) {
    operatorWorkMinutes = businessMinutesBetween(new Date(os.operatorStartedAt), completedAt)
  }

  if (machineStoppedMinutes === null && operatorWorkMinutes === null) return null

  return (
    <div className="bg-primary-50/50 backdrop-blur-sm p-4 rounded-xl border border-primary-200 space-y-2">
      <p className="text-xs text-primary-700 font-semibold mb-2">Tempos (horário útil: Seg–Sex 08h–18h)</p>
      {machineStoppedMinutes !== null && (
        <div>
          <span className="text-xs text-gray-600">Máquina parada: </span>
          <span className="text-sm font-semibold text-gray-900">{formatBusinessMinutes(machineStoppedMinutes)}</span>
        </div>
      )}
      {operatorWorkMinutes !== null && (
        <div>
          <span className="text-xs text-gray-600">Trabalho do operador: </span>
          <span className="text-sm font-semibold text-gray-900">{formatBusinessMinutes(operatorWorkMinutes)}</span>
        </div>
      )}
    </div>
  )
}
