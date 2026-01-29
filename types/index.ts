import { Role, OSStatus, Priority } from "@prisma/client"

export type { Role, OSStatus, Priority }

export interface User {
  id: string
  name: string
  username?: string
  email: string
  role: Role
  createdAt: Date
  updatedAt: Date
}

export interface ServiceOrder {
  id: string
  date: Date
  machine: string
  machineCode: string
  maintenanceType: string
  situation: string
  technicianId: string
  technician?: User
  description: string
  contactPerson: string
  sector: string
  status: OSStatus
  priority: Priority
  photos: string[]
  completionNote?: string | null
  cost?: number | null
  hadCost?: boolean | null
  needsPurchase?: boolean | null
  nfDocument?: string | null
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  history?: OSHistory[]
}

export interface OSHistory {
  id: string
  serviceOrderId: string
  userId: string
  user?: User
  message: string
  photos: string[]
  createdAt: Date
}

export interface Configuration {
  id: string
  type: string
  values: string[]
  updatedAt: Date
}

export interface Budget {
  id: string
  year: number
  totalAmount: number
  monthlyAmount: number
  createdAt: Date
  updatedAt: Date
}

// Types para formulários e componentes
// Este tipo corresponde ao schema Zod em ServiceOrderForm.tsx
export interface ServiceOrderFormData {
  machine: string
  machineCode: string
  maintenanceType: string
  situation: string
  technicianId: string
  description: string
  contactPerson: string
  sector: string
  // Campos opcionais adicionais (não validados pelo schema Zod)
  priority?: Priority
  photos?: string[]
  files?: File[]
}

export interface DashboardStats {
  totalCompleted: number
  totalSpent: number
  budgetRemaining: number
  openOS: number
}

export interface ChartData {
  osByTechnician: Array<{ name: string; count: number }>
  costsBySector: Array<{ name: string; value: number }>
  monthlyEvolution: Array<{ month: string; gastos: number; budget: number }>
  osByType: Array<{ name: string; count: number }>
}

export interface Filters {
  status: string
  priority: string
  technician: string
  sector: string
  search: string
}

export interface NewUserData {
  name: string
  username: string
  email: string
  password: string
  role: Role
}
