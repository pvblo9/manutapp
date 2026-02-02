"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/forms/LoginForm"
import { getSession } from "@/lib/utils/auth"

export default function LoginPage() {
  const router = useRouter()
  const hasChecked = useRef(false)

  useEffect(() => {
    // Evitar múltiplas execuções
    if (hasChecked.current) {
      return
    }
    
    console.log("[LoginPage] Verificando sessão existente")
    const session = getSession()
    if (session) {
      console.log("[LoginPage] Sessão encontrada, redirecionando")
      hasChecked.current = true
      // Redirecionar se já estiver logado
      if (session.user.role === "ADMIN") {
        router.push("/admin")
      } else {
        router.push("/operador")
      }
    } else {
      console.log("[LoginPage] Nenhuma sessão encontrada")
      hasChecked.current = true
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#ededed]">
      <LoginForm />
    </div>
  )
}
