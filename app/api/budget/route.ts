import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear()

    const budget = await prisma.budget.findUnique({
      where: { year },
    })

    if (!budget) {
      // Retorna budget vazio se não existir
      return NextResponse.json({
        year,
        totalAmount: 0,
        monthlyAmount: 0,
      })
    }

    return NextResponse.json(budget)
  } catch (error) {
    console.error("Error fetching budget:", error)
    return NextResponse.json(
      { error: "Erro ao buscar orçamento" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { year, totalAmount } = await request.json()

    if (!year || totalAmount === undefined) {
      return NextResponse.json(
        { error: "Ano e valor total são obrigatórios" },
        { status: 400 }
      )
    }

    const monthlyAmount = totalAmount / 12

    const budget = await prisma.budget.upsert({
      where: { year },
      update: {
        totalAmount,
        monthlyAmount,
      },
      create: {
        year,
        totalAmount,
        monthlyAmount,
      },
    })

    return NextResponse.json(budget)
  } catch (error) {
    console.error("Error updating budget:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar orçamento" },
      { status: 500 }
    )
  }
}
