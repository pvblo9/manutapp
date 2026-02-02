"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CloudinaryImage } from "@/components/ui/CloudinaryImage"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import type { ServiceOrder, OSHistory } from "@/types"

// Componente interno para usar useSearchParams (requer Suspense no Next.js 15)
function OperadorPageContent() {
  const { user, isLoading } = useAuth("OPERATOR")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([])
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [completionNote, setCompletionNote] = useState("")
  const [hadCost, setHadCost] = useState(false)
  const [needsPurchase, setNeedsPurchase] = useState(false)
  const [history, setHistory] = useState<OSHistory[]>([])
  const [newComment, setNewComment] = useState("")
  const [commentPhotos, setCommentPhotos] = useState<File[]>([])
  const [commentPhotoPreviews, setCommentPhotoPreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [costFilter, setCostFilter] = useState<"all" | "with-cost" | "without-cost">("all")
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false)

  // Declarar fetchHistory primeiro para evitar erros de inicialização
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
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  const fetchServiceOrders = useCallback(async (page = 1, limit = 50) => {
    if (!user) return
    try {
      const response = await fetch(
        `/api/service-orders?userId=${user.id}&userRole=${user.role}&page=${page}&limit=${limit}`
      )
      
      if (!response.ok) {
        // Verificar rate limit primeiro
        if (response.status === 429) {
          // Rate limit - não logar como erro, apenas warning
          // Não atualizar estado - manter OS atuais
          console.warn("Rate limit atingido ao buscar OS. Aguardando...")
          return
        }
        
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
    } catch (error) {
      console.error("Erro ao buscar OS:", error)
      setServiceOrders([])
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchServiceOrders()
    }
  }, [user, fetchServiceOrders])

  // Criar uma versão estável do osId para usar nas dependências
  const osIdFromUrl = searchParams?.get("osId") || null

  // Abrir OS automaticamente se houver osId na URL
  useEffect(() => {
    if (osIdFromUrl && serviceOrders.length > 0 && !viewDialogOpen) {
      const os = serviceOrders.find((o) => o.id === osIdFromUrl)
      if (os) {
        setSelectedOS(os)
        setNeedsPurchase(os.needsPurchase || false)
        setViewDialogOpen(true)
        fetchHistory(os.id)
        // Limpar o query param da URL após abrir
        router.replace("/operador", { scroll: false })
      }
    }
  }, [osIdFromUrl, serviceOrders, viewDialogOpen, router, fetchHistory])

  // Filtrar OS por custo (apenas OS finalizadas têm hadCost definido)
  const filteredServiceOrders = serviceOrders.filter((os) => {
    if (costFilter === "all") return true
    // Apenas OS finalizadas têm hadCost definido, então filtrar apenas elas
    if (os.status !== "COMPLETED") return false
    if (costFilter === "with-cost") return os.hadCost === true
    if (costFilter === "without-cost") return os.hadCost === false
    return false
  })

  const handleView = (os: ServiceOrder) => {
    setSelectedOS(os)
    setNeedsPurchase(os.needsPurchase || false)
    setViewDialogOpen(true)
    fetchHistory(os.id)
  }

  const handleNeedsPurchaseChange = async (value: boolean) => {
    if (!selectedOS) return
    
    setNeedsPurchase(value)
    try {
      const response = await fetch(`/api/service-orders/${selectedOS.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          needsPurchase: value,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao atualizar status de compra")
      }

      // Atualizar a OS localmente
      const updatedOS = await response.json()
      setSelectedOS(updatedOS)
      fetchServiceOrders()
    } catch (error) {
      console.error("Erro ao atualizar status de compra:", error)
      alert("Erro ao atualizar status de compra")
      // Reverter o estado em caso de erro
      setNeedsPurchase(selectedOS.needsPurchase || false)
    }
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
      // Atualizar histórico no modal
      if (selectedOS) {
        fetchHistory(selectedOS.id)
      }
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error)
      alert("Erro ao adicionar comentário")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = (os: ServiceOrder) => {
    setSelectedOS(os)
    setCompletionNote("")
    setHadCost(false)
    setCompleteDialogOpen(true)
  }

  const handleCompleteSubmit = async () => {
    if (!selectedOS) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/service-orders/${selectedOS.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "COMPLETED",
          completionNote,
          hadCost,
        }),
      })

      if (!response.ok) {
        throw new Error("Erro ao finalizar OS")
      }

      setCompleteDialogOpen(false)
      setSelectedOS(null)
      setCompletionNote("")
      setHadCost(false)
      fetchServiceOrders()
      alert("OS finalizada com sucesso!")
    } catch {
      alert("Erro ao finalizar OS")
    } finally {
      setIsSubmitting(false)
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
    <AppLayout userRole="OPERATOR">
      <div className="space-y-4 lg:space-y-6">
        <div>
          <h1 className="text-2xl lg:text-4xl font-display font-bold text-gray-900 mb-2">
            Painel do Operador
          </h1>
          <p className="text-sm lg:text-base text-gray-600">
            Gerencie suas ordens de serviço de forma eficiente
          </p>
        </div>

        {/* Filtro de Custo */}
        <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Label htmlFor="costFilter" className="text-gray-700 font-semibold text-sm whitespace-nowrap">
              Filtrar por custo:
            </Label>
            <Select
              id="costFilter"
              value={costFilter}
              onChange={(e) => setCostFilter(e.target.value as "all" | "with-cost" | "without-cost")}
              className="input-modern w-full sm:w-auto"
            >
              <option value="all">Todas</option>
              <option value="with-cost">Teve Custo</option>
              <option value="without-cost">Não Teve Custo</option>
            </Select>
            {costFilter !== "all" && (
              <span className="text-xs text-gray-500 mt-1 sm:mt-0">
                Mostrando {filteredServiceOrders.length} de {serviceOrders.length} OS
              </span>
            )}
          </div>
        </div>

        <KanbanBoard
          serviceOrders={filteredServiceOrders}
          onView={handleView}
          onComplete={handleComplete}
        />
      </div>

      <FloatingActionButton />

      {/* Modal de Visualização */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl text-gray-900 border-gray-200 p-4 lg:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl lg:text-2xl font-display font-bold text-gray-900">
              Detalhes da OS #{selectedOS?.id.slice(0, 8)}
            </DialogTitle>
            <DialogDescription className="text-sm lg:text-base text-gray-600">
              Informações completas da ordem de serviço
            </DialogDescription>
          </DialogHeader>
          {selectedOS && (
            <div className="space-y-4 lg:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
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
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                <p className="text-xs text-gray-600 mb-2">Descrição</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedOS.description}</p>
              </div>
              {/* Necessária compra de peça */}
              {selectedOS.status === "OPEN" && (
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                  <Label htmlFor="needsPurchaseView" className="text-xs text-gray-600 mb-2 block font-semibold">
                    Necessária compra de peça?
                  </Label>
                  <Select
                    id="needsPurchaseView"
                    value={needsPurchase ? "sim" : "nao"}
                    onChange={(e) => handleNeedsPurchaseChange(e.target.value === "sim")}
                    className="input-modern"
                  >
                    <option value="nao">Não</option>
                    <option value="sim">Sim</option>
                  </Select>
                </div>
              )}
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
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {entry.photos.map((photo, idx) => (
                              <Image
                                key={idx}
                                src={photo}
                                alt={`Foto ${idx + 1}`}
                                width={100}
                                height={100}
                                loading="lazy"
                                placeholder="blur"
                                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
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
                          <Image
                            key={idx}
                            src={preview}
                            alt={`Preview ${idx + 1}`}
                            width={100}
                            height={100}
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
              {selectedOS.photos && selectedOS.photos.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-gray-200">
                  <p className="text-xs text-gray-600 mb-3 font-semibold">Fotos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-3">
                    {selectedOS.photos.map((photo: string, index: number) => (
                      <CloudinaryImage
                        key={index}
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        width={100}
                        height={100}
                        loading="lazy"
                        className="w-full h-32 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setSelectedPhoto(photo)
                          setPhotoViewerOpen(true)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewDialogOpen(false)
                setNeedsPurchase(false)
              }}
              className="btn-secondary"
            >
              Fechar
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
        <DialogContent className="bg-white/90 backdrop-blur-xl text-gray-900 border-gray-200 p-4 lg:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl lg:text-2xl font-display font-bold text-gray-900">
              Finalizar OS
            </DialogTitle>
            <DialogDescription className="text-sm lg:text-base text-gray-600">
              Descreva o que foi feito para finalizar esta ordem de serviço
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="completionNote" className="text-gray-700 mb-2 block">
                O que foi feito? <span className="text-red-500">*</span>
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
              <Label htmlFor="hadCost" className="text-gray-700 mb-2 block">
                Teve custo? <span className="text-red-500">*</span>
              </Label>
              <Select
                id="hadCost"
                value={hadCost ? "sim" : "nao"}
                onChange={(e) => setHadCost(e.target.value === "sim")}
                className="input-modern"
              >
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteDialogOpen(false)}
              className="btn-secondary"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteSubmit}
              disabled={!completionNote.trim() || isSubmitting}
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
export default function OperadorPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <OperadorPageContent />
    </Suspense>
  )
}
