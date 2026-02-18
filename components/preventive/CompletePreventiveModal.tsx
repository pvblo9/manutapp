"use client"

import { useState } from "react"
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
import { CloudinaryImage } from "@/components/ui/CloudinaryImage"
import type { PreventiveScheduleWithRelations } from "@/types/preventive"

interface CompletePreventiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: PreventiveScheduleWithRelations
  completedByUserId?: string
  onSuccess: () => void
}

export function CompletePreventiveModal({
  open,
  onOpenChange,
  schedule,
  completedByUserId,
  onSuccess,
}: CompletePreventiveModalProps) {
  const [workDescription, setWorkDescription] = useState("")
  const [observations, setObservations] = useState("")
  const [cost, setCost] = useState(schedule.cost != null ? String(schedule.cost) : "")
  const [photos, setPhotos] = useState<string[]>(schedule.photos || [])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const isOutsourced = schedule.assignedType === "OUTSOURCED"

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const list = Array.from(files).slice(0, 5 - photos.length - pendingFiles.length)
    setPendingFiles((prev) => [...prev, ...list])
  }

  const uploadPhotos = async (): Promise<string[]> => {
    if (pendingFiles.length === 0) return photos
    setUploading(true)
    const formData = new FormData()
    formData.set("scheduleId", schedule.id)
    pendingFiles.forEach((f) => formData.append("files", f))
    try {
      const res = await fetch("/api/preventive/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error("Upload falhou")
      const data = await res.json()
      return [...photos, ...(data.urls || [])]
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!workDescription.trim()) {
      setError("Descreva o trabalho realizado.")
      return
    }
    setLoading(true)
    try {
      let photoUrls = photos
      if (pendingFiles.length > 0) {
        photoUrls = await uploadPhotos()
      }
      const res = await fetch(`/api/preventive/schedule/${schedule.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDescription: workDescription.trim(),
          observations: observations.trim() || undefined,
          photos: photoUrls,
          cost: cost ? parseFloat(cost) : undefined,
          completedByUserId,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Erro ao concluir")
      }
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao concluir")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Concluir preventiva – {schedule.equipment.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="workDescription">O que foi feito? *</Label>
            <Textarea
              id="workDescription"
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              className="mt-1"
              rows={4}
              required
            />
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
          {(isOutsourced || cost) && (
            <div>
              <Label htmlFor="cost">Custo (R$)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label>Fotos</Label>
            <Input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              className="mt-1"
            />
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photos.map((url, i) => (
                  <CloudinaryImage
                    key={`${url}-${i}`}
                    src={url}
                    alt={`Foto ${i + 1}`}
                    width={80}
                    height={80}
                    className="rounded-lg object-cover border border-gray-200"
                  />
                ))}
              </div>
            )}
            {pendingFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{pendingFiles.length} arquivo(s) serão enviados ao salvar.</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {uploading ? "Enviando fotos..." : loading ? "Salvando..." : "Concluir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
