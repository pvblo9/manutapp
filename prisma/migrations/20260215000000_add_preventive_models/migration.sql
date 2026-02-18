-- Add new values to NotificationType enum (PostgreSQL)
-- Add new values to NotificationType (run once; ignore errors if already exists)
ALTER TYPE "NotificationType" ADD VALUE 'PREVENTIVE_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'PREVENTIVE_DUE_SOON';
ALTER TYPE "NotificationType" ADD VALUE 'PREVENTIVE_DUE_TODAY';
ALTER TYPE "NotificationType" ADD VALUE 'PREVENTIVE_OVERDUE';
ALTER TYPE "NotificationType" ADD VALUE 'PREVENTIVE_COMPLETED';

-- CreateEnum (PreventiveFrequency, PreventiveStatus, PreventiveAssignedType)
CREATE TYPE "PreventiveFrequency" AS ENUM ('QUARTERLY', 'BIMONTHLY', 'SEMIANNUAL', 'ANNUAL');
CREATE TYPE "PreventiveStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'NOT_DONE', 'CANCELLED');
CREATE TYPE "PreventiveAssignedType" AS ENUM ('INTERNAL', 'OUTSOURCED');

-- CreateTable PreventiveEquipment
CREATE TABLE "PreventiveEquipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "machine" TEXT NOT NULL,
    "machineCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "frequency" "PreventiveFrequency" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreventiveEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable PreventiveSchedule
CREATE TABLE "PreventiveSchedule" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "status" "PreventiveStatus" NOT NULL,
    "assignedType" "PreventiveAssignedType",
    "technicianId" TEXT,
    "outsourcedCompany" TEXT,
    "outsourcedContact" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "duration" INTEGER,
    "workDescription" TEXT,
    "observations" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cost" DOUBLE PRECISION,
    "nfDocument" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreventiveSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PreventiveEquipment_machine_active_idx" ON "PreventiveEquipment"("machine", "active");
CREATE INDEX "PreventiveEquipment_category_active_idx" ON "PreventiveEquipment"("category", "active");

CREATE UNIQUE INDEX "PreventiveSchedule_equipmentId_year_month_period_key" ON "PreventiveSchedule"("equipmentId", "year", "month", "period");
CREATE INDEX "PreventiveSchedule_technicianId_status_assignedType_idx" ON "PreventiveSchedule"("technicianId", "status", "assignedType");
CREATE INDEX "PreventiveSchedule_year_month_status_idx" ON "PreventiveSchedule"("year", "month", "status");
CREATE INDEX "PreventiveSchedule_scheduledDate_idx" ON "PreventiveSchedule"("scheduledDate");

-- AddForeignKey
ALTER TABLE "PreventiveSchedule" ADD CONSTRAINT "PreventiveSchedule_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "PreventiveEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PreventiveSchedule" ADD CONSTRAINT "PreventiveSchedule_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
