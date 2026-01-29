"use client"

import { useState, useMemo } from "react"
import { KanbanCard } from "./KanbanCard"
import { OSStatus } from "@prisma/client"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, Filter, X } from "lucide-react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { ServiceOrder, User } from "@/types"

interface KanbanBoardProps {
  serviceOrders: ServiceOrder[]
  onView?: (os: ServiceOrder) => void
  onEdit?: (os: ServiceOrder) => void
  onComplete?: (os: ServiceOrder) => void
  onCancel?: (os: ServiceOrder) => void
  isAdmin?: boolean
  technicians?: User[]
}

const columns = [
  { id: "OPEN", title: "Abertas", status: OSStatus.OPEN },
  { id: "COMPLETED", title: "Finalizadas", status: OSStatus.COMPLETED },
  { id: "CANCELLED", title: "Canceladas", status: OSStatus.CANCELLED },
]

// Componente para coluna droppable
function DroppableColumn({
  id,
  children,
  className,
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "column",
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? "ring-2 ring-primary-500 rounded-2xl" : ""}`}
    >
      {children}
    </div>
  )
}

// Componente para card draggable
function DraggableCard({ os, children }: { os: ServiceOrder; children: React.ReactNode }) {
  // Só permite arrastar se a OS estiver aberta
  const canDrag = os.status === "OPEN"
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: os.id,
    disabled: !canDrag,
    data: {
      type: "card",
      os,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...(canDrag ? attributes : {})}
    >
      {/* Aplicar listeners apenas na área arrastável, excluindo botões */}
      {canDrag ? (
        <div 
          {...listeners}
          onPointerDown={(e) => {
            // Se clicou em um botão, não iniciar drag
            const target = e.target as HTMLElement
            if (target.tagName === 'BUTTON' || target.closest('button')) {
              e.stopPropagation()
              return false
            }
          }}
          onMouseDown={(e) => {
            // Se clicou em um botão, não iniciar drag
            const target = e.target as HTMLElement
            if (target.tagName === 'BUTTON' || target.closest('button')) {
              e.stopPropagation()
              return false
            }
          }}
          style={{ position: 'relative' }}
        >
          <div style={{ pointerEvents: 'none' }}>
            {children}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export function KanbanBoard({
  serviceOrders,
  onView,
  onEdit,
  onComplete,
  onCancel,
  isAdmin = false,
  technicians = [],
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    technician: "",
    sector: "",
    search: "",
    cost: "",
    needsPurchase: "",
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  )

  const filteredOrders = useMemo(() => {
    let filtered = [...serviceOrders]

    if (filters.status) {
      filtered = filtered.filter((os) => os.status === filters.status)
    }

    if (filters.priority) {
      filtered = filtered.filter((os) => os.priority === filters.priority)
    }

    if (filters.technician) {
      filtered = filtered.filter(
        (os) => os.technicianId === filters.technician
      )
    }

    if (filters.sector) {
      filtered = filtered.filter((os) => os.sector === filters.sector)
    }

    if (filters.cost) {
      if (filters.cost === "with-cost") {
        filtered = filtered.filter((os) => os.status === "COMPLETED" && os.hadCost === true)
      } else if (filters.cost === "without-cost") {
        filtered = filtered.filter((os) => os.status === "COMPLETED" && os.hadCost === false)
      }
    }

    if (filters.needsPurchase) {
      if (filters.needsPurchase === "yes") {
        filtered = filtered.filter((os) => os.needsPurchase === true)
      } else if (filters.needsPurchase === "no") {
        filtered = filtered.filter((os) => os.needsPurchase === false || os.needsPurchase === null)
      }
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (os) =>
          os.machine.toLowerCase().includes(searchLower) ||
          os.description.toLowerCase().includes(searchLower) ||
          os.machineCode.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [serviceOrders, filters])

  const getOrdersByStatus = (status: OSStatus) => {
    const orders = filteredOrders.filter((os) => os.status === status)
    
    // Se for status OPEN, ordenar por prioridade (HIGH > MEDIUM > LOW)
    if (status === OSStatus.OPEN) {
      const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 }
      return orders.sort((a, b) => {
        const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 999
        const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 999
        return priorityA - priorityB
      })
    }
    
    // Para outras OS, ordenar por data (mais recente primeiro)
    return orders.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA
    })
  }

  const visibleColumns = isAdmin
    ? columns
    : columns.filter((col) => col.status !== OSStatus.CANCELLED)

  const hasActiveFilters = Object.values(filters).some((value) => value !== "")

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Encontrar a OS sendo arrastada
    const draggedOS = filteredOrders.find((os) => os.id === activeId)
    if (!draggedOS) return

    // Verificar se arrastou para uma coluna (pode ser o ID da coluna ou um card dentro dela)
    let targetStatus: OSStatus | null = null
    
    // Se arrastou diretamente para a coluna
    if (overId === "OPEN" || overId === "COMPLETED" || overId === "CANCELLED") {
      targetStatus = overId as OSStatus
    } else {
      // Se arrastou para um card dentro de uma coluna, encontrar a coluna desse card
      const targetOS = filteredOrders.find((os) => os.id === overId)
      if (targetOS) {
        targetStatus = targetOS.status
      } else {
        return
      }
    }

    if (!targetStatus) return

    // Se já está no mesmo status, não fazer nada
    if (draggedOS.status === targetStatus) return

    // Se arrastou para COMPLETED e a OS está OPEN
    if (targetStatus === "COMPLETED" && draggedOS.status === "OPEN") {
      if (onComplete) {
        // Tanto operador quanto admin precisam abrir modal
        onComplete(draggedOS)
        return
      }
      // Fallback: finalizar direto se não houver callback
      try {
        const response = await fetch(`/api/service-orders/${draggedOS.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "COMPLETED",
            completionNote: "Finalizada via drag and drop",
          }),
        })
        if (response.ok) {
          setTimeout(() => window.location.reload(), 300)
        } else {
          alert("Erro ao finalizar OS")
        }
      } catch {
        alert("Erro ao finalizar OS")
      }
    }
    // Se arrastou para CANCELLED e a OS está OPEN (apenas admin)
    else if (targetStatus === "CANCELLED" && draggedOS.status === "OPEN" && isAdmin) {
      if (confirm("Tem certeza que deseja cancelar esta OS?")) {
        try {
          const response = await fetch(`/api/service-orders/${draggedOS.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "CANCELLED",
            }),
          })
          if (response.ok) {
            // Atualização será feita via reload
            setTimeout(() => window.location.reload(), 300)
          } else {
            alert("Erro ao cancelar OS")
          }
        } catch {
          alert("Erro ao cancelar OS")
        }
      }
    }
    // Não permitir reabrir OS canceladas ou finalizadas
    else if (targetStatus === "OPEN" && draggedOS.status !== "OPEN") {
      alert("Não é possível reabrir uma OS que já foi finalizada ou cancelada")
      return
    }
  }

  const activeOS = activeId ? filteredOrders.find((os) => os.id === activeId) : null

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="card-glass p-3 lg:p-4">
        <div className="flex items-center gap-2 mb-3 lg:mb-4">
          <Filter size={18} className="text-primary-500 lg:w-5 lg:h-5" />
          <h3 className="font-semibold text-sm lg:text-base text-gray-900">Filtros</h3>
        </div>
        <div className="grid gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-2 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <Input
              placeholder="Buscar por máquina, descrição..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input-modern pl-10"
            />
          </div>
          {isAdmin && (
            <>
              <Select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="input-modern"
              >
                <option value="">Todos os status</option>
                <option value="OPEN">Abertas</option>
                <option value="COMPLETED">Finalizadas</option>
                <option value="CANCELLED">Canceladas</option>
              </Select>
              <Select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value })
                }
                className="input-modern"
              >
                <option value="">Todas as prioridades</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Média</option>
                <option value="LOW">Baixa</option>
              </Select>
              <Select
                value={filters.technician}
                onChange={(e) =>
                  setFilters({ ...filters, technician: e.target.value })
                }
                className="input-modern"
              >
                <option value="">Todos os operadores</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </Select>
              <Select
                value={filters.cost}
                onChange={(e) =>
                  setFilters({ ...filters, cost: e.target.value })
                }
                className="input-modern"
              >
                <option value="">Todos os custos</option>
                <option value="with-cost">Teve Custo</option>
                <option value="without-cost">Não Teve Custo</option>
              </Select>
              <Select
                value={filters.needsPurchase}
                onChange={(e) =>
                  setFilters({ ...filters, needsPurchase: e.target.value })
                }
                className="input-modern"
              >
                <option value="">Necessário compra</option>
                <option value="yes">Sim</option>
                <option value="no">Não</option>
              </Select>
            </>
          )}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={() =>
                setFilters({
                  status: "",
                  priority: "",
                  technician: "",
                  sector: "",
                  search: "",
                  cost: "",
                  needsPurchase: "",
                })
              }
              className="btn-secondary"
            >
              <X size={16} className="mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="grid gap-4 lg:gap-6 grid-cols-1 min-w-max lg:min-w-0 lg:grid-cols-3">
          {visibleColumns.map((column) => {
            const orders = getOrdersByStatus(column.status)
            return (
              <DroppableColumn
                key={column.id}
                id={column.id}
                className="space-y-3"
              >
                <SortableContext
                  id={column.id}
                  items={orders.filter((os) => os.status === "OPEN").map((os) => os.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex items-center justify-between p-3 lg:p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-primary-200 bg-primary-50/30">
                    <h3 className="font-display font-bold text-base lg:text-lg text-gray-900">
                      {column.title}
                    </h3>
                    <span className="px-2 lg:px-3 py-1 bg-primary-500/20 text-primary-600 rounded-full text-xs lg:text-sm font-semibold">
                      {orders.length}
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[400px] lg:max-h-[600px] overflow-y-auto pr-2 min-w-[280px] lg:min-w-0">
                    {orders.length === 0 ? (
                      <div className="bg-white/60 backdrop-blur-sm p-8 rounded-xl border border-gray-200 text-center">
                        <p className="text-sm text-gray-600">
                          Nenhuma OS nesta coluna
                        </p>
                      </div>
                    ) : (
                      orders.map((os) => {
                        // Para OS que não podem ser arrastadas, renderizar diretamente sem DraggableCard
                        if (os.status !== "OPEN") {
                          return (
                            <div key={os.id} className="opacity-90">
                              <KanbanCard
                                os={os}
                                onView={onView}
                                onEdit={onEdit}
                                onComplete={onComplete}
                                onCancel={onCancel}
                                isAdmin={isAdmin}
                              />
                            </div>
                          )
                        }
                        return (
                          <DraggableCard key={os.id} os={os}>
                            <KanbanCard
                              os={os}
                              onView={onView}
                              onEdit={onEdit}
                              onComplete={onComplete}
                              onCancel={onCancel}
                              isAdmin={isAdmin}
                            />
                          </DraggableCard>
                        )
                      })
                    )}
                  </div>
                </SortableContext>
              </DroppableColumn>
            )
          })}
          </div>
        </div>
        <DragOverlay>
          {activeOS ? (
            <div className="opacity-50">
              <KanbanCard
                os={activeOS}
                onView={onView}
                onEdit={onEdit}
                onComplete={onComplete}
                onCancel={onCancel}
                isAdmin={isAdmin}
                showActions={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
