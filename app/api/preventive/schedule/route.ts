import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { NotificationType } from "@prisma/client"
import type { PreventiveAssignedType, PreventiveStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get("year")
    const technicianId = searchParams.get("technicianId")
    const equipmentId = searchParams.get("equipmentId")
    const assignedType = searchParams.get("assignedType") as PreventiveAssignedType | null
    const statusParam = searchParams.get("status") // múltiplos: SCHEDULED,IN_PROGRESS
    const month = searchParams.get("month")

    const where: {
      year?: number
      technicianId?: string
      equipmentId?: string
      assignedType?: PreventiveAssignedType
      status?: { in: PreventiveStatus[] }
      month?: number
    } = {}

    if (year) where.year = parseInt(year, 10)
    if (equipmentId) where.equipmentId = equipmentId
    if (technicianId) {
      where.technicianId = technicianId
      where.assignedType = "INTERNAL"
    }
    if (assignedType) where.assignedType = assignedType
    if (statusParam) {
      const statuses = statusParam.split(",").map((s) => s.trim()) as PreventiveStatus[]
      if (statuses.length) where.status = { in: statuses }
    }
    if (month) where.month = parseInt(month, 10)

    console.log("[preventive/schedule GET] Query params:", {
      equipmentId,
      year,
      month,
      where: JSON.stringify(where, null, 2)
    })

    const schedules = await prisma.preventiveSchedule.findMany({
      where,
      include: {
        equipment: true,
        technician: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }, { period: "asc" }],
    })

    console.log("[preventive/schedule GET] Resultados encontrados:", schedules.length, schedules.map(s => ({
      id: s.id,
      equipmentId: s.equipmentId,
      year: s.year,
      month: s.month,
      period: s.period,
      status: s.status
    })))

    return NextResponse.json(schedules)
  } catch (error) {
    console.error("[preventive/schedule GET]", error)
    return NextResponse.json(
      { error: "Erro ao listar agendamentos" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      equipmentId,
      year,
      month,
      period,
      assignedType,
      technicianId,
      outsourcedCompany,
      outsourcedContact,
      scheduledDate,
      observations,
      cost,
    } = body

    if (!equipmentId || year === undefined || month === undefined || period === undefined || !assignedType) {
      return NextResponse.json(
        { error: "equipmentId, year, month, period e assignedType são obrigatórios" },
        { status: 400 }
      )
    }

    if (assignedType === "INTERNAL") {
      if (!technicianId) {
        return NextResponse.json(
          { error: "technicianId é obrigatório para preventiva interna" },
          { status: 400 }
        )
      }
    } else     if (assignedType === "OUTSOURCED") {
      if (!outsourcedCompany || !String(outsourcedCompany).trim()) {
        return NextResponse.json(
          { error: "outsourcedCompany é obrigatório para terceirizado" },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json({ error: "assignedType deve ser INTERNAL ou OUTSOURCED" }, { status: 400 })
    }

    // ✅ VALIDAÇÃO: Verificar se já existe preventiva AGENDADA no mesmo mês
    // Ignorar PLANNED (ainda não agendadas), CANCELLED e NOT_DONE
    const existingInMonth = await prisma.preventiveSchedule.findFirst({
      where: {
        equipmentId: equipmentId,
        year: Number(year),
        month: Number(month),
        status: {
          notIn: ["PLANNED", "CANCELLED", "NOT_DONE"] // Ignorar planejadas, canceladas e não feitas
        }
      }
    })

    if (existingInMonth) {
      return NextResponse.json(
        { 
          error: "Já existe uma preventiva agendada para este equipamento neste mês",
          existingSchedule: existingInMonth 
        },
        { status: 400 }
      )
    }

    const schedule = await prisma.preventiveSchedule.upsert({
      where: {
        equipmentId_year_month_period: {
          equipmentId,
          year: Number(year),
          month: Number(month),
          period: Number(period),
        },
      },
      create: {
        equipmentId,
        year: Number(year),
        month: Number(month),
        period: Number(period),
        status: "SCHEDULED",
        assignedType,
        technicianId: assignedType === "INTERNAL" ? technicianId : null,
        outsourcedCompany: assignedType === "OUTSOURCED" ? String(outsourcedCompany).trim() : null,
        outsourcedContact: assignedType === "OUTSOURCED" && outsourcedContact ? String(outsourcedContact).trim() : null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        observations: observations ? String(observations).trim() : null,
        cost: cost != null ? parseFloat(cost) : null,
      },
      update: {
        status: "SCHEDULED",
        assignedType,
        technicianId: assignedType === "INTERNAL" ? technicianId : null,
        outsourcedCompany: assignedType === "OUTSOURCED" ? String(outsourcedCompany).trim() : null,
        outsourcedContact: assignedType === "OUTSOURCED" && outsourcedContact ? String(outsourcedContact).trim() : null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        observations: observations ? String(observations).trim() : null,
        cost: cost != null ? parseFloat(cost) : null,
      },
      include: {
        equipment: true,
        technician: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    if (assignedType === "INTERNAL" && technicianId) {
      try {
        await prisma.notification.create({
          data: {
            userId: technicianId,
            type: NotificationType.PREVENTIVE_ASSIGNED,
            title: "Manutenção preventiva atribuída",
            message: `${schedule.equipment.name} - ${schedule.equipment.machine} - Agendada`,
            link: "/operador/preventivas",
          },
        })
      } catch (e) {
        console.warn("Erro ao criar notificação PREVENTIVE_ASSIGNED:", e)
      }
    }

    return NextResponse.json(schedule)
  } catch (error) {
    console.error("[preventive/schedule POST]", error)
    return NextResponse.json(
      { error: "Erro ao criar agendamento" },
      { status: 500 }
    )
  }
}
