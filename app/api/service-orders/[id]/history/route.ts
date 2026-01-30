import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { NotificationType } from "@prisma/client"

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

    // Buscar informações da OS e do usuário
    const [serviceOrder, user] = await Promise.all([
      prisma.serviceOrder.findUnique({
        where: { id },
        select: {
          id: true,
          machine: true,
          machineCode: true,
          technicianId: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, role: true },
      }),
    ])

    if (!serviceOrder || !user) {
      return NextResponse.json(
        { error: "OS ou usuário não encontrado" },
        { status: 404 }
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

    // Se operador comentou, notificar admins
    if (user.role === "OPERATOR") {
      try {
        const admins = await prisma.user.findMany({
          where: { role: "ADMIN" },
          select: { id: true },
        })

        await Promise.all(
          admins.map((admin) =>
            prisma.notification.create({
              data: {
                userId: admin.id,
                type: NotificationType.OS_COMMENT,
                title: "Novo Comentário em OS",
                message: `${user.name} comentou na OS ${serviceOrder.machine} - ${serviceOrder.machineCode}`,
                link: `/admin?osId=${id}`,
              },
            })
          )
        )
      } catch (error) {
        console.error("Erro ao criar notificação de comentário:", error)
      }
    }

    return NextResponse.json(historyEntry)
  } catch (error) {
    console.error("Error creating OS history:", error)
    return NextResponse.json(
      { error: "Erro ao criar entrada no histórico" },
      { status: 500 }
    )
  }
}
