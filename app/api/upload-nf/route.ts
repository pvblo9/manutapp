import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const osId = formData.get("osId") as string

    if (!osId) {
      return NextResponse.json(
        { error: "ID da OS é obrigatório" },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo (JPG ou PDF)
    const validTypes = ["image/jpeg", "image/jpg", "application/pdf"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de arquivo inválido: ${file.name}. Use JPG ou PDF` },
        { status: 400 }
      )
    }

    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: `Arquivo muito grande: ${file.name}. Máximo 10MB` },
        { status: 400 }
      )
    }

    const uploadDir = join(process.cwd(), "public", "uploads", "service-orders", osId, "nf")

    // Criar diretório se não existir
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const extension = file.type === "application/pdf" ? ".pdf" : ".jpg"
    const filename = `nf-${timestamp}-${originalName}${extension}`
    const filepath = join(uploadDir, filename)

    await writeFile(filepath, buffer)

    const publicUrl = `/uploads/service-orders/${osId}/nf/${filename}`

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error("Error uploading NF document:", error)
    return NextResponse.json(
      { error: "Erro ao fazer upload do documento NF" },
      { status: 500 }
    )
  }
}
