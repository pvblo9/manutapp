"use client"

import { LucideIcon } from "lucide-react"

export function StatsCard({
  icon: Icon,
  title,
  value,
  trend,
}: {
  icon: LucideIcon
  title: string
  value: string | number
  trend?: number
}) {
  return (
    <div className="card-glass group">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-primary-500/10 rounded-xl group-hover:bg-primary-500/20 transition-colors">
          <Icon className="text-primary-500" size={24} />
        </div>
        {trend !== undefined && (
          <span
            className={`text-sm font-semibold ${
              trend >= 0 ? "text-primary-600" : "text-red-500"
            }`}
          >
            {/* Mostra sinal apenas se for tendência (fora do range 0-100) */}
            {trend < 0 ? "" : trend > 100 ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
        )}
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-display font-bold text-gray-900">{value}</p>
    </div>
  )
}
