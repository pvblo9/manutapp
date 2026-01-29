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
              trend > 0 ? "text-primary-600" : "text-red-500"
            }`}
          >
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
        )}
      </div>
      <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-display font-bold text-white">{value}</p>
    </div>
  )
}
