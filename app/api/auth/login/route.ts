import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { verifyPassword } from "@/lib/utils/auth"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "Nome de usuário e senha são obrigatórios" },
        { status: 400 }
      )
    }

    // Converter para lowercase antes de buscar
    const usernameLower = username.toLowerCase().trim()
    const passwordLower = password.toLowerCase().trim()

    const user = await prisma.user.findUnique({
      where: { username: usernameLower },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      )
    }

    const isValid = await verifyPassword(passwordLower, user.password)

    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      token: "simple-token", // Sistema simples, sem JWT
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Erro ao fazer login" },
      { status: 500 }
    )
  }
}
