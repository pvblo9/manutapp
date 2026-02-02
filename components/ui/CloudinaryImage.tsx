"use client"

import { CldImage } from 'next-cloudinary'
import Image from 'next/image'

interface CloudinaryImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  loading?: 'lazy' | 'eager'
  onClick?: () => void
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

/**
 * Componente que detecta automaticamente se a imagem é do Cloudinary
 * e usa CldImage para otimização, ou Image normal para URLs externas
 */
export function CloudinaryImage({
  src,
  alt,
  width,
  height,
  className,
  loading = 'lazy',
  onClick,
  placeholder,
  blurDataURL,
}: CloudinaryImageProps) {
  // Verificar se a URL é do Cloudinary
  const isCloudinaryUrl = src.includes('cloudinary.com') || src.includes('res.cloudinary.com')

  if (isCloudinaryUrl) {
    // Extrair o public_id da URL do Cloudinary
    // Formato: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/image.webp
    // ou: https://res.cloudinary.com/cloud_name/image/upload/folder/image.webp
    try {
      const url = new URL(src)
      const pathParts = url.pathname.split('/')
      const uploadIndex = pathParts.findIndex(part => part === 'upload')
      
      if (uploadIndex !== -1 && uploadIndex < pathParts.length - 1) {
        // Pegar tudo depois de 'upload'
        const pathAfterUpload = pathParts.slice(uploadIndex + 1).join('/')
        // Remover extensão e versão se houver
        const publicId = pathAfterUpload
          .replace(/^v\d+\//, '') // Remove versão (v1234567890/)
          .replace(/\.(webp|jpg|jpeg|png|gif)$/i, '') // Remove extensão

        return (
          <CldImage
            src={publicId}
            alt={alt}
            width={width}
            height={height}
            className={className}
            loading={loading}
            onClick={onClick}
            crop={{
              type: 'auto',
              source: true,
            }}
            format="auto"
            quality="auto"
          />
        )
      }
    } catch (error) {
      console.warn('[CloudinaryImage] Erro ao processar URL do Cloudinary:', error)
      // Fallback para Image normal se houver erro
    }
  }

  // Para URLs não-Cloudinary (compatibilidade com fotos antigas ou externas)
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={loading}
      onClick={onClick}
      placeholder={placeholder}
      blurDataURL={blurDataURL}
    />
  )
}
