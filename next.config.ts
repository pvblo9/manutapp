import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Otimização para produção
  output: 'standalone',
  // Configurações de segurança
  poweredByHeader: false,
  // Compressão
  compress: true,
  
  // Otimizações de imagem
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 1 dia
    // Configuração de segurança: restringir remotePatterns para prevenir SSRF
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // Cloudinary CDN
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com', // Subdomínios do Cloudinary
      },
    ],
    // Limitar tamanho máximo de imagem para prevenir DoS
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Cache headers para assets estáticos
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
