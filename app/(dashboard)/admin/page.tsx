"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CloudinaryImage } from "@/components/ui/CloudinaryImage"
import Image from "next/image"
import { useAuth } from "@/lib/hooks/useAuth"
import { KanbanBoard } from "@/components/kanban/KanbanBoard"
import { AppLayout } from "@/components/layout/AppLayout"
import { FloatingActionButton } from "@/components/ui/FloatingActionButton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ServiceOrderForm } from "@/components/forms/ServiceOrderForm"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Priority } from "@prisma/client"
import type { ServiceOrder, User, OSHistory } from "@/types"

// Helper para fazer fetch suprimindo erros de rate limit
const fetchWithRateLimitHandling = async (url: string, options?: RequestInit): Promise<Response> => {
  try {
    const response = await fetch(url, options)
    // Se for rate limit, retornar response normalmente mas marcar
    if (response.status === 429) {
      return response // Retornar response mesmo com 429 para evitar logs do navegador
    }
    return response
  } catch (error: any) {
    // Se o erro for relacionado a rate limit, criar uma resposta fake
    if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Too Many Requests")) {
      return { ok: false, status: 429 } as Response
    }
    throw error
  }
}

// Componente interno para usar useSearchParams (requer Suspense no Next.js 15)
function AdminPageContent() {
  const { user, isLoading } = useAuth("ADMIN")
  const router = useRouter()
  const searchParams = useSearchParams()
  // Criar uma versão estável do osId para usar nas dependências
  const osIdFromUrl = searchParams?.get("osId") || null
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([])
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [costDialogOpen, setCostDialogOpen] = useState(false)
  const [cost, setCost] = useState("")
  const [costNfFile, setCostNfFile] = useState<File | null>(null)
  const [costNfPreview, setCostNfPreview] = useState<string | null>(null)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completionNote, setCompletionNote] = useState("")
  const [nfFile, setNfFile] = useState<File | null>(null)
  const [nfPreview, setNfPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [technicians, setTechnicians] = useState<User[]>([])
  const [history, setHistory] = useState<OSHistory[]>([])
  const [newComment, setNewComment] = useState("")
  const [commentPhotos, setCommentPhotos] = useState<File[]>([])
  const [commentPhotoPreviews, setCommentPhotoPreviews] = useState<string[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  const fetchTechnicians = useCallback(async () => {
    try {
      const response = await fetchWithRateLimitHandling("/api/users")
      
      // Verificar rate limit primeiro
      if (response.status === 429) {
        // Rate limit - retornar silenciosamente
        return
      }
      
      if (!response.ok) {
        // Para outros erros, logar e limpar estado
        console.error("Erro ao buscar usuários:", response.status, response.statusText)
        setTechnicians([])
        return
      }
      
      const data = await response.json()
      
      // Verificar se data é um array antes de fazer filter
      if (data && Array.isArray(data)) {
        setTechnicians(data.filter((u: User) => u.role === "OPERATOR"))
      } else {
        console.error("Resposta da API não é um array:", data)
        setTechnicians([])
      }
    } catch (error: any) {
      // Ignorar erros de rate limit no catch também
      if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Too Many Requests")) {
        return
      }
      console.error("Erro ao buscar operadores:", error)
      setTechnicians([])
    }
  }, [])

  const fetchServiceOrders = useCallback(async (page = 1, limit = 50) => {
    if (!user) return
    try {
      const response = await fetchWithRateLimitHandling(
        `/api/service-orders?userId=${user.id}&userRole=${user.role}&page=${page}&limit=${limit}`
      )
      
      // Verificar rate limit primeiro
      if (response.status === 429) {
        // Rate limit - retornar silenciosamente
        return
      }
      
      if (!response.ok) {
        // Para outros erros, logar e limpar estado
        console.error("Erro ao buscar OS:", response.status, response.statusText)
        setServiceOrders([])
        return
      }
      
      const result = await response.json()
      
      // API agora retorna { data, pagination }
      if (result.data && Array.isArray(result.data)) {
        setServiceOrders(result.data)
      } else if (Array.isArray(result)) {
        // Fallback para compatibilidade com formato antigo
        setServiceOrders(result)
      } else {
        console.error("Resposta da API não contém array de serviceOrders:", result)
        setServiceOrders([])
      }
    } catch (error: any) {
      // Ignorar erros de rate limit no catch também
      if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Too Many Requests")) {
        return
      }
      console.error("Erro ao buscar OS:", error)
      setServiceOrders([])
    }
  }, [user])

  const fetchHistory = useCallback(async (osId: string) => {
    try {
      const response = await fetch(`/api/service-orders/${osId}/history`)
      const data = await response.json()
      setHistory(data)
    } catch (error) {
      console.error("Erro ao buscar histórico:", error)
    }
  }, [])

  useEffect(() => {
    if (user) {
      // Buscar dados em paralelo para melhor performance
      Promise.all([fetchTechnicians(), fetchServiceOrders()])
    }
  }, [user, fetchTechnicians, fetchServiceOrders])

  // Abrir OS automaticamente se houver osId na URL
  useEffect(() => {
    if (osIdFromUrl && serviceOrders.length > 0 && !viewDialogOpen) {
      const os = serviceOrders.find((o) => o.id === osIdFromUrl)
      if (os) {
        setSelectedOS(os)
        setViewDialogOpen(true)
        fetchHistory(os.id)
        // Limpar o query param da URL após abrir
        router.replace("/admin", { scroll: false })
      }
    }
  }, [osIdFromUrl, serviceOrders, viewDialogOpen, router, fetchHistory])

  const handleView = (os: ServiceOrder) => {
    setSelectedOS(os)
    setViewDialogOpen(true)
    fetchHistory(os.id)
  }

  const handleCommentPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 5) {
      alert("Máximo de 5 fotos")
      return
    }

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    const invalidFiles = files.filter(f => !validTypes.includes(f.type))
    if (invalidFiles.length > 0) {
      alert("Apenas imagens JPG, PNG ou WEBP são permitidas")
      return
    }

    setCommentPhotos(files)

    // Criar previews
    const previews: string[] = []
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        previews.push(e.target?.result as string)
        if (previews.length === files.length) {
          setCommentPhotoPreviews(previews)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleAddComment = async () => {
    if (!selectedOS || !user || !newComment.trim()) return

    setIsSubmitting(true)
    try {
      let photoUrls: string[] = []

      // Upload de fotos se houver
      if (commentPhotos.length > 0) {
        const formData = new FormData()
        commentPhotos.forEach(file => {
          formData.append("files", file)
        })
        formData.append("osId", selectedOS.id)

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error("Erro ao fazer upload das fotos")
        }

        const uploadResult = await uploadResponse.json()
        photoUrls = uploadResult.urls
      }

      // Criar entrada no histórico
      const historyResponse = await fetch(`/api/service-orders/${selectedOS.id}/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          message: newComment,
          photos: photoUrls,
        }),
      })

      if (!historyResponse.ok) {
        throw new Error("Erro ao adicionar comentário")
      }

      const newHistoryEntry = await historyResponse.json()
      setHistory([...history, newHistoryEntry])
      setNewComment("")
      setCommentPhotos([])
      setCommentPhotoPreviews([])
      fetchServiceOrders()
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error)
      alert("Erro ao adicionar comentário")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (os: ServiceOrder) => {
    setSelectedOS(os)
    setEditDialogOpen(true)
  }

  const handleEditSubmit = async (data: Partial<ServiceOrder>) => {
    if (!selectedOS) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/service-orders/${selectedOS.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Erro ao atualizar OS")
      }

      setEditDialogOpen(false)
      setSelectedOS(null)
      fetchServiceOrders()
      alert("OS atualizada com sucesso!")
    } catch {
      alert("Erro ao atualizar OS")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async (os: ServiceOrder) => {
    if (!confirm("Tem certeza que deseja cancelar esta OS?")) return

    try {
      const response = await fetch(`/api/service-orders/${os.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "CANCELLED",
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao cancelar OS")
      }

      fetchServiceOrders()
      alert("OS cancelada com sucesso!")
    } catch {
      alert("Erro ao cancelar OS")
    }
  }

  const handleAddCost = (os: ServiceOrder) => {
    setSelectedOS(os)
    setCost(os.cost?.toString() || "")
    setCostNfFile(null)
    setCostNfPreview(null)
    setCostDialogOpen(true)
  }

  const handleCostNfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo
      const validTypes = ["image/jpeg", "image/jpg", "application/pdf"]
      if (!validTypes.includes(file.type)) {
        alert("Por favor, selecione um arquivo JPG ou PDF")
        return
      }

      // Validar tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("Arquivo muito grande. Máximo 10MB")
        return
      }

      setCostNfFile(file)

      // Criar preview se for imagem
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setCostNfPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setCostNfPreview(null)
      }
    }
  }

  const handleCostSubmit = async () => {
    if (!selectedOS) return

    setIsSubmitting(true)
    try {
      let nfDocumentUrl = selectedOS.nfDocument || null

      // Fazer upload do documento NF se houver
      if (costNfFile) {
        const formData = new FormData()
        formData.append("file", costNfFile)
        formData.append("osId", selectedOS.id)

        const uploadResponse = await fetch("/api/upload-nf", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error("Erro ao fazer upload do documento NF")
        }

        const uploadResult = await uploadResponse.json()
        nfDocumentUrl = uploadResult.url
      }

      // Atualizar OS com custo e NF
      const response = await fetch(`/api/service-orders/${selectedOS.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cost: parseFloat(cost) || 0,
          nfDocument: nfDocumentUrl,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao adicionar custo")
      }

      setCostDialogOpen(false)
      setSelectedOS(null)
      setCost("")
      setCostNfFile(null)
      setCostNfPreview(null)
      fetchServiceOrders()
      alert("Custo adicionado com sucesso!")
    } catch (error) {
      console.error("Erro ao adicionar custo:", error)
      alert("Erro ao adicionar custo")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = (os: ServiceOrder) => {
    setSelectedOS(os)
    setCompletionNote("")
    setNfFile(null)
    setNfPreview(null)
    setCompleteDialogOpen(true)
  }

  const handleCompleteSubmit = async () => {
    if (!selectedOS) return

    setIsSubmitting(true)
    try {
      let nfDocumentUrl = selectedOS.nfDocument || null

      // Fazer upload do documento NF se houver
      if (nfFile) {
        const formData = new FormData()
        formData.append("file", nfFile)
        formData.append("osId", selectedOS.id)

        const uploadResponse = await fetch("/api/upload-nf", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error("Erro ao fazer upload do documento NF")
        }

        const uploadResult = await uploadResponse.json()
        nfDocumentUrl = uploadResult.url
      }

      // Finalizar OS
      const response = await fetch(`/api/service-orders/${selectedOS.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "COMPLETED",
          completionNote: completionNote || "Finalizada pelo administrador",
          nfDocument: nfDocumentUrl,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao finalizar OS")
      }

      setCompleteDialogOpen(false)
      setSelectedOS(null)
      setCompletionNote("")
      setNfFile(null)
      setNfPreview(null)
      fetchServiceOrders()
      alert("OS finalizada com sucesso!")
    } catch (error) {
      console.error("Erro ao finalizar OS:", error)
      alert("Erro ao finalizar OS")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo
      const validTypes = ["image/jpeg", "image/jpg", "application/pdf"]
      if (!validTypes.includes(file.type)) {
        alert("Por favor, selecione um arquivo JPG ou PDF")
        return
      }

      // Validar tamanho (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("Arquivo muito grande. Máximo 10MB")
        return
      }

      setNfFile(file)

      // Criar preview se for imagem
      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setNfPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setNfPreview(null)
      }
    }
  }

  const handlePriorityChange = async (os: ServiceOrder, priority: Priority) => {
    try {
      const response = await fetch(`/api/service-orders/${os.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priority }),
      })

      if (!response.ok) {
        throw new Error("Erro ao alterar prioridade")
      }

      fetchServiceOrders()
    } catch {
      alert("Erro ao alterar prioridade")
    }
  }

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

  if (!user) return null

  return (
    <AppLayout userRole="ADMIN">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">
            Painel Administrativo
          </h1>
          <p className="text-gray-600">
            Gerencie todas as ordens de serviço do sistema
          </p>
        </div>

        <KanbanBoard
          serviceOrders={serviceOrders}
          onView={handleView}
          onEdit={handleEdit}
          onComplete={handleComplete}
          onCancel={handleCancel}
          isAdmin={true}
          technicians={technicians}
        />
      </div>

      <FloatingActionButton />

      {/* Modal de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl text-gray-900 border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-gray-900">
              Detalhes da OS #{selectedOS?.id.slice(0, 8)}
            </DialogTitle>
          </DialogHeader>
          {selectedOS && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Máquina</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedOS.machine}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Código</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedOS.machineCode}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Tipo de Manutenção</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedOS.maintenanceType}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Situação</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedOS.situation}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Setor</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedOS.sector}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Contato</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedOS.contactPerson}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Técnico</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedOS.technician?.name}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Prioridade</p>
                  <Select
                    value={selectedOS.priority}
                    onChange={(e) => {
                      const newPriority = e.target.value as Priority
                      // Atualizar estado local imediatamente para feedback visual
                      setSelectedOS({ ...selectedOS, priority: newPriority })
                      // Chamar função para atualizar no servidor
                      handlePriorityChange(selectedOS, newPriority)
                    }}
                    className="input-modern"
                  >
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Média</option>
                    <option value="LOW">Baixa</option>
                  </Select>
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-600 mb-2">Descrição</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedOS.description}</p>
              </div>
              {/* Histórico/Comentários */}
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-600 mb-3 font-semibold">Histórico</p>
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {history.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Nenhum registro no histórico</p>
                  ) : (
                    history.map((entry) => (
                      <div key={entry.id} className="bg-white/80 p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-gray-900">
                            {entry.user?.name || "Usuário"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(entry.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <p className="text-xs text-gray-800 whitespace-pre-wrap mb-2">{entry.message}</p>
                        {entry.photos && entry.photos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {entry.photos.map((photo, idx) => (
                              <CloudinaryImage
                                key={idx}
                                src={photo}
                                alt={`Foto ${idx + 1}`}
                                width={100}
                                height={100}
                                loading="lazy"
                                className="w-full h-24 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  setSelectedPhoto(photo)
                                  setPhotoViewerOpen(true)
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {/* Adicionar novo comentário */}
                <div className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Adicionar comentário..."
                    rows={3}
                    className="input-modern resize-none text-sm"
                  />
                  <div>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleCommentPhotoChange}
                      className="input-modern text-xs"
                    />
                    {commentPhotoPreviews.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {commentPhotoPreviews.map((preview, idx) => (
                          <img
                            key={idx}
                            src={preview}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              setSelectedPhoto(preview)
                              setPhotoViewerOpen(true)
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="btn-primary text-xs py-1.5"
                  >
                    Adicionar Comentário
                  </Button>
                </div>
              </div>
              {selectedOS.completionNote && (
                <div className="bg-primary-50/50 backdrop-blur-sm p-4 rounded-xl border border-primary-200">
                  <p className="text-xs text-primary-700 mb-2 font-semibold">O que foi feito?</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedOS.completionNote}</p>
                </div>
              )}
              {selectedOS.cost && (
                <div className="bg-primary-50/50 backdrop-blur-sm p-4 rounded-xl border border-primary-200">
                  <p className="text-xs text-primary-700 mb-1 font-semibold">Custo</p>
                  <p className="text-2xl font-display font-bold text-primary-600">
                    R$ {selectedOS.cost.toFixed(2)}
                  </p>
                </div>
              )}
              {selectedOS.nfDocument && (
                <div className="bg-blue-50/50 backdrop-blur-sm p-4 rounded-xl border border-blue-200">
                  <p className="text-xs text-blue-700 mb-2 font-semibold">Nota Fiscal (NF)</p>
                  <a
                    href={selectedOS.nfDocument}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <span>📄</span>
                    <span>Ver documento NF</span>
                  </a>
                </div>
              )}
              {selectedOS.photos && selectedOS.photos.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 mb-3 font-semibold">Fotos</p>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedOS.photos.map((photo: string, index: number) => (
                      <CloudinaryImage
                        key={index}
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        width={100}
                        height={100}
                        loading="lazy"
                        className="w-full h-32 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setSelectedPhoto(photo)
                          setPhotoViewerOpen(true)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {selectedOS.status === "COMPLETED" && !selectedOS.cost && (
                <Button onClick={() => handleAddCost(selectedOS)} className="btn-primary">
                  Adicionar Custo
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewDialogOpen(false)}
              className="btn-secondary"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl text-gray-900 border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-gray-900">
              Editar OS
            </DialogTitle>
          </DialogHeader>
          {selectedOS && (
            <ServiceOrderForm
              onSubmit={handleEditSubmit}
              initialData={selectedOS}
              isEditing={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Custo */}
      <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
        <DialogContent className="bg-white/90 backdrop-blur-xl text-gray-900 border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-gray-900">
              Adicionar Custo
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Informe o custo desta ordem de serviço
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cost" className="text-gray-700 mb-2 block">
                Custo (R$) <span className="text-red-400">*</span>
              </Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                className="input-modern"
              />
            </div>
            <div>
              <Label htmlFor="costNfDocument" className="text-gray-700 mb-2 block">
                Anexar Nota Fiscal (NF) <span className="text-gray-500 text-xs">(JPG ou PDF - opcional)</span>
              </Label>
              <div className="space-y-2">
                <input
                  type="file"
                  id="costNfDocument"
                  accept=".jpg,.jpeg,.pdf,image/jpeg,image/jpg,application/pdf"
                  onChange={handleCostNfFileChange}
                  className="input-modern"
                />
                {costNfPreview && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-2">Preview:</p>
                    <Image
                      src={costNfPreview}
                      alt="Preview NF"
                      width={200}
                      height={200}
                      className="max-w-full h-auto rounded-lg border border-gray-200"
                    />
                  </div>
                )}
                {costNfFile && !costNfPreview && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      📄 {costNfFile.name} (PDF)
                    </p>
                  </div>
                )}
                {selectedOS?.nfDocument && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 mb-1">NF já anexada:</p>
                    <a
                      href={selectedOS.nfDocument}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Ver documento atual
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCostDialogOpen(false)
                setCostNfFile(null)
                setCostNfPreview(null)
              }}
              className="btn-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCostSubmit}
              disabled={!cost || isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização de Foto */}
      <Dialog open={photoViewerOpen} onOpenChange={setPhotoViewerOpen}>
        <DialogContent className="max-w-4xl bg-black/95 border-gray-800 p-0">
          {selectedPhoto && (
            <div className="relative">
              <CloudinaryImage
                src={selectedPhoto}
                alt="Foto ampliada"
                width={1200}
                height={800}
                className="w-full h-auto max-h-[90vh] object-contain"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setPhotoViewerOpen(false)
                  setSelectedPhoto(null)
                }}
                className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-900"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Finalização */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="bg-white/90 backdrop-blur-xl text-gray-900 border-gray-200 p-4 lg:p-6 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl lg:text-2xl font-display font-bold text-gray-900">
              Finalizar OS
            </DialogTitle>
            <DialogDescription className="text-sm lg:text-base text-gray-600">
              Descreva o que foi feito e anexe a Nota Fiscal (NF) se necessário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="completionNote" className="text-gray-700 mb-2 block">
                O que foi feito?
              </Label>
              <Textarea
                id="completionNote"
                rows={5}
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="Descreva o trabalho realizado..."
                className="input-modern resize-none"
              />
            </div>
            <div>
              <Label htmlFor="nfDocument" className="text-gray-700 mb-2 block">
                Anexar Nota Fiscal (NF) <span className="text-gray-500 text-xs">(JPG ou PDF - opcional)</span>
              </Label>
              <div className="space-y-2">
                <input
                  type="file"
                  id="nfDocument"
                  accept=".jpg,.jpeg,.pdf,image/jpeg,image/jpg,application/pdf"
                  onChange={handleNfFileChange}
                  className="input-modern"
                />
                {nfPreview && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-2">Preview:</p>
                    <Image
                      src={nfPreview}
                      alt="Preview NF"
                      width={200}
                      height={200}
                      className="max-w-full h-auto rounded-lg border border-gray-200"
                    />
                  </div>
                )}
                {nfFile && !nfPreview && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      📄 {nfFile.name} (PDF)
                    </p>
                  </div>
                )}
                {selectedOS?.nfDocument && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 mb-1">NF já anexada:</p>
                    <a
                      href={selectedOS.nfDocument}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Ver documento atual
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCompleteDialogOpen(false)
                setNfFile(null)
                setNfPreview(null)
              }}
              className="btn-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteSubmit}
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? "Finalizando..." : "Finalizar OS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

// Componente principal com Suspense boundary (requerido pelo Next.js 15 para useSearchParams)
export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  )
}
