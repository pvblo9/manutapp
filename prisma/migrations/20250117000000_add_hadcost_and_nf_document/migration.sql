-- AlterTable
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "hadCost" BOOLEAN;

-- AlterTable
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "nfDocument" TEXT;
