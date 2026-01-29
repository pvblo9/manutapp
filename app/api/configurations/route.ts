import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  try {
    const configurations = await prisma.configuration.findMany({
      orderBy: {
        type: "asc",
      },
    })

    return NextResponse.json(configurations)
  } catch (error) {
    console.error("Error fetching configurations:", error)
    return NextResponse.json(
      { error: "Erro ao buscar configurações" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { type, values } = await request.json()

    if (!type || !Array.isArray(values)) {
      return NextResponse.json(
        { error: "Tipo e valores são obrigatórios" },
        { status: 400 }
      )
    }

    const configuration = await prisma.configuration.upsert({
      where: { type },
      update: { values },
      create: { type, values },
    })

    return NextResponse.json(configuration)
  } catch (error) {
    console.error("Error updating configuration:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar configuração" },
      { status: 500 }
    )
  }
}
