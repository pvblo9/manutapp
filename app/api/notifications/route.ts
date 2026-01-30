import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { NotificationType } from "@prisma/client"

/**
 * GET - Listar notificações do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")
    const unreadOnly = searchParams.get("unreadOnly") === "true"

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório" },
        { status: 400 }
      )
    }

    const where: { userId: string; read?: boolean } = { userId }
    if (unreadOnly) {
      where.read = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limitar a 50 notificações mais recentes
    })

    // Contar não lidas
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    })

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    
    // Se a tabela não existir ou qualquer erro do Prisma, retornar array vazio
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (
      errorMessage.includes("does not exist") ||
      errorMessage.includes("Unknown table") ||
      errorMessage.includes("relation") ||
      errorMessage.includes("Notification")
    ) {
      // Tabela não existe ou erro de schema - retornar vazio silenciosamente
      return NextResponse.json({
        notifications: [],
        unreadCount: 0,
      })
    }
    
    // Para outros erros, retornar erro estruturado
    return NextResponse.json(
      { 
        error: "Erro ao buscar notificações", 
        message: errorMessage 
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Criar nova notificação
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, title, message, link } = body

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: "userId, type, title e message são obrigatórios" },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as NotificationType,
        title,
        message,
        link: link || null,
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json(
      { error: "Erro ao criar notificação" },
      { status: 500 }
    )
  }
}

/**
 * PUT - Marcar todas as notificações como lidas
 */
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "userId é obrigatório" },
        { status: 400 }
      )
    }

    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking all as read:", error)
    return NextResponse.json(
      { error: "Erro ao marcar notificações como lidas" },
      { status: 500 }
    )
  }
}
