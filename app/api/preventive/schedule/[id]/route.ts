import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import type { PreventiveStatus } from "@prisma/client"

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const schedule = await prisma.preventiveSchedule.findUnique({
      where: { id },
      include: {
        equipment: true,
        technician: { select: { id: true, name: true, email: true, role: true } },
      },
    })
    if (!schedule) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 })
    return NextResponse.json(schedule)
  } catch (error) {
    console.error("[preventive/schedule/[id] GET]", error)
    return NextResponse.json({ error: "Erro ao buscar agendamento" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    
    // Validar status se fornecido
    if (body.status !== undefined) {
      const validStatuses: PreventiveStatus[] = ["PLANNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "NOT_DONE", "CANCELLED"]
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Status inválido. Valores permitidos: ${validStatuses.join(", ")}` },
          { status: 400 }
        )
      }
    }
    
    const update: {
      status?: PreventiveStatus
      scheduledDate?: Date | null
      observations?: string | null
      technicianId?: string | null
      outsourcedCompany?: string | null
      outsourcedContact?: string | null
      cost?: number | null
      nfDocument?: string | null
      workDescription?: string | null
      completedDate?: Date | null
      duration?: number | null
      photos?: string[]
    } = {}
    if (body.status !== undefined) update.status = body.status
    if (body.scheduledDate !== undefined) update.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : null
    if (body.observations !== undefined) update.observations = body.observations ? String(body.observations).trim() : null
    if (body.technicianId !== undefined) update.technicianId = body.technicianId || null
    if (body.outsourcedCompany !== undefined) update.outsourcedCompany = body.outsourcedCompany ? String(body.outsourcedCompany).trim() : null
    if (body.outsourcedContact !== undefined) update.outsourcedContact = body.outsourcedContact ? String(body.outsourcedContact).trim() : null
    if (body.cost !== undefined) update.cost = body.cost != null ? parseFloat(body.cost) : null
    if (body.nfDocument !== undefined) update.nfDocument = body.nfDocument || null
    if (body.workDescription !== undefined) update.workDescription = body.workDescription ? String(body.workDescription).trim() : null
    if (body.completedDate !== undefined) update.completedDate = body.completedDate ? new Date(body.completedDate) : null
    if (body.duration !== undefined) update.duration = body.duration != null ? parseInt(body.duration, 10) : null
    if (body.photos !== undefined) update.photos = Array.isArray(body.photos) ? body.photos : []

    const schedule = await prisma.preventiveSchedule.update({
      where: { id },
      data: update,
      include: {
        equipment: true,
        technician: { select: { id: true, name: true, email: true, role: true } },
      },
    })
    return NextResponse.json(schedule)
  } catch (error) {
    console.error("[preventive/schedule/[id] PATCH]", error)
    return NextResponse.json({ error: "Erro ao atualizar agendamento" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    await prisma.preventiveSchedule.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[preventive/schedule/[id] DELETE]", error)
    return NextResponse.json({ error: "Erro ao excluir agendamento" }, { status: 500 })
  }
}
