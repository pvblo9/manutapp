"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import type { Configuration } from "@/types"
import type { PreventiveEquipment } from "@prisma/client"
import type { PreventiveFrequency } from "@prisma/client"

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  machine: z.string().min(1, "Centro de custo é obrigatório"),
  machineCode: z.string().min(1, "Código é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  frequency: z.enum(["QUARTERLY", "BIMONTHLY", "SEMIANNUAL", "ANNUAL"]),
})

type FormData = z.infer<typeof schema>

const MACHINE_CODE_PREFIX = "machineCode::"

interface EquipmentFormProps {
  initialData?: Partial<PreventiveEquipment> | null
  onSuccess: () => void
  onCancel: () => void
}

export function EquipmentForm({ initialData, onSuccess, onCancel }: EquipmentFormProps) {
  const [configurations, setConfigurations] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          name: initialData.name ?? "",
          machine: initialData.machine ?? "",
          machineCode: initialData.machineCode ?? "",
          category: initialData.category ?? "",
          frequency: (initialData.frequency as PreventiveFrequency) ?? "QUARTERLY",
        }
      : {
          name: "",
          machine: "",
          machineCode: "",
          category: "",
          frequency: "QUARTERLY",
        },
  })

  const selectedCenter = watch("machine")
  const centerMachineCodes = selectedCenter
    ? (configurations[MACHINE_CODE_PREFIX + selectedCenter] ?? [])
    : []

  useEffect(() => {
    fetch("/api/configurations")
      .then((r) => r.json())
      .then((data: Configuration[]) => {
        const map: Record<string, string[]> = {}
        ;(data || []).forEach((c: Configuration) => {
          map[c.type] = c.values || []
        })
        setConfigurations(map)
      })
      .catch(() => {})
  }, [])

  const onSubmit = async (data: FormData) => {
    setError("")
    setSubmitting(true)
    try {
      const url = initialData?.id
        ? `/api/preventive/equipment/${initialData.id}`
        : "/api/preventive/equipment"
      const method = initialData?.id ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || "Erro ao salvar")
      }
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome do equipamento *</Label>
        <Input
          id="name"
          {...register("name")}
          className="mt-1"
          placeholder="Ex: Taurus (2289)"
        />
        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="machine">Centro de custo *</Label>
        <Select id="machine" {...register("machine")} className="mt-1 w-full">
          <option value="">Selecione...</option>
          {(configurations.machine || []).map((v: string, i: number) => (
            <option key={`machine-${i}-${v}`} value={v}>{v}</option>
          ))}
        </Select>
        {errors.machine && <p className="text-sm text-red-500 mt-1">{errors.machine.message}</p>}
      </div>
      <div>
        <Label htmlFor="machineCode">Código da máquina *</Label>
        <Select
          id="machineCode"
          {...register("machineCode")}
          className="mt-1 w-full"
          disabled={!selectedCenter}
        >
          <option value="">{selectedCenter ? "Selecione..." : "Selecione o centro primeiro"}</option>
          {centerMachineCodes.map((v: string, i: number) => (
            <option key={`code-${i}-${v}`} value={v}>{v}</option>
          ))}
        </Select>
        {errors.machineCode && <p className="text-sm text-red-500 mt-1">{errors.machineCode.message}</p>}
      </div>
      <div>
        <Label htmlFor="category">Categoria *</Label>
        <Input
          id="category"
          {...register("category")}
          className="mt-1"
          placeholder="Ex: máquinas de corte, predial, frota"
        />
        {errors.category && <p className="text-sm text-red-500 mt-1">{errors.category.message}</p>}
      </div>
      <div>
        <Label htmlFor="frequency">Frequência *</Label>
        <Select id="frequency" {...register("frequency")} className="mt-1 w-full">
          <option value="QUARTERLY">Trimestral (4x/ano)</option>
          <option value="BIMONTHLY">Bimestral (6x/ano)</option>
          <option value="SEMIANNUAL">Semestral (2x/ano)</option>
          <option value="ANNUAL">Anual (1x/ano)</option>
        </Select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : initialData?.id ? "Atualizar" : "Criar equipamento"}
        </Button>
      </div>
    </form>
  )
}
