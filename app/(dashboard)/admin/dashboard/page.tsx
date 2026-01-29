"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { Charts } from "@/components/dashboard/Charts"
import { AppLayout } from "@/components/layout/AppLayout"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { TrendingUp, DollarSign, AlertCircle, CheckCircle, Calendar } from "lucide-react"

export default function DashboardPage() {
  const { user, isLoading } = useAuth("ADMIN")
  const router = useRouter()
  const [stats, setStats] = useState({
    totalCompleted: 0,
    totalSpent: 0,
    budgetRemaining: 0,
    openOS: 0,
  })
  const [budget, setBudget] = useState<{ monthlyAmount: number; totalAmount: number } | null>(null)
  const [chartData, setChartData] = useState({
    osByTechnician: [] as { name: string; count: number }[],
    costsBySector: [] as { name: string; value: number }[],
    monthlyEvolution: [] as { month: string; gastos: number; budget: number }[],
    osByType: [] as { name: string; count: number }[],
  })
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

  // Array de anos disponíveis (últimos 5 anos + próximos 2)
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i)

  // Array de meses com nomes
  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ]

  const fetchDashboardData = useCallback(async () => {
    if (!user) return
    try {
      // Buscar todos os dados do dashboard em uma única requisição otimizada
      const response = await fetch(
        `/api/dashboard?year=${selectedYear}&month=${selectedMonth}&userId=${user.id}&userRole=${user.role}`
      )
      const data = await response.json()

      setStats(data.stats)
      setBudget(data.budget)
      setChartData(data.charts)
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error)
    }
  }, [selectedYear, selectedMonth, user])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      // Usar setTimeout para evitar setState síncrono no effect
      const timer = setTimeout(() => {
      fetchDashboardData()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [fetchDashboardData, user])


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout userRole="ADMIN">
      <div className="mb-8">
        <h1 className="font-display font-bold text-4xl text-gray-900 mb-2">
          Dashboard de Gestão
        </h1>
        <p className="text-gray-600">Análise e métricas do sistema</p>
      </div>

      {/* Filtros */}
      <div className="card-glass mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="text-primary-500" size={20} />
          <h3 className="font-display font-bold text-lg text-gray-900">Filtros</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="year" className="text-gray-700 mb-2 block">
              Ano
            </Label>
            <Select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="input-modern"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="month" className="text-gray-700 mb-2 block">
              Mês
            </Label>
            <Select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="input-modern"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="OS Finalizadas (Mês)"
          value={stats.totalCompleted}
          icon={CheckCircle}
        />
        <StatsCard
          title="Valor Total Gasto"
          value={`R$ ${stats.totalSpent.toFixed(2)}`}
          icon={DollarSign}
        />
        <StatsCard
          title="Budget Restante"
          value={`R$ ${stats.budgetRemaining.toFixed(2)}`}
          icon={TrendingUp}
          trend={
            budget && budget.monthlyAmount > 0
              ? parseFloat(((stats.budgetRemaining / budget.monthlyAmount) * 100).toFixed(1))
              : undefined
          }
        />
        <StatsCard
          title="OS Abertas Pendentes"
          value={stats.openOS}
          icon={AlertCircle}
        />
      </div>

      {/* Gráficos */}
      <Charts {...chartData} />
    </AppLayout>
  )
}
