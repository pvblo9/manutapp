-- Add new value to NotificationType enum (PostgreSQL)
ALTER TYPE "NotificationType" ADD VALUE 'OS_ALERT';

-- CreateTable
CREATE TABLE "ServiceOrderAlert" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "alertDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "notificationDelivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceOrderAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceOrderAlert_serviceOrderId_idx" ON "ServiceOrderAlert"("serviceOrderId");
CREATE INDEX "ServiceOrderAlert_alertDate_idx" ON "ServiceOrderAlert"("alertDate");
CREATE INDEX "ServiceOrderAlert_alertDate_notificationDelivered_idx" ON "ServiceOrderAlert"("alertDate", "notificationDelivered");

-- AddForeignKey
ALTER TABLE "ServiceOrderAlert" ADD CONSTRAINT "ServiceOrderAlert_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
