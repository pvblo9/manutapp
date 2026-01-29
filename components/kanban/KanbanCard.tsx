"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import type { ServiceOrder } from "@/types"

interface KanbanCardProps {
  os: ServiceOrder
  onView?: (os: ServiceOrder) => void
  onEdit?: (os: ServiceOrder) => void
  onComplete?: (os: ServiceOrder) => void
  onCancel?: (os: ServiceOrder) => void
  showActions?: boolean
  isAdmin?: boolean
}

export function KanbanCard({
  os,
  onView,
  onEdit,
  onComplete,
  onCancel,
  showActions = true,
  isAdmin = false,
}: KanbanCardProps) {
  const priorityClass =
    os.priority === "HIGH"
      ? "badge-high"
      : os.priority === "MEDIUM"
        ? "badge-medium"
        : "badge-low"

  return (
    <div className="kanban-card mb-2 lg:mb-3 group p-3 lg:p-4">
      {/* Área arrastável - apenas o conteúdo principal, não os botões */}
      <div className="flex items-start justify-between mb-2 lg:mb-3" data-drag-handle>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-xs lg:text-sm text-gray-900 mb-1 truncate">
            OS #{os.id.slice(0, 8)}
          </h3>
          <p className="text-xs text-gray-600">
            {format(new Date(os.date), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-col gap-1 items-end flex-shrink-0 ml-2">
          <span className={`${priorityClass} text-xs lg:text-xs`}>
          {os.priority === "HIGH"
            ? "Alta"
            : os.priority === "MEDIUM"
              ? "Média"
              : "Baixa"}
        </span>
          {os.status === "COMPLETED" && (
            <>
              {os.hadCost === true ? (
                <span className="badge-high text-xs lg:text-xs">
                  TEVE CUSTO
                </span>
              ) : os.hadCost === false ? (
                <span className="badge-success text-xs lg:text-xs">
                  NÃO TEVE CUSTO
                </span>
              ) : null}
            </>
          )}
          {os.needsPurchase === true && (
            <span className="badge-medium text-xs lg:text-xs">
              COMPRAR
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 lg:space-y-2 mb-2 lg:mb-3">
        <p className="text-xs lg:text-sm font-medium text-gray-900 truncate">{os.machine}</p>
        <p className="text-xs text-gray-600 line-clamp-2">
          {os.description.length > 60
            ? `${os.description.substring(0, 60)}...`
            : os.description}
        </p>
        {isAdmin && (
          <p className="text-xs text-gray-500">
            Técnico: {os.technician?.name || "N/A"}
          </p>
        )}
        {os.status === "COMPLETED" && os.cost && (
          <p className="text-xs font-semibold text-primary-500">
            Custo: R$ {os.cost.toFixed(2)}
          </p>
        )}
      </div>

      {showActions && (
        <div className="flex gap-2 flex-wrap" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 50 }}>
          {onView && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onView(os)
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
              }}
              className="text-xs px-3 py-1.5 bg-primary-500/20 hover:bg-primary-500/30 text-primary-500 rounded-lg transition-colors"
            >
              Ver
            </button>
          )}
          {onEdit && isAdmin && os.status === "OPEN" && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit(os)
              }}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Editar
            </button>
          )}
          {onComplete && os.status === "OPEN" && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onComplete(os)
              }}
              className="text-xs px-3 py-1.5 bg-primary-500/20 hover:bg-primary-500/30 text-primary-600 rounded-lg transition-colors"
            >
              Finalizar
            </button>
          )}
          {onCancel && isAdmin && os.status === "OPEN" && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCancel(os)
              }}
              className="text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  )
}
