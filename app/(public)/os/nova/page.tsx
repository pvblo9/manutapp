"use client"

import { useRouter } from "next/navigation"
import { ServiceOrderForm } from "@/components/forms/ServiceOrderForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NovaOSPage() {
  const router = useRouter()

  const handleSubmit = async (data: any) => {
    try {
      // Criar OS primeiro (sem fotos)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { files, photos: _photos, ...osData } = data
      const response = await fetch("/api/service-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...osData,
          date: new Date().toISOString(),
          photos: [],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Erro ao criar OS")
      }

      const createdOS = await response.json()

      // Fazer upload das fotos se houver
      if (files && files.length > 0) {
        const formData = new FormData()
        files.forEach((file: File) => {
          formData.append("files", file)
        })
        formData.append("osId", createdOS.id)

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          // Atualizar OS com as URLs das fotos
          await fetch(`/api/service-orders/${createdOS.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ photos: uploadResult.urls }),
          })
        }
      }

      alert("Ordem de serviço criada com sucesso!")
      router.push("/os/nova")
    } catch (err: unknown) {
      const error = err as { message?: string }
      alert(error.message || "Erro ao criar ordem de serviço")
    }
  }

  return (
    <div className="min-h-screen bg-[#ededed] py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-soft">
          <CardHeader>
            <CardTitle className="text-3xl font-display font-bold text-gray-900">
              Nova Ordem de Serviço
            </CardTitle>
            <CardDescription className="text-gray-600 text-base">
              Preencha os dados abaixo para abrir uma nova ordem de serviço
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ServiceOrderForm onSubmit={handleSubmit} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
