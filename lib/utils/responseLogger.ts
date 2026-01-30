import type { NextRequest } from "next/server"

/**
 * Helper para obter tamanho aproximado de um objeto JSON
 */
export function getJsonSize(obj: unknown): number {
  return Buffer.byteLength(JSON.stringify(obj), "utf8")
}

/**
 * Helper para obter IP do request
 */
export function getClientIP(request: NextRequest): string {
  // Tentar obter IP de headers comuns (proxies, load balancers)
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  const realIP = request.headers.get("x-real-ip")
  if (realIP) {
    return realIP
  }

  // Fallback para IP do request (pode não estar disponível em serverless)
  return request.ip || "unknown"
}
