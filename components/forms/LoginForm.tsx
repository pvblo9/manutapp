"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn, Eye, EyeOff } from "lucide-react"

const loginSchema = z.object({
  username: z.string().min(1, "Nome de usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    // Proteção contra múltiplos submits
    if (isLoading) {
      console.log("[LoginForm] Submit bloqueado - já está processando")
      return
    }

    setIsLoading(true)
    setError(null)

    console.log("[LoginForm] Iniciando login - timestamp:", new Date().toISOString())

    try {
      // Converter username e password para lowercase
      const loginData = {
        username: data.username.toLowerCase().trim(),
        password: data.password.toLowerCase().trim(),
      }

      console.log("[LoginForm] Fazendo requisição para /api/auth/login")
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      })

      console.log("[LoginForm] Resposta recebida - status:", response.status)
      const result = await response.json()

      if (!response.ok) {
        console.error("[LoginForm] Erro no login:", result.error)
        setError(result.error || "Erro ao fazer login")
        setIsLoading(false)
        return
      }

      console.log("[LoginForm] Login bem-sucedido, salvando sessão")
      // Salvar sessão
      localStorage.setItem("session", JSON.stringify(result))
      
      // Redirecionar baseado no role
      if (result.user.role === "ADMIN") {
        router.push("/admin")
      } else {
        router.push("/operador")
      }
    } catch (error) {
      console.error("[LoginForm] Erro ao conectar com o servidor:", error)
      setError("Erro ao conectar com o servidor")
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/40 shadow-soft">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft">
            <span className="text-white font-display font-bold text-2xl">M</span>
          </div>
          <CardTitle className="text-3xl font-display font-bold text-gray-900">
            ManutApp
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            Sistema de Gestão de Manutenção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">
                Nome de Usuário
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="seu_usuario"
                {...register("username", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toLowerCase()
                  },
                })}
                className="input-modern"
              />
              {errors.username && (
                <p className="text-sm text-red-500">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password", {
                    onChange: (e) => {
                      e.target.value = e.target.value.toLowerCase()
                    },
                  })}
                  className="input-modern pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                "Entrando..."
              ) : (
                <>
                  <LogIn size={18} className="mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
  )
}
