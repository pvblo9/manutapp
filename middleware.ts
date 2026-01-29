import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
}
