"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { format } from "date-fns"
import Image from "next/image"
import { Priority } from "@prisma/client"
import type { Configuration, User } from "@/types"

const serviceOrderSchema = z.object({
  machine: z.string().min(1, "Máquina é obrigatória"),
  machineCode: z.string().min(1, "Código da máquina é obrigatório"),
  maintenanceType: z.string().min(1, "Tipo de manutenção é obrigatório"),
  situation: z.string().min(1, "Situação é obrigatória"),
  technicianId: z.string().min(1, "Técnico é obrigatório"),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  contactPerson: z.string().min(1, "Pessoa de contato é obrigatória"),
  sector: z.string().min(1, "Setor é obrigatório"),
  priority: z.nativeEnum(Priority).optional(),
})

type ServiceOrderFormData = z.infer<typeof serviceOrderSchema>

interface ServiceOrderFormProps {
  onSubmit: (data: ServiceOrderFormData & { photos: string[]; files?: File[] }) => Promise<void>
  initialData?: Partial<ServiceOrderFormData>
  isEditing?: boolean
}

export function ServiceOrderForm({
  onSubmit,
  initialData,
  isEditing = false,
}: ServiceOrderFormProps) {
  const [configurations, setConfigurations] = useState<Record<string, string[]>>({})
  const [users, setUsers] = useState<User[]>([])
  const [photos, setPhotos] = useState<string[]>((initialData as any)?.photos || [])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ServiceOrderFormData>({
    resolver: zodResolver(serviceOrderSchema),
    defaultValues: initialData || {
      machine: "",
      machineCode: "",
      maintenanceType: "",
      situation: "",
      technicianId: "",
      description: "",
      contactPerson: "",
      sector: "",
      priority: Priority.MEDIUM,
    },
  })

  useEffect(() => {
    // Carregar configurações
    fetch("/api/configurations")
      .then((res) => res.json())
      .then((data: Configuration[]) => {
        const configMap: Record<string, string[]> = {}
        data.forEach((config: Configuration) => {
          configMap[config.type] = config.values
        })
        setConfigurations(configMap)
      })

    // Carregar usuários (operadores)
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.filter((u: User) => u.role === "OPERATOR"))
      })

    if (initialData) {
      Object.keys(initialData).forEach((key) => {
        if (key !== "photos" && key !== "files") {
          const fieldKey = key as keyof ServiceOrderFormData
          setValue(fieldKey, initialData[fieldKey] as string)
        }
      })
    }
  }, [initialData, setValue])

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const totalFiles = pendingFiles.length + files.length
    if (totalFiles > 5) {
      alert("Máximo de 5 fotos por OS")
      return
    }

    // Validar tipos e tamanhos
    Array.from(files).forEach((file) => {
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
      if (!validTypes.includes(file.type)) {
        alert(`Tipo de arquivo inválido: ${file.name}. Use JPG, PNG ou WEBP`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`Arquivo muito grande: ${file.name}. Máximo 5MB`)
        return
      }
    })

    setPendingFiles([...pendingFiles, ...Array.from(files)])

    // Criar previews
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotos([...photos, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    // Se a foto removida estava nas pendingFiles, remover também
    if (index < pendingFiles.length) {
      const newFiles = pendingFiles.filter((_, i) => i !== index)
      setPendingFiles(newFiles)
    }
    setPhotos(newPhotos)
  }

  const onFormSubmit = async (data: ServiceOrderFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit({ ...data, photos, files: pendingFiles })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date" className="text-gray-700">Data</Label>
          <Input
            id="date"
            type="date"
            defaultValue={format(new Date(), "yyyy-MM-dd")}
            disabled
            className="input-modern opacity-50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="machine" className="text-gray-700">
            Máquina <span className="text-red-500">*</span>
          </Label>
          <Select id="machine" {...register("machine")} className="input-modern">
            <option value="">Selecione...</option>
            {configurations.machine?.map((value: string) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          {errors.machine && (
            <p className="text-sm text-red-500">{errors.machine.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="machineCode" className="text-gray-700">
            Código da Máquina <span className="text-red-500">*</span>
          </Label>
          <Select id="machineCode" {...register("machineCode")} className="input-modern">
            <option value="">Selecione...</option>
            {configurations.machineCode?.map((value: string) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          {errors.machineCode && (
            <p className="text-sm text-red-500">
              {errors.machineCode.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="maintenanceType" className="text-gray-700">
            Tipo de Manutenção <span className="text-red-500">*</span>
          </Label>
          <Select id="maintenanceType" {...register("maintenanceType")} className="input-modern">
            <option value="">Selecione...</option>
            {configurations.maintenanceType?.map((value: string) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          {errors.maintenanceType && (
            <p className="text-sm text-red-500">
              {errors.maintenanceType.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="situation" className="text-gray-700">
            Situação <span className="text-red-500">*</span>
          </Label>
          <Select id="situation" {...register("situation")} className="input-modern">
            <option value="">Selecione...</option>
            {configurations.situation?.map((value: string) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          {errors.situation && (
            <p className="text-sm text-red-500">
              {errors.situation.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="technicianId" className="text-gray-700">
            Técnico <span className="text-red-500">*</span>
          </Label>
          <Select id="technicianId" {...register("technicianId")} className="input-modern">
            <option value="">Selecione...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
          {errors.technicianId && (
            <p className="text-sm text-red-500">
              {errors.technicianId.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPerson" className="text-gray-700">
            Pessoa de Contato <span className="text-red-500">*</span>
          </Label>
          <Select id="contactPerson" {...register("contactPerson")} className="input-modern">
            <option value="">Selecione...</option>
            {configurations.contactPerson?.map((value: string) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          {errors.contactPerson && (
            <p className="text-sm text-red-500">
              {errors.contactPerson.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sector" className="text-gray-700">
            Setor <span className="text-red-500">*</span>
          </Label>
          <Select id="sector" {...register("sector")} className="input-modern">
            <option value="">Selecione...</option>
            {configurations.sector?.map((value: string) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          {errors.sector && (
            <p className="text-sm text-red-500">{errors.sector.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority" className="text-gray-700">
            Prioridade <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Select id="priority" {...register("priority")} className="input-modern">
              <option value={Priority.HIGH}>Alta (Urgente)</option>
              <option value={Priority.MEDIUM}>Média (Prioritário)</option>
              <option value={Priority.LOW}>Baixa (Programável)</option>
            </Select>
            <div className="mt-2 space-y-1 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <p className="font-semibold text-gray-700 mb-2">Descrição das prioridades:</p>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-red-600">Alta (Urgente):</span>
                  <p className="text-gray-600 mt-0.5">Parada total ou risco à segurança. Impacta produção agora. Ex.: máquina parada, ar crítico, falha elétrica, risco de acidente.</p>
                </div>
                <div>
                  <span className="font-semibold text-yellow-600">Média (Prioritário):</span>
                  <p className="text-gray-600 mt-0.5">Funciona, mas com falha ou perda de desempenho. Pode parar em breve. Ex.: ruído, vazamento moderado, sensor falhando, preventiva crítica vencida.</p>
                </div>
                <div>
                  <span className="font-semibold text-green-600">Baixa (Programável):</span>
                  <p className="text-gray-600 mt-0.5">Sem impacto imediato na produção. Ajustes e melhorias. Ex.: reparos leves, organização, estética, checklist de rotina.</p>
                </div>
              </div>
            </div>
          </div>
          {errors.priority && (
            <p className="text-sm text-red-500">{errors.priority.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-700">
          Descrição <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          rows={5}
          placeholder="Descreva o problema ou serviço necessário..."
          className="input-modern resize-none"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-red-500">
            {errors.description.message}
          </p>
        )}
      </div>

      {!isEditing && (
        <div className="space-y-2">
          <Label htmlFor="photos" className="text-gray-700">Fotos (opcional, máximo 5)</Label>
            <Input
              id="photos"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={uploading || photos.length >= 5}
            />
            {uploading && (
              <p className="text-sm text-muted-foreground">Enviando fotos...</p>
            )}
            {photos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                      <Image
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting || uploading}
        >
          {isSubmitting ? "Salvando..." : isEditing ? "Atualizar" : "Criar OS"}
        </button>
      </div>
    </form>
  )
}
