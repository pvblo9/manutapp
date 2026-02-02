import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import { rateLimiter, getClientIP } from "@/lib/utils/rateLimit"
import { getClientIP as getIPForLogging } from "@/lib/utils/responseLogger"
import { uploadToCloudinary, uploadThumbnailToCloudinary } from "@/lib/cloudinary"

export async function POST(request: NextRequest) {
  try {
    // Rate limiting específico para uploads: 10 uploads por hora por IP
    const ip = getClientIP(request)
    const uploadLimit = rateLimiter.check(ip, 10, 60 * 60 * 1000) // 10 por hora

    if (!uploadLimit.allowed) {
      return NextResponse.json(
        {
          error: "Limite de uploads excedido. Você pode fazer até 10 uploads por hora.",
          retryAfter: Math.ceil((uploadLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((uploadLimit.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": uploadLimit.remaining.toString(),
          },
        }
      )
    }
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

    // Verificar se as variáveis de ambiente do Cloudinary estão configuradas
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error("[Upload] Variáveis de ambiente do Cloudinary não configuradas")
      return NextResponse.json(
        { error: "Configuração do Cloudinary não encontrada. Contate o administrador." },
        { status: 500 }
      )
    }

    const uploadedFiles: string[] = []
    const folder = `manutapp/os-photos/${osId}`

    for (const file of files) {
      try {
        // Validar tipo de arquivo (apenas imagens)
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if (!validTypes.includes(file.type)) {
          return NextResponse.json(
            { error: `Tipo de arquivo inválido: ${file.name}. Use JPG, PNG ou WEBP` },
            { status: 400 }
          )
        }

        // Validar tamanho (aumentado para 5MB, Cloudinary suporta)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
          return NextResponse.json(
            { error: `Arquivo muito grande: ${file.name}. Máximo 5MB` },
            { status: 400 }
          )
        }

        const bytes = await file.arrayBuffer()
        const originalBuffer = Buffer.from(bytes)
        const originalSizeKB = (originalBuffer.length / 1024).toFixed(2)

        // Processar imagem com Sharp antes do upload
        const timestamp = Date.now()
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
        const baseFilename = `${timestamp}-${originalName.replace(/\.[^/.]+$/, "")}`

        // Comprimir imagem principal: WebP, qualidade 80%, max 1200px largura (Cloudinary otimiza depois)
        const compressedBuffer = await sharp(originalBuffer)
          .resize(1200, null, {
            withoutEnlargement: true,
            fit: "inside",
          })
          .webp({ quality: 80 })
          .toBuffer()

        const compressedSizeKB = (compressedBuffer.length / 1024).toFixed(2)

        // Gerar thumbnail: 200px para listagens
        const thumbnailBuffer = await sharp(originalBuffer)
          .resize(200, 200, {
            fit: "cover",
            position: "center",
          })
          .webp({ quality: 75 })
          .toBuffer()

        // Upload para Cloudinary
        console.log(`[Upload] Fazendo upload para Cloudinary: ${baseFilename}`)
        
        // Upload da imagem principal
        const imageUrl = await uploadToCloudinary(
          compressedBuffer,
          folder,
          baseFilename
        )

        // Upload da thumbnail (opcional - Cloudinary pode gerar thumbnails on-demand)
        // Mas vamos fazer upload para ter controle
        const thumbnailPublicId = `${baseFilename}-thumb`
        await uploadThumbnailToCloudinary(
          thumbnailBuffer,
          folder,
          thumbnailPublicId
        )

        // Log de compressão e upload
        console.log(
          JSON.stringify({
            type: "IMAGE_UPLOAD_CLOUDINARY",
            filename: file.name,
            original_size_kb: originalSizeKB,
            compressed_size_kb: compressedSizeKB,
            reduction_percent: (
              ((originalBuffer.length - compressedBuffer.length) / originalBuffer.length) *
              100
            ).toFixed(2),
            cloudinary_url: imageUrl,
            os_id: osId,
          })
        )

        uploadedFiles.push(imageUrl)
      } catch (error) {
        console.error(`[Upload] Erro ao processar arquivo ${file.name}:`, error)
        return NextResponse.json(
          { error: `Erro ao fazer upload de ${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}` },
          { status: 500 }
        )
      }
    }

    const responseData = { urls: uploadedFiles }
    
    // Logging de consumo de banda
    const startTime = Date.now()
    const responseSize = Buffer.byteLength(JSON.stringify(responseData), "utf8")
    const duration = Date.now() - startTime
    
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        method: "POST",
        url: request.nextUrl.pathname,
        ip: getIPForLogging(request),
        status: 200,
        size_kb: (responseSize / 1024).toFixed(2),
        duration_ms: duration,
        files_uploaded: uploadedFiles.length,
        ...(responseSize > 1024 * 1024 && { alert: "LARGE_RESPONSE" }), // > 1MB
      })
    )

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error uploading files:", error)
    return NextResponse.json(
      { error: "Erro ao fazer upload dos arquivos" },
      { status: 500 }
    )
  }
}
