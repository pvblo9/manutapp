const { Client } = require('pg');
require('dotenv').config();

const SQL = `
-- Criar Enums
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "OSStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('NEW_OS', 'OS_COMMENT', 'OS_NEEDS_PURCHASE', 'OS_COMPLETED', 'OS_UPDATED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Criar tabela User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- Criar tabela ServiceOrder
CREATE TABLE IF NOT EXISTS "ServiceOrder" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "machine" TEXT NOT NULL,
    "machineCode" TEXT NOT NULL,
    "maintenanceType" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "status" "OSStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "photos" TEXT[],
    "completionNote" TEXT,
    "cost" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hadCost" BOOLEAN,
    "needsPurchase" BOOLEAN,
    "nfDocument" TEXT,
    CONSTRAINT "ServiceOrder_pkey" PRIMARY KEY ("id")
);

-- Criar tabela Configuration
CREATE TABLE IF NOT EXISTS "Configuration" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "values" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- Criar tabela Budget
CREATE TABLE IF NOT EXISTS "Budget" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "monthlyAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

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

-- Criar tabela Notification
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

-- Criar índices únicos
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Configuration_type_key" ON "Configuration"("type");
CREATE UNIQUE INDEX IF NOT EXISTS "Budget_year_key" ON "Budget"("year");

-- Criar índices normais
CREATE INDEX IF NOT EXISTS "ServiceOrder_technicianId_idx" ON "ServiceOrder"("technicianId");
CREATE INDEX IF NOT EXISTS "ServiceOrder_status_idx" ON "ServiceOrder"("status");
CREATE INDEX IF NOT EXISTS "ServiceOrder_date_idx" ON "ServiceOrder"("date");
CREATE INDEX IF NOT EXISTS "ServiceOrder_sector_idx" ON "ServiceOrder"("sector");
CREATE INDEX IF NOT EXISTS "ServiceOrder_createdAt_idx" ON "ServiceOrder"("createdAt");
CREATE INDEX IF NOT EXISTS "ServiceOrder_status_date_idx" ON "ServiceOrder"("status", "date");
CREATE INDEX IF NOT EXISTS "ServiceOrder_technicianId_status_idx" ON "ServiceOrder"("technicianId", "status");
CREATE INDEX IF NOT EXISTS "OSHistory_serviceOrderId_idx" ON "OSHistory"("serviceOrderId");
CREATE INDEX IF NOT EXISTS "OSHistory_userId_idx" ON "OSHistory"("userId");
CREATE INDEX IF NOT EXISTS "OSHistory_createdAt_idx" ON "OSHistory"("createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- Adicionar Foreign Keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'ServiceOrder_technicianId_fkey'
    ) THEN
        ALTER TABLE "ServiceOrder" ADD CONSTRAINT "ServiceOrder_technicianId_fkey" 
        FOREIGN KEY ("technicianId") REFERENCES "User"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

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

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Notification_userId_fkey'
    ) THEN
        ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
`;

async function setupDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado!');

    console.log('📦 Criando tabelas, índices e relacionamentos...');
    await client.query(SQL);
    console.log('✅ Banco de dados configurado com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
