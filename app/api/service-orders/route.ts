import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { OSStatus, Priority } from "@prisma/client"
import type { Prisma } from "@prisma/client"

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
        photos: true,
        completionNote: true,
        cost: true,
        hadCost: true,
        needsPurchase: true,
        nfDocument: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        technician: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1000, // Limite para evitar queries muito grandes
    })

    return NextResponse.json(serviceOrders)
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

    const serviceOrder = await prisma.serviceOrder.create({
      data: {
        date: date ? new Date(date) : new Date(),
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

    return NextResponse.json(serviceOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating service order:", error)
    return NextResponse.json(
      { error: "Erro ao criar ordem de serviço" },
      { status: 500 }
    )
  }
}
