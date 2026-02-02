import { v2 as cloudinary } from 'cloudinary'

/**
 * Configuração do Cloudinary
 * Variáveis de ambiente necessárias:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Sempre usar HTTPS
})

/**
 * Upload de imagem para Cloudinary
 * @param buffer - Buffer da imagem
 * @param folder - Pasta no Cloudinary (ex: "manutapp/os-photos")
 * @param publicId - ID público da imagem (opcional)
 * @returns URL da imagem no Cloudinary
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string = 'manutapp/os-photos',
  publicId?: string
): Promise<string> {
  try {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: 'image' as const,
        format: 'webp',
        transformation: [
          {
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
      }

      if (publicId) {
        uploadOptions.public_id = publicId
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('[Cloudinary] Erro no upload:', error)
            reject(error)
            return
          }

          if (!result || !result.secure_url) {
            reject(new Error('Upload falhou: URL não retornada'))
            return
          }

          console.log(`[Cloudinary] Upload bem-sucedido: ${result.secure_url}`)
          resolve(result.secure_url)
        }
      )

      uploadStream.end(buffer)
    })
  } catch (error) {
    console.error('[Cloudinary] Erro ao fazer upload:', error)
    throw error
  }
}

/**
 * Upload de thumbnail para Cloudinary
 * @param buffer - Buffer da imagem
 * @param folder - Pasta no Cloudinary
 * @param publicId - ID público da imagem (deve incluir sufixo como "-thumb")
 * @returns URL da thumbnail no Cloudinary
 */
export async function uploadThumbnailToCloudinary(
  buffer: Buffer,
  folder: string = 'manutapp/os-photos',
  publicId: string
): Promise<string> {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image' as const,
          format: 'webp',
          public_id: publicId,
          transformation: [
            {
              width: 200,
              height: 200,
              crop: 'fill',
              quality: 'auto',
              fetch_format: 'auto',
            },
          ],
        },
        (error, result) => {
          if (error) {
            console.error('[Cloudinary] Erro no upload da thumbnail:', error)
            reject(error)
            return
          }

          if (!result || !result.secure_url) {
            reject(new Error('Upload da thumbnail falhou: URL não retornada'))
            return
          }

          console.log(`[Cloudinary] Thumbnail upload bem-sucedido: ${result.secure_url}`)
          resolve(result.secure_url)
        }
      )

      uploadStream.end(buffer)
    })
  } catch (error) {
    console.error('[Cloudinary] Erro ao fazer upload da thumbnail:', error)
    throw error
  }
}

/**
 * Deletar imagem do Cloudinary
 * @param publicId - ID público da imagem (sem extensão)
 * @param folder - Pasta no Cloudinary
 */
export async function deleteFromCloudinary(
  publicId: string,
  folder: string = 'manutapp/os-photos'
): Promise<void> {
  try {
    const fullPublicId = folder ? `${folder}/${publicId}` : publicId
    const result = await cloudinary.uploader.destroy(fullPublicId)
    
    if (result.result === 'ok') {
      console.log(`[Cloudinary] Imagem deletada: ${fullPublicId}`)
    } else {
      console.warn(`[Cloudinary] Falha ao deletar: ${fullPublicId}`, result)
    }
  } catch (error) {
    console.error('[Cloudinary] Erro ao deletar imagem:', error)
    throw error
  }
}

export { cloudinary }
