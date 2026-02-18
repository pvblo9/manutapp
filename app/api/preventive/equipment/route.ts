import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import type { PreventiveFrequency } from "@prisma/client"
import { generateSchedulesForYear } from "@/lib/preventive/generateSchedules"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const machine = searchParams.get("machine")
    const frequency = searchParams.get("frequency") as PreventiveFrequency | null
    const active = searchParams.get("active")

    const where: { category?: string; machine?: string; frequency?: PreventiveFrequency; active?: boolean } = {}
    if (category) where.category = category
    if (machine) where.machine = machine
    if (frequency) where.frequency = frequency
    if (active === "true") where.active = true
    else if (active === "false") where.active = false

    const equipments = await prisma.preventiveEquipment.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(equipments)
  } catch (error) {
    console.error("[preventive/equipment GET]", error)
    return NextResponse.json(
      { error: "Erro ao listar equipamentos preventivos" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, machine, machineCode, category, frequency } = body

    if (!name || !machine || !machineCode || !category || !frequency) {
      return NextResponse.json(
        { error: "name, machine, machineCode, category e frequency são obrigatórios" },
        { status: 400 }
      )
    }

    const validFrequencies: PreventiveFrequency[] = ["QUARTERLY", "BIMONTHLY", "SEMIANNUAL", "ANNUAL"]
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: "frequency inválida" },
        { status: 400 }
      )
    }

    const equipment = await prisma.preventiveEquipment.create({
      data: {
        name: String(name).trim(),
        machine: String(machine).trim(),
        machineCode: String(machineCode).trim(),
        category: String(category).trim(),
        frequency,
      },
    })

    const year = new Date().getFullYear()
    const created = await generateSchedulesForYear(equipment.id, year, frequency)

    return NextResponse.json({
      ...equipment,
      _schedulesCreated: created,
    })
  } catch (error) {
    console.error("[preventive/equipment POST]", error)
    return NextResponse.json(
      { error: "Erro ao criar equipamento preventivo" },
      { status: 500 }
    )
  }
}
