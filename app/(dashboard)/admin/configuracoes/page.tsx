"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { AppLayout } from "@/components/layout/AppLayout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Role } from "@prisma/client"
import { Settings, Users, DollarSign, Plus, Eye, Key } from "lucide-react"
import type { Configuration, User, Budget } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function ConfiguracoesPage() {
  const { user, isLoading } = useAuth("ADMIN")
  const router = useRouter()
  const [configurations, setConfigurations] = useState<Record<string, Configuration>>({})
  const [users, setUsers] = useState<User[]>([])
  const [budget, setBudget] = useState<Budget | null>(null)
  const [activeTab, setActiveTab] = useState<
    "config" | "users" | "budget"
  >("config")
  const [newUser, setNewUser] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "OPERATOR" as Role,
  })
  const [editingConfig, setEditingConfig] = useState<string | null>(null)
  const [configValues, setConfigValues] = useState("")
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear())
  const [budgetAmount, setBudgetAmount] = useState("")
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [configRes, usersRes, budgetRes] = await Promise.all([
        fetch("/api/configurations"),
        fetch("/api/users"),
        fetch(`/api/budget?year=${new Date().getFullYear()}`),
      ])

      const configData = await configRes.json()
      const usersData = await usersRes.json()
      const budgetData = await budgetRes.json()

      const configMap: Record<string, Configuration> = {}
      configData.forEach((config: Configuration) => {
        configMap[config.type] = config
      })
      setConfigurations(configMap)
      setUsers(usersData)
      setBudget(budgetData)
      setBudgetYear(budgetData.year || new Date().getFullYear())
      setBudgetAmount(budgetData.totalAmount?.toString() || "")
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
    }
  }

  const handleSaveConfig = async (type: string) => {
    const values = configValues
      .split("\n")
      .map((v) => v.trim().toUpperCase())
      .filter((v) => v.length > 0)

    try {
      const response = await fetch("/api/configurations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type, values }),
      })

      if (!response.ok) {
        throw new Error("Erro ao salvar configuração")
      }

      setEditingConfig(null)
      setConfigValues("")
      fetchData()
      alert("Configuração salva com sucesso!")
    } catch {
      alert("Erro ao salvar configuração")
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.email || !newUser.password) {
      alert("Preencha todos os campos")
      return
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao criar usuário")
      }

      setNewUser({ name: "", username: "", email: "", password: "", role: "OPERATOR" })
      fetchData()
      alert("Usuário criado com sucesso!")
    } catch (err: unknown) {
      const error = err as { message?: string }
      alert(error.message || "Erro ao criar usuário")
    }
  }

  const handleSaveBudget = async () => {
    if (!budgetAmount) {
      alert("Informe o valor do budget")
      return
    }

    try {
      const response = await fetch("/api/budget", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          year: budgetYear,
          totalAmount: parseFloat(budgetAmount),
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao salvar budget")
      }

      fetchData()
      alert("Budget salvo com sucesso!")
    } catch {
      alert("Erro ao salvar budget")
    }
  }

  const handleViewPassword = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}`)
      const userData = await response.json()
      setSelectedUser(userData)
      setPasswordDialogOpen(true)
      setNewPassword("")
      setShowPassword(false)
    } catch {
      alert("Erro ao buscar informações do usuário")
    }
  }

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      alert("Informe uma nova senha")
      return
    }

    if (newPassword.length < 6) {
      alert("A senha deve ter pelo menos 6 caracteres")
      return
    }

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao redefinir senha")
      }

      alert("Senha redefinida com sucesso!")
      setPasswordDialogOpen(false)
      setSelectedUser(null)
      setNewPassword("")
    } catch {
      alert("Erro ao redefinir senha")
    }
  }

  const configTypes = [
    { key: "machine", label: "Máquinas" },
    { key: "machineCode", label: "Códigos de Máquina" },
    { key: "maintenanceType", label: "Tipos de Manutenção" },
    { key: "situation", label: "Situações" },
    { key: "contactPerson", label: "Pessoas de Contato" },
    { key: "sector", label: "Setores" },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout userRole="ADMIN">
      <div className="mb-8">
        <h1 className="font-display font-bold text-4xl text-gray-900 mb-2">
          Configurações
        </h1>
        <p className="text-gray-600">Gerencie o sistema</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab("config")}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === "config"
              ? "bg-primary-500/10 text-primary-600 shadow-md"
              : "bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-white/80 border border-gray-200"
          }`}
        >
          <Settings size={18} className="inline mr-2" />
          Configurações
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === "users"
              ? "bg-primary-500/10 text-primary-600 shadow-md"
              : "bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-white/80 border border-gray-200"
          }`}
        >
          <Users size={18} className="inline mr-2" />
          Usuários
        </button>
        <button
          onClick={() => setActiveTab("budget")}
          className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            activeTab === "budget"
              ? "bg-primary-500/10 text-primary-600 shadow-md"
              : "bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-white/80 border border-gray-200"
          }`}
        >
          <DollarSign size={18} className="inline mr-2" />
          Budget
        </button>
      </div>

      {/* Aba de Configurações */}
      {activeTab === "config" && (
        <div className="space-y-4">
          {configTypes.map((configType) => {
            const config = configurations[configType.key]
            const isEditing = editingConfig === configType.key

            return (
              <div key={configType.key} className="card-glass">
                <div className="mb-4">
                  <h3 className="font-display font-bold text-lg text-gray-900 mb-1">
                    {configType.label}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Gerencie as opções disponíveis para {configType.label.toLowerCase()}
                  </p>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-700 mb-2 block">
                        Valores (um por linha)
                      </Label>
                      <Textarea
                        rows={5}
                        value={configValues}
                        onChange={(e) => setConfigValues(e.target.value.toUpperCase())}
                        placeholder="Digite um valor por linha"
                        className="input-modern resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveConfig(configType.key)}
                        className="btn-primary"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => {
                          setEditingConfig(null)
                          setConfigValues("")
                        }}
                        className="btn-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Valores atuais:</p>
                      {config?.values && config.values.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {config.values.map((value: string, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-primary-500/10 text-primary-500 rounded-full text-sm"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Nenhum valor configurado
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditingConfig(configType.key)
                        setConfigValues(config?.values?.join("\n") || "")
                      }}
                      className="btn-secondary"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Aba de Usuários */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="card-glass">
            <div className="mb-6">
              <h3 className="font-display font-bold text-xl text-gray-900 mb-2">
                Criar Novo Usuário
              </h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="userName" className="text-gray-700 mb-2 block">
                  Nome
                </Label>
                <Input
                  id="userName"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="input-modern"
                />
              </div>
              <div>
                <Label htmlFor="userUsername" className="text-gray-700 mb-2 block">
                  Nome de Usuário
                </Label>
                <Input
                  id="userUsername"
                  type="text"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  placeholder="usuario_exemplo"
                  className="input-modern"
                />
              </div>
              <div>
                <Label htmlFor="userEmail" className="text-gray-700 mb-2 block">
                  Email
                </Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="input-modern"
                />
              </div>
              <div>
                <Label htmlFor="userPassword" className="text-gray-700 mb-2 block">
                  Senha
                </Label>
                <Input
                  id="userPassword"
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="input-modern"
                />
              </div>
              <div>
                <Label htmlFor="userRole" className="text-gray-700 mb-2 block">
                  Perfil
                </Label>
                <Select
                  id="userRole"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      role: e.target.value as Role,
                    })
                  }
                  className="input-modern"
                >
                  <option value="OPERATOR">Operador</option>
                  <option value="ADMIN">Administrador</option>
                </Select>
              </div>
            </div>
            <button onClick={handleCreateUser} className="btn-primary mt-6">
              <Plus size={18} className="inline mr-2" />
              Criar Usuário
            </button>
          </div>

          <div className="card-glass">
            <div className="mb-6">
              <h3 className="font-display font-bold text-xl text-gray-900 mb-2">
                Usuários Cadastrados
              </h3>
            </div>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">
                      @{user.username} - {user.email} -{" "}
                      {user.role === "ADMIN" ? "Administrador" : "Operador"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleViewPassword(user)}
                    className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 rounded-lg transition-colors flex items-center gap-2"
                    title="Ver/Redefinir Senha"
                  >
                    <Key size={16} />
                    <span className="text-sm font-semibold">Senha</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Aba de Budget */}
      {activeTab === "budget" && (
        <div className="card-glass">
          <div className="mb-6">
            <h3 className="font-display font-bold text-xl text-gray-900 mb-2">
              Budget Anual
            </h3>
            <p className="text-gray-600 text-sm">
              Defina o budget anual. O sistema calculará automaticamente o
              budget mensal (total / 12)
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="budgetYear" className="text-gray-700 mb-2 block">
                Ano
              </Label>
              <Input
                id="budgetYear"
                type="number"
                value={budgetYear}
                onChange={(e) => setBudgetYear(parseInt(e.target.value))}
                className="input-modern"
              />
            </div>
            <div>
              <Label htmlFor="budgetAmount" className="text-gray-700 mb-2 block">
                Valor Total (R$)
              </Label>
              <Input
                id="budgetAmount"
                type="number"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="input-modern"
              />
            </div>
          </div>
          {budget && budget.monthlyAmount > 0 && (
            <div className="mt-6 p-4 bg-primary-500/10 rounded-xl border border-primary-500/20">
              <p className="text-sm text-gray-700">
                <strong className="text-primary-500">Budget Mensal:</strong> R${" "}
                {budget.monthlyAmount.toFixed(2)}
              </p>
            </div>
          )}
          <button onClick={handleSaveBudget} className="btn-primary mt-6">
            Salvar Budget
          </button>
        </div>
      )}

      {/* Modal de Senha */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="bg-white/90 backdrop-blur-xl text-gray-900 border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-gray-900">
              Gerenciar Senha - {selectedUser?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {selectedUser && (
                <>
                  <p className="mt-2">Usuário: @{selectedUser.username}</p>
                  <p>Email: {selectedUser.email}</p>
                  <p className="mt-4 text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <strong>⚠️ Atenção:</strong> As senhas são armazenadas de forma criptografada e não podem ser recuperadas. 
                    Você pode apenas redefinir uma nova senha.
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="newPassword" className="text-gray-700 mb-2 block">
                Nova Senha <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  className="input-modern pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <Eye size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mínimo de 6 caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false)
                setSelectedUser(null)
                setNewPassword("")
              }}
              className="btn-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword.length < 6}
              className="btn-primary"
            >
              Redefinir Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
