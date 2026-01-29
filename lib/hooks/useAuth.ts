"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getSession, clearSession } from "@/lib/utils/auth"
import type { User } from "@/types"

export function useAuth(requiredRole?: "ADMIN" | "OPERATOR") {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const session = useMemo(() => getSession(), [])

  useEffect(() => {
    // Usar função para evitar setState síncrono
    const checkAuth = () => {
    if (!session) {
      router.push("/login")
        setIsLoading(false)
      return
    }

    // Verificar se o role requerido corresponde ao role do usuário
    if (requiredRole === "ADMIN" && session.user.role !== "ADMIN") {
      router.push("/operador")
        setIsLoading(false)
      return
    }

    if (requiredRole === "OPERATOR" && session.user.role !== "OPERATOR") {
      // Se for admin tentando acessar painel de operador, redirecionar para admin
      if (session.user.role === "ADMIN") {
        router.push("/admin")
          setIsLoading(false)
        return
      }
      router.push("/login")
        setIsLoading(false)
      return
    }

      // Set state após todas as verificações
      setUser(session.user as User)
    setIsLoading(false)
    }

    checkAuth()
  }, [router, requiredRole, session])

  const logout = () => {
    clearSession()
    router.push("/login")
  }

  return { user, isLoading, logout }
}
