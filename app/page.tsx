"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSession } from "@/lib/utils/auth"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const session = getSession()
    
    // Se já estiver logado, redirecionar para o painel apropriado
    if (session) {
      if (session.user.role === "ADMIN") {
        router.push("/admin")
      } else {
        router.push("/operador")
      }
    } else {
      // Se não estiver logado, redirecionar para login
      router.push("/login")
    }
  }, [router])

  // Mostrar loading enquanto redireciona
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#ededed]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando...</p>
      </div>
    </div>
  )
}
