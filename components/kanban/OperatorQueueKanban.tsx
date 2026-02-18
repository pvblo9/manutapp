"use client"

import { useState, useEffect, useCallback } from "react"
import { KanbanCard } from "./KanbanCard"
import { Select } from "@/components/ui/select"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { ServiceOrder, User } from "@/types"

interface OperatorQueueKanbanProps {
  technicians: User[]
  onView?: (os: ServiceOrder) => void
  onEdit?: (os: ServiceOrder) => void
  onComplete?: (os: ServiceOrder) => void
  onCancel?: (os: ServiceOrder) => void
  queueRefreshTrigger?: number
}

function SortableQueueCard({
  os,
  onView,
  onEdit,
  onComplete,
  onCancel,
}: {
  os: ServiceOrder
  onView?: (os: ServiceOrder) => void
  onEdit?: (os: ServiceOrder) => void
  onComplete?: (os: ServiceOrder) => void
  onCancel?: (os: ServiceOrder) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: os.id,
    data: { type: "card", os },
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard
        os={os}
        onView={onView}
        onEdit={onEdit}
        onComplete={onComplete}
        onCancel={onCancel}
        showActions
        isAdmin
      />
    </div>
  )
}

export function OperatorQueueKanban({
  technicians,
  onView,
  onEdit,
  onComplete,
  onCancel,
  queueRefreshTrigger = 0,
}: OperatorQueueKanbanProps) {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("")
  const [queue, setQueue] = useState<ServiceOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    if (!selectedTechnicianId) {
      setQueue([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/service-orders/queue?technicianId=${selectedTechnicianId}`)
      if (!res.ok) throw new Error("Erro ao carregar fila")
      const data = await res.json()
      setQueue(Array.isArray(data) ? data : [])
    } catch {
      setQueue([])
    } finally {
      setLoading(false)
    }
  }, [selectedTechnicianId])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue, queueRefreshTrigger])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    if (!over || active.id === over.id) return

    const oldIndex = queue.findIndex((os) => os.id === active.id)
    const newIndex = queue.findIndex((os) => os.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = [...queue]
    const [removed] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, removed)
    setQueue(reordered)

    try {
      const res = await fetch("/api/service-orders/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId: selectedTechnicianId,
          orderedIds: reordered.map((os) => os.id),
        }),
      })
      if (!res.ok) throw new Error("Erro ao reordenar")
    } catch {
      fetchQueue()
    }
  }

  const activeOS = activeId ? queue.find((os) => os.id === activeId) : null

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200 p-3 lg:p-4">
      <Select
        value={selectedTechnicianId}
        onChange={(e) => setSelectedTechnicianId(e.target.value)}
        className="mb-3 input-modern"
      >
        <option value="">Selecione o operador</option>
        {technicians
          .filter((t) => t.role === "OPERATOR")
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
      </Select>

      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : !selectedTechnicianId ? (
        <p className="text-sm text-gray-500">Selecione um operador para ver a fila.</p>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={queue.map((os) => os.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {queue.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhuma OS na fila.</p>
                ) : (
                  queue.map((os) => (
                    <SortableQueueCard
                      key={os.id}
                      os={os}
                      onView={onView}
                      onEdit={onEdit}
                      onComplete={onComplete}
                      onCancel={onCancel}
                    />
                  ))
                )}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeOS ? (
                <KanbanCard
                  os={activeOS}
                  onView={onView}
                  onEdit={onEdit}
                  onComplete={onComplete}
                  onCancel={onCancel}
                  showActions={false}
                  isAdmin
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}
    </div>
  )
}
