import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const osId = formData.get("osId") as string

    if (!osId) {
      return NextResponse.json(
        { error: "ID da OS é obrigatório" },
        { status: 400 }
      )
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      )
    }

    if (files.length > 5) {
      return NextResponse.json(
        { error: "Máximo de 5 fotos por OS" },
        { status: 400 }
      )
    }

    const uploadDir = join(process.cwd(), "public", "uploads", "service-orders", osId)

    // Criar diretório se não existir
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const uploadedFiles: string[] = []

    for (const file of files) {
      // Validar tipo de arquivo
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo de arquivo inválido: ${file.name}. Use JPG, PNG ou WEBP` },
          { status: 400 }
        )
      }

      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: `Arquivo muito grande: ${file.name}. Máximo 5MB` },
          { status: 400 }
        )
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const timestamp = Date.now()
      const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const filename = `${timestamp}-${originalName}`
      const filepath = join(uploadDir, filename)

      await writeFile(filepath, buffer)

      const publicUrl = `/uploads/service-orders/${osId}/${filename}`
      uploadedFiles.push(publicUrl)
    }

    return NextResponse.json({ urls: uploadedFiles })
  } catch (error) {
    console.error("Error uploading files:", error)
    return NextResponse.json(
      { error: "Erro ao fazer upload dos arquivos" },
      { status: 500 }
    )
  }
}
