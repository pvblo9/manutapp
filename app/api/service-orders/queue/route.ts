import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { OSStatus } from "@prisma/client"

/**
 * GET - Lista a fila do operador (OS OPEN) ordenada por queueOrder.
 */
export async function GET(request: NextRequest) {
  try {
    const technicianId = request.nextUrl.searchParams.get("technicianId")
    if (!technicianId) {
      return NextResponse.json(
        { error: "technicianId é obrigatório" },
        { status: 400 }
      )
    }

    const orders = await prisma.serviceOrder.findMany({
      where: {
        technicianId,
        status: OSStatus.OPEN,
      },
      orderBy: [{ queueOrder: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      include: {
        technician: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("[service-orders/queue GET]", error)
    return NextResponse.json(
      { error: "Erro ao buscar fila do operador" },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Reordenar fila: atualiza queueOrder conforme o array orderedIds.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { technicianId, orderedIds } = body as { technicianId?: string; orderedIds?: string[] }

    if (!technicianId || !Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "technicianId e orderedIds (array) são obrigatórios" },
        { status: 400 }
      )
    }

    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.serviceOrder.updateMany({
          where: { id, technicianId, status: OSStatus.OPEN },
          data: { queueOrder: index },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[service-orders/queue PATCH]", error)
    return NextResponse.json(
      { error: "Erro ao reordenar fila" },
      { status: 500 }
    )
  }
}
