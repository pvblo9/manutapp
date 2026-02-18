"use client"

import { useAuth } from "@/lib/hooks/useAuth"
import { AppLayout } from "@/components/layout/AppLayout"
import { MyPreventivesList } from "@/components/preventive/MyPreventivesList"

export default function OperadorPreventivasPage() {
  const { user } = useAuth("OPERATOR")

  if (!user) return null

  return (
    <AppLayout userRole="OPERATOR">
      <div className="p-4 lg:p-6">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-gray-900 mb-6">
          Minhas Manutenções Preventivas
        </h1>
        <MyPreventivesList technicianId={user.id} />
      </div>
    </AppLayout>
  )
}
