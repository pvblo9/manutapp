"use client"

import { useState, useEffect, useCallback } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Bell, Calendar, Plus } from "lucide-react"
import type { ServiceOrderAlert } from "@/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { dateInputToISO, formatDateForInput } from "@/lib/utils/dateHelpers"

interface OSAlertsSectionProps {
  serviceOrderId: string
  onAlertCreated?: () => void
}

export function OSAlertsSection({ serviceOrderId, onAlertCreated }: OSAlertsSectionProps) {
  const [alerts, setAlerts] = useState<ServiceOrderAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [alertDate, setAlertDate] = useState("")
  const [alertDescription, setAlertDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`/api/service-orders/${serviceOrderId}/alerts`)
      if (res.ok) {
        const data = await res.json()
        setAlerts(Array.isArray(data) ? data : [])
      }
    } catch {
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [serviceOrderId])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alertDate.trim() || !alertDescription.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/service-orders/${serviceOrderId}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertDate: dateInputToISO(alertDate),
          description: alertDescription.trim(),
        }),
      })
      if (res.ok) {
        setAlertDate("")
        setAlertDescription("")
        setShowForm(false)
        fetchAlerts()
        onAlertCreated?.()
      } else {
        const err = await res.json()
        alert(err.error || "Erro ao criar alerta")
      }
    } catch {
      alert("Erro ao criar alerta")
    } finally {
      setSubmitting(false)
    }
  }

  const today = formatDateForInput(new Date())

  return (
    <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-600 font-semibold flex items-center gap-2">
          <Bell size={14} />
          Alertas
        </p>
        {!showForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
            className="text-xs py-1.5"
          >
            <Plus size={14} className="mr-1" />
            Criar alerta
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 p-3 bg-white/80 rounded-lg border border-gray-200 mb-3">
          <div>
            <Label className="text-xs text-gray-700 mb-1 block">Data do alerta</Label>
            <Input
              type="date"
              value={alertDate}
              onChange={(e) => setAlertDate(e.target.value)}
              min={today}
              className="input-modern text-sm"
              required
            />
          </div>
          <div>
            <Label className="text-xs text-gray-700 mb-1 block">Descrição do alerta</Label>
            <Textarea
              value={alertDescription}
              onChange={(e) => setAlertDescription(e.target.value)}
              placeholder="Ex.: Verificar peça, retorno do fornecedor..."
              rows={2}
              className="input-modern resize-none text-sm"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting} className="btn-primary text-xs py-1.5">
              {submitting ? "Salvando..." : "Criar alerta"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false)
                setAlertDate("")
                setAlertDescription("")
              }}
              className="text-xs py-1.5"
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-xs text-gray-500">Carregando alertas...</p>
      ) : alerts.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhum alerta. Crie um para ser notificado na data escolhida.</p>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-2 p-2 bg-white/80 rounded-lg border border-gray-200 text-xs"
            >
              <Calendar size={14} className="text-primary-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">
                  {format(new Date(alert.alertDate), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <p className="text-gray-700 whitespace-pre-wrap">{alert.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
