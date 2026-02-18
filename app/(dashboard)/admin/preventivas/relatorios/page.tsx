"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { AppLayout } from "@/components/layout/AppLayout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PreventiveReportCharts } from "@/components/preventive/PreventiveReportCharts"

type ReportData = {
  totalScheduled?: number
  totalCompleted?: number
  totalNotDone?: number
  completionRate?: number
  totalCost?: number
  overdueCount?: number
  byCategory?: Array<{ category: string; completed: number; total: number }>
  byTechnician?: Array<{ technician: { id: string; name: string }; completed: number }>
}

export default function RelatoriosPreventivasPage() {
  useAuth("ADMIN")
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState<string>("")
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const url = month
      ? `/api/preventive/reports?year=${year}&month=${month}`
      : `/api/preventive/reports?year=${year}`
    fetch(url)
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [year, month])

  return (
    <AppLayout userRole="ADMIN">
      <div className="p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
            Relatórios - Manutenção Preventiva
          </h1>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="input-modern w-28"
            >
              {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="input-modern w-32"
            >
              <option value="">Todos os meses</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString("pt-BR", { month: "long" })}
                </option>
              ))}
              </select>
            <Link href="/admin/preventivas">
              <Button variant="outline">Voltar ao cronograma</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : data ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500">Agendadas / Em andamento</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalScheduled ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{data.totalCompleted ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500">Taxa de cumprimento</p>
                <p className="text-2xl font-bold text-gray-900">{data.completionRate ?? 0}%</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <p className="text-sm text-gray-500">Custo total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.totalCost != null ? `R$ ${data.totalCost.toFixed(2)}` : "-"}
                </p>
              </div>
              {data.overdueCount != null && data.overdueCount > 0 && (
                <div className="sm:col-span-2 lg:col-span-4 bg-red-50 rounded-xl p-4 border border-red-200">
                  <p className="text-sm text-red-700">Preventivas atrasadas</p>
                  <p className="text-2xl font-bold text-red-800">{data.overdueCount}</p>
                </div>
              )}
            </div>

            {data.byCategory && data.byTechnician && (
              <PreventiveReportCharts
                byCategory={data.byCategory}
                byTechnician={data.byTechnician}
              />
            )}
          </div>
        ) : (
          <p className="text-gray-500">Erro ao carregar relatórios.</p>
        )}
      </div>
    </AppLayout>
  )
}
