import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { OSStatus, Priority } from "@prisma/client"
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
    if (body.needsPurchase !== undefined) {
      updateData.needsPurchase = body.needsPurchase === true || body.needsPurchase === "true"
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
    if (body.photos !== undefined) updateData.photos = body.photos

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

    return NextResponse.json(serviceOrder)
  } catch (error) {
    console.error("Error updating service order:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar ordem de serviço" },
      { status: 500 }
    )
  }
}
