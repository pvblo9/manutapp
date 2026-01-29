import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:969896@localhost:5432/manutapp?schema=public"
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Iniciando seed...")

  const hashedPassword = await bcrypt.hash("admin123", 10)
  const hashedPasswordOp = await bcrypt.hash("operador123", 10)

  const admin = await prisma.user.upsert({
    where: { email: "admin@empresa.com" },
    update: { username: "admin" },
    create: {
      name: "Administrador",
      username: "admin",
      email: "admin@empresa.com",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  })

  const operador1 = await prisma.user.upsert({
    where: { email: "operador1@empresa.com" },
    update: {},
    create: {
      name: "João Silva",
      username: "joao.silva",
      email: "operador1@empresa.com",
      password: hashedPasswordOp,
      role: Role.OPERATOR,
    },
  })

  const operador2 = await prisma.user.upsert({
    where: { email: "operador2@empresa.com" },
    update: {},
    create: {
      name: "Maria Santos",
      username: "maria.santos",
      email: "operador2@empresa.com",
      password: hashedPasswordOp,
      role: Role.OPERATOR,
    },
  })

  console.log("✅ Usuários criados")

  const configurations = [
    { type: "machine", values: ["Máquina 01", "Máquina 02", "Máquina 03", "Máquina 04", "Máquina 05"] },
    { type: "machineCode", values: ["M001", "M002", "M003", "M004", "M005"] },
    { type: "maintenanceType", values: ["Preventiva", "Corretiva", "Preditiva", "Emergencial", "Calibração"] },
    { type: "situation", values: ["Parada", "Operando com restrições", "Operando normalmente", "Aguardando peças"] },
    { type: "contactPerson", values: ["João da Produção", "Maria da Qualidade", "Pedro da Manutenção", "Ana do Setor"] },
    { type: "sector", values: ["Produção", "Qualidade", "Manutenção", "Almoxarifado", "Administração"] },
  ]

  for (const config of configurations) {
    await prisma.configuration.upsert({
      where: { type: config.type },
      update: { values: config.values },
      create: config,
    })
  }

  console.log("✅ Configurações criadas")

  const currentYear = new Date().getFullYear()
  await prisma.budget.upsert({
    where: { year: currentYear },
    update: {},
    create: { year: currentYear, totalAmount: 120000, monthlyAmount: 10000 },
  })

  console.log("✅ Budget criado")

  await prisma.serviceOrder.create({
    data: {
      machine: "Máquina 01",
      machineCode: "M001",
      maintenanceType: "Preventiva",
      situation: "Parada",
      technicianId: operador1.id,
      description: "Manutenção preventiva mensal da máquina 01",
      contactPerson: "João da Produção",
      sector: "Produção",
      photos: [],
    },
  })

  await prisma.serviceOrder.create({
    data: {
      machine: "Máquina 02",
      machineCode: "M002",
      maintenanceType: "Corretiva",
      situation: "Operando com restrições",
      technicianId: operador2.id,
      description: "Correção de vazamento no sistema hidráulico",
      contactPerson: "Maria da Qualidade",
      sector: "Produção",
      priority: "HIGH",
      photos: [],
    },
  })

  console.log("✅ OS criadas")
  console.log("🎉 Seed completo!")
  console.log("Admin: admin / admin123")
  console.log("Operador 1: joao.silva / operador123")
  console.log("Operador 2: maria.santos / operador123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
