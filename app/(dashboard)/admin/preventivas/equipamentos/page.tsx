"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { AppLayout } from "@/components/layout/AppLayout"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EquipmentForm } from "@/components/preventive/EquipmentForm"
import type { PreventiveEquipment } from "@prisma/client"

const frequencyLabel: Record<string, string> = {
  QUARTERLY: "Trimestral",
  BIMONTHLY: "Bimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
}

export default function EquipamentosPreventivasPage() {
  useAuth("ADMIN")
  const [equipments, setEquipments] = useState<PreventiveEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const [newModalOpen, setNewModalOpen] = useState(false)

  const fetchEquipments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/preventive/equipment")
      if (!res.ok) throw new Error("Erro ao carregar")
      const data = await res.json()
      setEquipments(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
      setEquipments([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEquipments()
  }, [fetchEquipments])

  return (
    <AppLayout userRole="ADMIN">
      <div className="p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
            Equipamentos Preventivos
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => setNewModalOpen(true)}>+ Novo Equipamento</Button>
            <Link href="/admin/preventivas">
              <Button variant="outline">Voltar ao cronograma</Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Centro de Custo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Código</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Categoria</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Frequência</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {equipments.map((eq) => (
                  <tr key={eq.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{eq.name}</td>
                    <td className="px-4 py-3 text-gray-600">{eq.machine}</td>
                    <td className="px-4 py-3 text-gray-600">{eq.machineCode}</td>
                    <td className="px-4 py-3 text-gray-600">{eq.category}</td>
                    <td className="px-4 py-3 text-gray-600">{frequencyLabel[eq.frequency] ?? eq.frequency}</td>
                    <td className="px-4 py-3">{eq.active ? "Sim" : "Não"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {equipments.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhum equipamento cadastrado.</p>
            )}
          </div>
        )}
      </div>

      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo equipamento preventivo</DialogTitle>
          </DialogHeader>
          <EquipmentForm
            onSuccess={() => {
              setNewModalOpen(false)
              fetchEquipments()
            }}
            onCancel={() => setNewModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
