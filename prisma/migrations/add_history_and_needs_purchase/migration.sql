-- Adicionar campo needsPurchase na tabela ServiceOrder
ALTER TABLE "ServiceOrder" ADD COLUMN IF NOT EXISTS "needsPurchase" BOOLEAN;

-- Criar tabela OSHistory
CREATE TABLE IF NOT EXISTS "OSHistory" (
    "id" TEXT NOT NULL,
    "serviceOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OSHistory_pkey" PRIMARY KEY ("id")
);

-- Criar índices
CREATE INDEX IF NOT EXISTS "OSHistory_serviceOrderId_idx" ON "OSHistory"("serviceOrderId");
CREATE INDEX IF NOT EXISTS "OSHistory_userId_idx" ON "OSHistory"("userId");
CREATE INDEX IF NOT EXISTS "OSHistory_createdAt_idx" ON "OSHistory"("createdAt");

-- Adicionar foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'OSHistory_serviceOrderId_fkey'
    ) THEN
        ALTER TABLE "OSHistory" ADD CONSTRAINT "OSHistory_serviceOrderId_fkey" 
        FOREIGN KEY ("serviceOrderId") REFERENCES "ServiceOrder"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'OSHistory_userId_fkey'
    ) THEN
        ALTER TABLE "OSHistory" ADD CONSTRAINT "OSHistory_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
