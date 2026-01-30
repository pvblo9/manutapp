import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { rateLimiter, getClientIP } from "@/lib/utils/rateLimit"

export function middleware(request: NextRequest) {
  // Aplicar rate limiting apenas para rotas de API
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const ip = getClientIP(request)
    
    // Rate limit: 100 requisições por 15 minutos por IP
    const result = rateLimiter.check(ip, 100, 15 * 60 * 1000)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "Muitas requisições. Tente novamente mais tarde.",
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": "100",
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
          },
        }
      )
    }

    // Adicionar headers de rate limit nas respostas
    const response = NextResponse.next()
    response.headers.set("X-RateLimit-Limit", "100")
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
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
}
