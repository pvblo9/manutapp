import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

// GET - Listar histórico de uma OS
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const history = await prisma.oSHistory.findMany({
      where: { serviceOrderId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error("Error fetching OS history:", error)
    return NextResponse.json(
      { error: "Erro ao buscar histórico" },
      { status: 500 }
    )
  }
}

// POST - Criar nova entrada no histórico
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, message, photos = [] } = body

    if (!userId || !message) {
      return NextResponse.json(
        { error: "userId e message são obrigatórios" },
        { status: 400 }
      )
    }

    const historyEntry = await prisma.oSHistory.create({
      data: {
        serviceOrderId: id,
        userId,
        message,
        photos: Array.isArray(photos) ? photos : [],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(historyEntry)
  } catch (error) {
    console.error("Error creating OS history:", error)
    return NextResponse.json(
      { error: "Erro ao criar entrada no histórico" },
      { status: 500 }
    )
  }
}
