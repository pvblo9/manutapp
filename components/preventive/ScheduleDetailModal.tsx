"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { PreventiveScheduleWithRelations } from "@/types/preventive"

const statusLabel: Record<string, string> = {
  PLANNED: "Planejada",
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  NOT_DONE: "Não realizada",
  CANCELLED: "Cancelada",
}

interface ScheduleDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: PreventiveScheduleWithRelations | null
  currentUserId?: string
  isAdmin: boolean
  onAssign?: () => void
  onStart?: () => void
  onComplete?: () => void
  onCancel?: () => void
  onRefresh: () => void
}

export function ScheduleDetailModal({
  open,
  onOpenChange,
  schedule,
  currentUserId,
  isAdmin,
  onAssign,
  onStart,
  onComplete,
  onCancel,
  onRefresh,
}: ScheduleDetailModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  
  if (!schedule) return null

  const isInternal = schedule.assignedType === "INTERNAL"
  const isMySchedule = isInternal && schedule.technicianId === currentUserId
  const canStart = isAdmin || isMySchedule
  const canComplete = schedule.status === "IN_PROGRESS" && (isAdmin || isMySchedule)
  const canCancel = isAdmin && (schedule.status === "SCHEDULED" || schedule.status === "IN_PROGRESS")

  const handleCancelClick = () => {
    if (!canCancel) {
      alert("Esta preventiva não pode ser cancelada.")
      return
    }
    setShowCancelConfirm(true)
  }

  const handleConfirmCancel = async () => {
    setCancelling(true)
    try {
      const res = await fetch(`/api/preventive/schedule/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      })
      
      if (res.ok) {
        alert("Preventiva cancelada com sucesso!")
        setShowCancelConfirm(false)
        onRefresh()
        onOpenChange(false)
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error.error || "Erro ao cancelar preventiva. Tente novamente.")
      }
    } catch (e) {
      console.error("Erro ao cancelar preventiva:", e)
      alert("Erro ao cancelar preventiva. Tente novamente.")
    } finally {
      setCancelling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{schedule.equipment.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-500">Centro de custo:</span> {schedule.equipment.machine}</p>
          <p><span className="text-gray-500">Código:</span> {schedule.equipment.machineCode}</p>
          <p><span className="text-gray-500">Período:</span> {schedule.year}/{schedule.month} – decêndio {schedule.period}</p>
          <p><span className="text-gray-500">Status:</span> {statusLabel[schedule.status] ?? schedule.status}</p>
          {isInternal && schedule.technician && (
            <p><span className="text-gray-500">Técnico:</span> {(schedule.technician as { name?: string }).name}</p>
          )}
          {schedule.assignedType === "OUTSOURCED" && (
            <>
              <p><span className="text-gray-500">Empresa:</span> {schedule.outsourcedCompany}</p>
              {schedule.outsourcedContact && (
                <p><span className="text-gray-500">Contato:</span> {schedule.outsourcedContact}</p>
              )}
            </>
          )}
          {schedule.scheduledDate && (
            <p><span className="text-gray-500">Data agendada:</span> {format(new Date(schedule.scheduledDate), "dd/MM/yyyy", { locale: ptBR })}</p>
          )}
          {schedule.observations && (
            <p><span className="text-gray-500">Observações:</span> {schedule.observations}</p>
          )}
          {schedule.status === "COMPLETED" && schedule.workDescription && (
            <p><span className="text-gray-500">Trabalho realizado:</span> {schedule.workDescription}</p>
          )}
          {schedule.photos && schedule.photos.length > 0 && (
            <p><span className="text-gray-500">Fotos:</span> {schedule.photos.length} anexo(s)</p>
          )}
        </div>
        <DialogFooter className="flex flex-wrap gap-2">
          {schedule.status === "PLANNED" && isAdmin && onAssign && (
            <Button onClick={onAssign} type="button">Agendar</Button>
          )}
          {schedule.status === "SCHEDULED" && canStart && isMySchedule && onStart && (
            <Button onClick={onStart} type="button">Iniciar</Button>
          )}
          {schedule.status === "SCHEDULED" && isAdmin && schedule.assignedType === "OUTSOURCED" && onComplete && (
            <Button onClick={onComplete} type="button">Registrar conclusão</Button>
          )}
          {canComplete && onComplete && (
            <Button onClick={onComplete} type="button">Finalizar</Button>
          )}
          {canCancel && (
            <Button 
              variant="destructive" 
              onClick={handleCancelClick}
              type="button"
            >
              Cancelar preventiva
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">Fechar</Button>
        </DialogFooter>
      </DialogContent>

      {/* Modal de confirmação de cancelamento */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar cancelamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700">
            Tem certeza que deseja cancelar esta preventiva?
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Equipamento: <strong>{schedule.equipment.name}</strong><br />
            Período: {schedule.year}/{schedule.month} - {schedule.period}º decêndio
          </p>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCancelConfirm(false)}
              disabled={cancelling}
              type="button"
            >
              Não, manter
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmCancel}
              disabled={cancelling}
              type="button"
            >
              {cancelling ? "Cancelando..." : "Sim, cancelar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
