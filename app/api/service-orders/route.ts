import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { OSStatus, Priority, NotificationType } from "@prisma/client"
import type { Prisma } from "@prisma/client"
import { getJsonSize, getClientIP } from "@/lib/utils/responseLogger"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") as OSStatus | null
    const technicianId = searchParams.get("technicianId")
    const priority = searchParams.get("priority") as Priority | null
    const sector = searchParams.get("sector")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const userId = searchParams.get("userId") // ID do usuário logado
    const userRole = searchParams.get("userRole") // Role do usuário logado

    // Parâmetros de paginação
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limitParam = parseInt(searchParams.get("limit") || "20", 10)
    const limit = Math.min(Math.max(1, limitParam), 50) // Entre 1 e 50
    const skip = (page - 1) * limit

    const where: Prisma.ServiceOrderWhereInput = {}

    // Se for operador, filtrar apenas suas OS
    if (userRole === "OPERATOR" && userId) {
      where.technicianId = userId
    }

    if (status) where.status = status
    if (technicianId) where.technicianId = technicianId
    if (priority) where.priority = priority
    if (sector) where.sector = sector
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    // Contar total de registros (para metadata de paginação)
    const total = await prisma.serviceOrder.count({ where })

    // Ordenação: operador vê a mesma sequência da fila definida pelo admin (queueOrder)
    const orderBy: Prisma.ServiceOrderOrderByWithRelationInput[] =
      userRole === "OPERATOR" && userId
        ? [
            { queueOrder: { sort: "asc", nulls: "last" } },
            { createdAt: "desc" },
          ]
        : [{ createdAt: "desc" }]

    // Buscar registros paginados
    // Otimização: não retornar photos na listagem (apenas no detalhamento)
    const serviceOrders = await prisma.serviceOrder.findMany({
      where,
      select: {
        id: true,
        date: true,
        machine: true,
        machineCode: true,
        maintenanceType: true,
        situation: true,
        technicianId: true,
        description: true,
        contactPerson: true,
        sector: true,
        status: true,
        priority: true,
        queueOrder: true,
        // photos removido da listagem para reduzir payload
        completionNote: true,
        cost: true,
        hadCost: true,
        needsPurchase: true,
        nfDocument: true,
        completedAt: true,
        machineStopped: true,
        machineStoppedAt: true,
        operatorStartedAt: true,
        createdAt: true,
        updatedAt: true,
        technician: {
          select: {
            id: true,
            name: true,
            // Removido username e email da listagem (apenas no detalhamento)
            role: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(total / limit)

    const responseData = {
      data: serviceOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }

    // Logging de consumo de banda
    const startTime = Date.now()
    const responseSize = getJsonSize(responseData)
    const duration = Date.now() - startTime
    const ip = getClientIP(request)
    
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: "GET",
        url: request.nextUrl.pathname + request.nextUrl.search,
        ip,
        status: 200,
        size_kb: (responseSize / 1024).toFixed(2),
        duration_ms: duration,
        ...(responseSize > 1024 * 1024 && { alert: "LARGE_RESPONSE" }), // > 1MB
      })
    )

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error fetching service orders:", error)
    return NextResponse.json(
      { error: "Erro ao buscar ordens de serviço" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      date,
      machine,
      machineCode,
      maintenanceType,
      situation,
      technicianId,
      description,
      contactPerson,
      sector,
      photos,
      priority,
      machineStopped,
    } = body

    if (
      !machine ||
      !machineCode ||
      !maintenanceType ||
      !situation ||
      !technicianId ||
      !description ||
      !contactPerson ||
      !sector
    ) {
      return NextResponse.json(
        { error: "Todos os campos obrigatórios devem ser preenchidos" },
        { status: 400 }
      )
    }

    const now = new Date()
    const serviceOrder = await prisma.serviceOrder.create({
      data: {
        date: date ? new Date(date) : now,
        machine,
        machineCode,
        maintenanceType,
        situation,
        technicianId,
        description,
        contactPerson,
        sector,
        photos: photos || [],
        status: OSStatus.OPEN,
        priority: (priority as Priority) || Priority.MEDIUM,
        machineStopped: machineStopped === true || machineStopped === "true",
        machineStoppedAt: machineStopped === true || machineStopped === "true" ? now : null,
      },
      include: {
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // Criar notificações
    try {
      // Notificar o operador atribuído
      await prisma.notification.create({
        data: {
          userId: technicianId,
          type: NotificationType.NEW_OS,
          title: "Nova Ordem de Serviço",
          message: `Nova O.S criada: ${contactPerson} - ${sector} - ${machine} - ${situation} - ${serviceOrder.technician.name} - ${priority === Priority.HIGH ? "ALTA" : priority === Priority.MEDIUM ? "MÉDIA" : "BAIXA"}`,
          link: `/operador?osId=${serviceOrder.id}`,
        },
      })

      // Notificar todos os admins
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN" },
        select: { id: true },
      })

      await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              type: NotificationType.NEW_OS,
              title: "Nova Ordem de Serviço",
              message: `Nova O.S criada: ${contactPerson} - ${sector} - ${machine} - ${situation} - ${serviceOrder.technician.name} - ${priority === Priority.HIGH ? "ALTA" : priority === Priority.MEDIUM ? "MÉDIA" : "BAIXA"}`,
              link: `/admin?osId=${serviceOrder.id}`,
            },
          })
        )
      )
    } catch (error) {
      console.error("Erro ao criar notificações:", error)
      // Não falhar a criação da OS se a notificação falhar
    }

    return NextResponse.json(serviceOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating service order:", error)
    return NextResponse.json(
      { error: "Erro ao criar ordem de serviço" },
      { status: 500 }
    )
  }
}
