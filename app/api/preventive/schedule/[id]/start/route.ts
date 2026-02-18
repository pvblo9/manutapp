import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    
    // Buscar preventiva
    const schedule = await prisma.preventiveSchedule.findUnique({
      where: { id },
      include: { equipment: true }
    })

    if (!schedule) {
      return NextResponse.json(
        { error: "Preventiva não encontrada" },
        { status: 404 }
      )
    }

    // Validar status
    if (schedule.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Preventiva não está no status SCHEDULED" },
        { status: 400 }
      )
    }

    // Validar se é operador interno
    if (schedule.assignedType !== "INTERNAL") {
      return NextResponse.json(
        { error: "Apenas preventivas de operadores internos podem ser iniciadas" },
        { status: 400 }
      )
    }

    // Atualizar para IN_PROGRESS
    const updatedSchedule = await prisma.preventiveSchedule.update({
      where: { id },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date()
      },
      include: {
        equipment: true,
        technician: { select: { id: true, name: true, email: true, role: true } }
      }
    })

    return NextResponse.json(updatedSchedule)
  } catch (error) {
    console.error("[PREVENTIVE_START]", error)
    return NextResponse.json(
      { error: "Erro ao iniciar preventiva" },
      { status: 500 }
    )
  }
}
