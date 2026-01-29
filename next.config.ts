import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Otimização para produção
  output: 'standalone',
  // Configurações de segurança
  poweredByHeader: false,
  // Compressão
  compress: true,
};

export default nextConfig;
