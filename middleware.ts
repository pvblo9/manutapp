import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { rateLimiter, getClientIP } from "@/lib/utils/rateLimit"

export function middleware(request: NextRequest) {
  // Ignorar requisições OPTIONS (preflight) para evitar contagem dupla
  if (request.method === "OPTIONS") {
    return NextResponse.next()
  }

  // Aplicar rate limiting apenas para rotas de API
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip = getClientIP(request)
    
    // Whitelist para localhost em desenvolvimento
    const isLocalhost = ip === "127.0.0.1" || ip === "::1" || ip === "localhost" || ip.startsWith("192.168.") || ip.startsWith("10.")
    const isDevelopment = process.env.NODE_ENV === "development"
    
    if (isLocalhost && isDevelopment) {
      // Em desenvolvimento local, não aplicar rate limiting
      return NextResponse.next()
    }
    
    // Log para debug (apenas em desenvolvimento)
    if (isDevelopment && request.nextUrl.pathname === "/api/auth/login") {
      console.log(`[Middleware] Rate limit check - IP: ${ip}, Path: ${request.nextUrl.pathname}, Method: ${request.method}`)
    }
    
    // Rate limit: 1000 requisições por 15 minutos por IP
    const result = rateLimiter.check(ip, 1000, 15 * 60 * 1000)

    if (isDevelopment && request.nextUrl.pathname === "/api/auth/login") {
      console.log(`[Middleware] Rate limit result - Allowed: ${result.allowed}, Remaining: ${result.remaining}, Count: ${result.remaining < 1000 ? 1000 - result.remaining : 0}`)
    }

    if (!result.allowed) {
      console.warn(`[Middleware] Rate limit excedido - IP: ${ip}, Path: ${request.nextUrl.pathname}`)
      return NextResponse.json(
        {
          error: "Muitas requisições. Tente novamente mais tarde.",
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": "1000",
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
          },
        }
      )
    }

    // Adicionar headers de rate limit nas respostas
    const response = NextResponse.next()
    response.headers.set("X-RateLimit-Limit", "1000")
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString())
    response.headers.set("X-RateLimit-Reset", new Date(result.resetAt).toISOString())
    
    return response
  }

  // Permitir acesso público à página de login e criação de OS
  if (
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname.startsWith("/os/")
  ) {
    return NextResponse.next()
  }

  // Para outras rotas, a verificação será feita no cliente
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (uploaded files)
     * - public files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
}
