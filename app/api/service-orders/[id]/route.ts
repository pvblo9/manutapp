import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { OSStatus, Priority, NotificationType } from "@prisma/client"
import type { Prisma } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: { id },
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

    if (!serviceOrder) {
      return NextResponse.json(
        { error: "Ordem de serviço não encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json(serviceOrder)
  } catch (error) {
    console.error("Error fetching service order:", error)
    return NextResponse.json(
      { error: "Erro ao buscar ordem de serviço" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const updateData: Prisma.ServiceOrderUpdateInput = {}

    if (body.status !== undefined) {
      updateData.status = body.status as OSStatus
      if (body.status === OSStatus.COMPLETED && !body.completedAt) {
        updateData.completedAt = new Date()
      }
    }
    if (body.priority !== undefined) {
      updateData.priority = body.priority as Priority
    }
    if (body.completionNote !== undefined) {
      updateData.completionNote = body.completionNote
    }
    if (body.cost !== undefined) {
      updateData.cost = parseFloat(body.cost)
    }
    if (body.hadCost !== undefined) {
      updateData.hadCost = body.hadCost === true || body.hadCost === "true"
    }
    let needsPurchaseChanged = false
    let previousNeedsPurchase = false
    
    if (body.needsPurchase !== undefined) {
      // Buscar valor anterior para verificar se mudou
      const currentOS = await prisma.serviceOrder.findUnique({
        where: { id },
        select: { needsPurchase: true, machine: true, machineCode: true },
      })
      
      previousNeedsPurchase = currentOS?.needsPurchase || false
      const newNeedsPurchase = body.needsPurchase === true || body.needsPurchase === "true"
      needsPurchaseChanged = previousNeedsPurchase !== newNeedsPurchase
      
      updateData.needsPurchase = newNeedsPurchase
    }
    if (body.nfDocument !== undefined) {
      updateData.nfDocument = body.nfDocument
    }
    if (body.machine !== undefined) updateData.machine = body.machine
    if (body.machineCode !== undefined) updateData.machineCode = body.machineCode
    if (body.maintenanceType !== undefined)
      updateData.maintenanceType = body.maintenanceType
    if (body.situation !== undefined) updateData.situation = body.situation
    if (body.description !== undefined) updateData.description = body.description
    if (body.contactPerson !== undefined)
      updateData.contactPerson = body.contactPerson
    if (body.sector !== undefined) updateData.sector = body.sector
    if (body.technicianId !== undefined)
      updateData.technician = { connect: { id: body.technicianId } }
    if (body.queueOrder !== undefined) updateData.queueOrder = body.queueOrder
    if (body.photos !== undefined) updateData.photos = body.photos
    if (body.operatorStartedAt !== undefined) {
      updateData.operatorStartedAt = body.operatorStartedAt ? new Date(body.operatorStartedAt) : null
    }

    const serviceOrder = await prisma.serviceOrder.update({
      where: { id },
      data: updateData,
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

    // Se needsPurchase foi marcado como true, notificar admins
    if (needsPurchaseChanged && serviceOrder.needsPurchase) {
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
                type: NotificationType.OS_NEEDS_PURCHASE,
                title: "OS Requer Compra",
                message: `A OS ${serviceOrder.machine} - ${serviceOrder.machineCode} requer compra de peças`,
                link: `/admin?osId=${id}`,
              },
            })
          )
        )
      } catch (error) {
        console.error("Erro ao criar notificação de compra necessária:", error)
      }
    }

    // Se um OPERADOR finalizou a OS, notificar todos os admins
    const completedByUserId = body.completedByUserId as string | undefined
    if (body.status === OSStatus.COMPLETED && completedByUserId) {
      try {
        const completedByUser = await prisma.user.findUnique({
          where: { id: completedByUserId },
          select: { id: true, name: true, role: true },
        })
        if (completedByUser?.role === "OPERATOR") {
          const admins = await prisma.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true },
          })
          await Promise.all(
            admins.map((admin) =>
              prisma.notification.create({
                data: {
                  userId: admin.id,
                  type: NotificationType.OS_COMPLETED,
                  title: "OS finalizada pelo operador",
                  message: `${completedByUser.name} finalizou a OS ${serviceOrder.machine} - ${serviceOrder.machineCode}`,
                  link: `/admin?osId=${id}`,
                },
              })
            )
          )
        }
      } catch (error) {
        console.error("Erro ao notificar admins da OS finalizada:", error)
      }
    }

    return NextResponse.json(serviceOrder)
  } catch (error) {
    console.error("Error updating service order:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar ordem de serviço" },
      { status: 500 }
    )
  }
}
