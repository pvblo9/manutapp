-- =============================================================================
-- MIGRAÇÃO CONSOLIDADA - ManutApp
-- Aplica todas as alterações de banco (tabelas, colunas, enums) em ordem.
-- Banco: PostgreSQL. Execute como superuser ou dono do schema.
-- Uso: psql -f full_migration.sql <connection_string>
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. User: coluna username (se não existir)
-- -----------------------------------------------------------------------------
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;
-- Garantir unique (pode falhar se já existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_username_key') THEN
    CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. NotificationType enum e tabela Notification
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('NEW_OS', 'OS_COMMENT', 'OS_NEEDS_PURCHASE', 'OS_COMPLETED', 'OS_UPDATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Adicionar valores ao enum (ignorar se já existir)
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'OS_ALERT';           EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'PREVENTIVE_ASSIGNED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'PREVENTIVE_DUE_SOON'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'PREVENTIVE_DUE_TODAY'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'PREVENTIVE_OVERDUE';   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "NotificationType" ADD VALUE 'PREVENTIVE_COMPLETED'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. ServiceOrder: colunas adicionais
-- -----------------------------------------------------------------------------
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "queueOrder" INTEGER;
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "hadCost" BOOLEAN;
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "nfDocument" TEXT;
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "needsPurchase" BOOLEAN;
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "machineStopped" BOOLEAN;
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "machineStoppedAt" TIMESTAMP(3);
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "operatorStartedAt" TIMESTAMP(3);

-- -----------------------------------------------------------------------------
-- 4. OSHistory
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "OSHistory" (
  "id" TEXT NOT NULL,
  "serviceOrderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OSHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OSHistory_serviceOrderId_idx" ON "OSHistory"("serviceOrderId");
CREATE INDEX IF NOT EXISTS "OSHistory_userId_idx" ON "OSHistory"("userId");
CREATE INDEX IF NOT EXISTS "OSHistory_createdAt_idx" ON "OSHistory"("createdAt");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OSHistory_serviceOrderId_fkey') THEN
    ALTER TABLE "OSHistory" ADD CONSTRAINT "OSHistory_serviceOrderId_fkey"
    FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OSHistory_userId_fkey') THEN
    ALTER TABLE "OSHistory" ADD CONSTRAINT "OSHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. ServiceOrderAlert
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ServiceOrderAlert" (
  "id" TEXT NOT NULL,
  "serviceOrderId" TEXT NOT NULL,
  "alertDate" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "notificationDelivered" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceOrderAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ServiceOrderAlert_serviceOrderId_idx" ON "ServiceOrderAlert"("serviceOrderId");
CREATE INDEX IF NOT EXISTS "ServiceOrderAlert_alertDate_idx" ON "ServiceOrderAlert"("alertDate");
CREATE INDEX IF NOT EXISTS "ServiceOrderAlert_alertDate_notificationDelivered_idx" ON "ServiceOrderAlert"("alertDate", "notificationDelivered");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ServiceOrderAlert_serviceOrderId_fkey') THEN
    ALTER TABLE "ServiceOrderAlert" ADD CONSTRAINT "ServiceOrderAlert_serviceOrderId_fkey"
    FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Módulo Preventiva: enums e tabelas
-- -----------------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE "PreventiveFrequency" AS ENUM ('QUARTERLY', 'BIMONTHLY', 'SEMIANNUAL', 'ANNUAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PreventiveStatus" AS ENUM ('PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'NOT_DONE', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PreventiveAssignedType" AS ENUM ('INTERNAL', 'OUTSOURCED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PreventiveEquipment" (
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
CREATE INDEX IF NOT EXISTS "PreventiveEquipment_machine_active_idx" ON "PreventiveEquipment"("machine", "active");
CREATE INDEX IF NOT EXISTS "PreventiveEquipment_category_active_idx" ON "PreventiveEquipment"("category", "active");

CREATE TABLE IF NOT EXISTS "PreventiveSchedule" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "PreventiveSchedule_equipmentId_year_month_period_key" ON "PreventiveSchedule"("equipmentId", "year", "month", "period");
CREATE INDEX IF NOT EXISTS "PreventiveSchedule_technicianId_status_assignedType_idx" ON "PreventiveSchedule"("technicianId", "status", "assignedType");
CREATE INDEX IF NOT EXISTS "PreventiveSchedule_year_month_status_idx" ON "PreventiveSchedule"("year", "month", "status");
CREATE INDEX IF NOT EXISTS "PreventiveSchedule_scheduledDate_idx" ON "PreventiveSchedule"("scheduledDate");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PreventiveSchedule_equipmentId_fkey') THEN
    ALTER TABLE "PreventiveSchedule" ADD CONSTRAINT "PreventiveSchedule_equipmentId_fkey"
    FOREIGN KEY ("equipmentId") REFERENCES "PreventiveEquipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PreventiveSchedule_technicianId_fkey') THEN
    ALTER TABLE "PreventiveSchedule" ADD CONSTRAINT "PreventiveSchedule_technicianId_fkey"
    FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Fim da migração consolidada
-- -----------------------------------------------------------------------------
