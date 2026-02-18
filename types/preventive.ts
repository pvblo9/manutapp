import type { PreventiveSchedule, PreventiveEquipment } from "@prisma/client"

/** Technician subset returned by API when including schedule relations */
export interface PreventiveScheduleTechnician {
  id: string
  name: string
  email: string
  role: string
}

/** PreventiveSchedule with equipment and technician included (API include) */
export type PreventiveScheduleWithRelations = PreventiveSchedule & {
  equipment: PreventiveEquipment
  technician: PreventiveScheduleTechnician | null
}
