-- AlterTable: Tempo de ordem (máquina parada + trabalho operador)
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "machineStopped" BOOLEAN;

ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "machineStoppedAt" TIMESTAMP(3);

ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "operatorStartedAt" TIMESTAMP(3);
