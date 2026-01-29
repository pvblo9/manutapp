"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export function FloatingActionButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push("/os/nova")}
      className="btn-float group"
      aria-label="Nova Ordem de Serviço"
    >
      <Plus
        size={20}
        className="group-hover:rotate-90 transition-transform duration-300 lg:w-6 lg:h-6"
      />
    </button>
  )
}
