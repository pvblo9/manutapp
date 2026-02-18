"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import type { PreventiveEquipment } from "@prisma/client"
import type { User } from "@/types"
import { dateInputToISO, formatDateForInput } from "@/lib/utils/dateHelpers"

interface AssignPreventiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipment: PreventiveEquipment
  year: number
  month: number
  period: number
  scheduleId?: string | null
  onSuccess: () => void
}

export function AssignPreventiveModal({
  open,
  onOpenChange,
  equipment,
  year,
  month,
  period,
  scheduleId,
  onSuccess,
}: AssignPreventiveModalProps) {
  const [assignedType, setAssignedType] = useState<"INTERNAL" | "OUTSOURCED">("INTERNAL")
  const [technicianId, setTechnicianId] = useState("")
  const [outsourcedCompany, setOutsourcedCompany] = useState("")
  const [outsourcedContact, setOutsourcedContact] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [observations, setObservations] = useState("")
  const [cost, setCost] = useState("")
  const [technicians, setTechnicians] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [hasOtherInMonth, setHasOtherInMonth] = useState(false)
  const [otherSchedule, setOtherSchedule] = useState<any>(null)

  /** Formato exibido: DD/MM/AAAA (valor interno do input é sempre yyyy-MM-dd). */
  function toDDMMYYYY(isoDate: string): string {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return ""
    const [y, m, d] = isoDate.split("-").map(Number)
    return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`
  }

  useEffect(() => {
    console.log("🔵 AssignPreventiveModal useEffect executado:", { open, year, month, period, equipmentId: equipment.id })
    
    if (open) {
      console.log("🟢 Modal aberto, iniciando verificações...")
      
      fetch("/api/users")
        .then((r) => r.json())
        .then((data) => setTechnicians((data || []).filter((u: User) => u.role === "OPERATOR")))
        .catch(() => setTechnicians([]))
      const d = new Date(year, month - 1, period === 1 ? 5 : period === 2 ? 15 : 25)
      setScheduledDate(formatDateForInput(d))
      
      // Verificar se já existe preventiva no mês (mesmo equipamento, ano e mês)
      const currentYear = Number(year)
      const currentMonth = Number(month)
      
      console.log("🔍 Verificando preventivas:", {
        equipmentId: equipment.id,
        year: currentYear,
        month: currentMonth,
        period,
        yearType: typeof year,
        monthType: typeof month,
        url: `/api/preventive/schedule?equipmentId=${equipment.id}&year=${currentYear}&month=${currentMonth}`
      })
      
      fetch(`/api/preventive/schedule?equipmentId=${equipment.id}&year=${currentYear}&month=${currentMonth}`)
        .then((r) => {
          console.log("📡 Resposta da API recebida:", r.status, r.ok)
          if (!r.ok) {
            console.error("❌ Erro na API:", r.status, r.statusText)
            return r.json().then(err => { throw new Error(err.error || "Erro na API") })
          }
          return r.json()
        })
        .then((schedules: any[]) => {
          console.log("📦 Dados parseados:", schedules)
          console.log("Preventivas retornadas pela API (total:", schedules.length, "):", schedules.map(s => ({
            id: s.id,
            equipmentId: s.equipmentId,
            year: s.year,
            month: s.month,
            period: s.period,
            status: s.status,
            yearType: typeof s.year,
            monthType: typeof s.month,
            equipmentMatch: s.equipmentId === equipment.id,
            yearMatch: Number(s.year) === currentYear,
            monthMatch: Number(s.month) === currentMonth,
            periodMatch: s.period !== period,
            statusOk: !["CANCELLED", "NOT_DONE"].includes(s.status)
          })))
          
          // Filtrar apenas preventivas AGENDADAS (SCHEDULED, IN_PROGRESS, COMPLETED) no mesmo equipamento, ano e mês
          // Ignorar PLANNED (ainda não agendadas), CANCELLED e NOT_DONE
          const active = schedules.find((s: any) => {
            const equipmentMatch = s.equipmentId === equipment.id
            const yearMatch = Number(s.year) === currentYear
            const monthMatch = Number(s.month) === currentMonth
            const periodMatch = s.period !== period
            // Apenas considerar preventivas que já foram agendadas (não PLANNED)
            const statusOk = !["PLANNED", "CANCELLED", "NOT_DONE"].includes(s.status)
            
            const match = equipmentMatch && yearMatch && monthMatch && periodMatch && statusOk
            
            if (match) {
              console.log("❌ Preventiva encontrada no mesmo mês:")
              console.log("  Preventiva encontrada:", JSON.stringify({
                id: s.id,
                equipmentId: s.equipmentId, 
                year: s.year, 
                month: s.month, 
                period: s.period,
                status: s.status,
                yearType: typeof s.year,
                monthType: typeof s.month
              }, null, 2))
              console.log("  Preventiva atual:", JSON.stringify({
                equipmentId: equipment.id,
                year: currentYear, 
                month: currentMonth, 
                period,
                yearType: typeof currentYear,
                monthType: typeof currentMonth
              }, null, 2))
              console.log("  Comparações:", JSON.stringify({
                equipmentMatch,
                yearMatch: `${Number(s.year)} === ${currentYear} = ${yearMatch}`,
                monthMatch: `${Number(s.month)} === ${currentMonth} = ${monthMatch}`,
                periodMatch,
                statusOk
              }, null, 2))
            } else if (equipmentMatch && yearMatch && !monthMatch) {
              console.log("⚠️ Preventiva encontrada em mês DIFERENTE (não deve bloquear):", {
                encontrada: { year: s.year, month: s.month, period: s.period },
                atual: { year: currentYear, month: currentMonth, period },
                monthMatch: false
              })
            }
            
            return match
          })
          
          if (active) {
            console.log("⚠️ Mostrando aviso de preventiva existente")
            setHasOtherInMonth(true)
            setOtherSchedule(active)
          } else {
            console.log("✅ Nenhuma preventiva encontrada no mesmo mês")
            setHasOtherInMonth(false)
            setOtherSchedule(null)
          }
        })
        .catch((err) => {
          console.error("Erro ao verificar preventivas existentes:", err)
          setHasOtherInMonth(false)
          setOtherSchedule(null)
        })
    } else {
      // Reset ao fechar
      setHasOtherInMonth(false)
      setOtherSchedule(null)
      setError("")
    }
  }, [open, year, month, period, equipment.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (assignedType === "INTERNAL" && !technicianId) {
      setError("Selecione o operador.")
      return
    }
    if (assignedType === "OUTSOURCED" && !outsourcedCompany.trim()) {
      setError("Informe a empresa terceirizada.")
      return
    }
    if (!scheduledDate) {
      setError("Informe a data agendada.")
      return
    }
    setLoading(true)
    try {
      const body = {
        equipmentId: equipment.id,
        year,
        month,
        period,
        assignedType,
        ...(assignedType === "INTERNAL"
          ? { technicianId, scheduledDate: dateInputToISO(scheduledDate), observations }
          : {
              outsourcedCompany: outsourcedCompany.trim(),
              outsourcedContact: outsourcedContact.trim() || undefined,
              scheduledDate: dateInputToISO(scheduledDate),
              observations: observations.trim() || undefined,
              cost: cost ? parseFloat(cost) : undefined,
            }),
      }
      const res = await fetch("/api/preventive/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMsg = data.error || "Erro ao agendar"
        // Se for erro de preventiva já existente, mostrar mensagem mais clara
        if (errorMsg.includes("já existe uma preventiva")) {
          setError(errorMsg)
          return
        }
        throw new Error(errorMsg)
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao agendar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agendar preventiva</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          {equipment.name} – {year}/{month} (período {period})
        </p>
        {hasOtherInMonth && otherSchedule && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              ⚠️ Já existe uma preventiva agendada para este equipamento neste mês:
            </p>
            <div className="text-xs text-yellow-700 space-y-1">
              <p><strong>Período:</strong> {otherSchedule.period}º decêndio</p>
              {otherSchedule.scheduledDate && (
                <p><strong>Data:</strong> {toDDMMYYYY(formatDateForInput(new Date(otherSchedule.scheduledDate)))}</p>
              )}
              {otherSchedule.assignedType === "INTERNAL" && otherSchedule.technician && (
                <p><strong>Operador:</strong> {(otherSchedule.technician as { name?: string }).name}</p>
              )}
              {otherSchedule.assignedType === "OUTSOURCED" && (
                <p><strong>Terceirizado:</strong> {otherSchedule.outsourcedCompany}</p>
              )}
            </div>
            <p className="text-xs text-yellow-600 mt-2">
              Apenas uma preventiva por equipamento por mês é permitida.
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignedType"
                  checked={assignedType === "INTERNAL"}
                  onChange={() => setAssignedType("INTERNAL")}
                />
                Operador interno
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignedType"
                  checked={assignedType === "OUTSOURCED"}
                  onChange={() => setAssignedType("OUTSOURCED")}
                />
                Terceirizado
              </label>
            </div>
          </div>

          {assignedType === "INTERNAL" && (
            <div>
              <Label htmlFor="technicianId">Operador *</Label>
              <Select
                id="technicianId"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="mt-1 w-full"
              >
                <option value="">Selecione...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {assignedType === "OUTSOURCED" && (
            <>
              <div>
                <Label htmlFor="outsourcedCompany">Empresa *</Label>
                <Input
                  id="outsourcedCompany"
                  value={outsourcedCompany}
                  onChange={(e) => setOutsourcedCompany(e.target.value)}
                  className="mt-1"
                  placeholder="Nome da empresa"
                />
              </div>
              <div>
                <Label htmlFor="outsourcedContact">Contato</Label>
                <Input
                  id="outsourcedContact"
                  value={outsourcedContact}
                  onChange={(e) => setOutsourcedContact(e.target.value)}
                  className="mt-1"
                  placeholder="Telefone ou e-mail"
                />
              </div>
              <div>
                <Label htmlFor="cost">Valor estimado (R$)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="mt-1"
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="scheduledDate">Data agendada *</Label>
            <Input
              id="scheduledDate"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-1"
            />
            {scheduledDate && (
              <p className="mt-1 text-sm text-gray-600">
                {toDDMMYYYY(scheduledDate)}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="mt-1"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Agendar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
