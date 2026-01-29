"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/forms/LoginForm"
import { getSession } from "@/lib/utils/auth"

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    const session = getSession()
    if (session) {
      // Redirecionar se já estiver logado
      if (session.user.role === "ADMIN") {
        router.push("/admin")
      } else {
        router.push("/operador")
      }
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#ededed]">
      <LoginForm />
    </div>
  )
}
