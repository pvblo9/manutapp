/**
 * Rate Limiter in-memory simples
 * Para produção, considere usar Redis (@upstash/ratelimit)
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Limpar entradas expiradas a cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Verifica se o IP pode fazer requisição
   * @param identifier - IP ou userId
   * @param limit - Número máximo de requisições
   * @param windowMs - Janela de tempo em milissegundos
   * @returns { allowed: boolean, remaining: number, resetAt: number }
   */
  check(
    identifier: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const entry = this.store.get(identifier)

    if (!entry || now > entry.resetAt) {
      // Criar nova entrada
      const resetAt = now + windowMs
      this.store.set(identifier, {
        count: 1,
        resetAt,
      })
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
      }
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      }
    }

    // Incrementar contador
    entry.count++
    this.store.set(identifier, entry)

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    }
  }

  /**
   * Limpa entradas expiradas
   */
  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Limpa todas as entradas (útil para testes)
   */
  clear() {
    this.store.clear()
  }
}

// Instância singleton
export const rateLimiter = new RateLimiter()

import type { NextRequest } from "next/server"

/**
 * Helper para obter IP do request
 */
export function getClientIP(request: NextRequest | { headers: { get: (name: string) => string | null }; ip?: string }): string {
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
  if ("ip" in request && request.ip) {
    return request.ip
  }
  
  return "unknown"
}

