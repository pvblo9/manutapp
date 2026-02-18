"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface PreventiveReportChartsProps {
  byCategory: Array<{ category: string; completed: number; total: number }>
  byTechnician: Array<{ technician: { id: string; name: string }; completed: number }>
}

export function PreventiveReportCharts({
  byCategory,
  byTechnician,
}: PreventiveReportChartsProps) {
  const categoryData = byCategory.map((c) => ({
    name: c.category,
    concluídas: c.completed,
    total: c.total,
  }))
  const technicianData = byTechnician.map((t) => ({
    name: t.technician.name,
    concluídas: t.completed,
  }))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <h3 className="font-display font-bold text-lg text-gray-900 mb-4">
          Preventivas por Categoria
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
              }}
            />
            <Legend />
            <Bar dataKey="concluídas" name="Concluídas" fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="total" name="Total" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <h3 className="font-display font-bold text-lg text-gray-900 mb-4">
          Preventivas por Técnico
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={technicianData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
              }}
            />
            <Legend />
            <Bar dataKey="concluídas" name="Concluídas" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
