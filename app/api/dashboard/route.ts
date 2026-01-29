import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { format, endOfMonth, eachMonthOfInterval, startOfYear } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import type { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString())
    const userId = searchParams.get("userId")
    const userRole = searchParams.get("userRole")

    // Buscar budget
    const budget = await prisma.budget.findUnique({
      where: { year },
      select: {
        id: true,
        year: true,
        totalAmount: true,
        monthlyAmount: true,
      },
    })

    // Buscar OS do mês selecionado
    const startDate = format(new Date(year, month - 1, 1), "yyyy-MM-dd")
    const endDate = format(endOfMonth(new Date(year, month - 1)), "yyyy-MM-dd")

    const where: Prisma.ServiceOrderWhereInput = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }

    if (userRole === "OPERATOR" && userId) {
      where.technicianId = userId
    }

    const osData = await prisma.serviceOrder.findMany({
      where,
      select: {
        id: true,
        status: true,
        cost: true,
        maintenanceType: true,
        sector: true,
        technician: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Calcular estatísticas
    const completed = osData.filter((os) => os.status === "COMPLETED")
    const totalCompleted = completed.length
    const totalSpent = completed.reduce((sum, os) => sum + (os.cost || 0), 0)
    const monthlyBudget = budget?.monthlyAmount || 0
    const budgetRemaining = monthlyBudget - totalSpent
    const openOS = osData.filter((os) => os.status === "OPEN").length

    // Preparar dados dos gráficos
    const osByTechnicianMap: Record<string, number> = {}
    completed.forEach((os) => {
      const name = os.technician?.name || "N/A"
      osByTechnicianMap[name] = (osByTechnicianMap[name] || 0) + 1
    })
    const osByTechnician = Object.entries(osByTechnicianMap).map(([name, count]) => ({
      name,
      count,
    }))

    const costsBySectorMap: Record<string, number> = {}
    completed.forEach((os) => {
      if (os.cost) {
        costsBySectorMap[os.sector] = (costsBySectorMap[os.sector] || 0) + os.cost
      }
    })
    const costsBySector = Object.entries(costsBySectorMap).map(([name, value]) => ({
      name,
      value: value as number,
    }))

    const osByTypeMap: Record<string, number> = {}
    osData.forEach((os) => {
      osByTypeMap[os.maintenanceType] = (osByTypeMap[os.maintenanceType] || 0) + 1
    })
    const osByType = Object.entries(osByTypeMap).map(([name, count]) => ({
      name,
      count,
    }))

    // Evolução mensal (últimos 6 meses) - otimizado com uma única query
    const months = eachMonthOfInterval({
      start: startOfYear(new Date(year)),
      end: new Date(year, month - 1),
    }).slice(-6)

    const monthlyEvolutionPromises = months.map(async (monthDate) => {
      const monthStart = format(monthDate, "yyyy-MM-dd")
      const monthEnd = format(endOfMonth(monthDate), "yyyy-MM-dd")

      const monthWhere: Prisma.ServiceOrderWhereInput = {
        date: {
          gte: new Date(monthStart),
          lte: new Date(monthEnd),
        },
        status: "COMPLETED",
      }

      if (userRole === "OPERATOR" && userId) {
        monthWhere.technicianId = userId
      }

      const monthCompleted = await prisma.serviceOrder.findMany({
        where: monthWhere,
        select: {
          cost: true,
        },
      })

      const monthGastos = monthCompleted.reduce((sum, os) => sum + (os.cost || 0), 0)

      return {
        month: format(monthDate, "MMM", { locale: ptBR }),
        gastos: monthGastos,
        budget: monthlyBudget,
      }
    })

    const monthlyEvolution = await Promise.all(monthlyEvolutionPromises)

    return NextResponse.json({
      stats: {
        totalCompleted,
        totalSpent,
        budgetRemaining,
        openOS,
      },
      budget,
      charts: {
        osByTechnician,
        costsBySector,
        monthlyEvolution,
        osByType,
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      { error: "Erro ao buscar dados do dashboard" },
      { status: 500 }
    )
  }
}
