# Script de deploy automatizado para Windows
# Execute no diretório da aplicação

param(
    [string]$AppDir = "C:\inetpub\manutapp"
)

Set-Location $AppDir

Write-Host "🚀 Iniciando deploy..." -ForegroundColor Yellow

# Verificar se .env existe
if (-not (Test-Path ".env")) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "Copie env.example.txt para .env e configure as variáveis." -ForegroundColor Yellow
    exit 1
}

# Atualizar código (se for Git)
if (Test-Path ".git") {
    Write-Host "📦 Atualizando código..." -ForegroundColor Yellow
    git pull
} else {
    Write-Host "⚠️  Diretório não é um repositório Git. Pulando atualização." -ForegroundColor Yellow
}

# Instalar dependências
Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
npm install

# Gerar Prisma Client
Write-Host "📦 Gerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# Executar migrations
Write-Host "📦 Executando migrations..." -ForegroundColor Yellow
npx prisma migrate deploy

# Build da aplicação
Write-Host "📦 Fazendo build..." -ForegroundColor Yellow
npm run build

# Reiniciar PM2
Write-Host "📦 Reiniciando aplicação..." -ForegroundColor Yellow
pm2 restart manutapp
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Aplicação não encontrada no PM2. Iniciando..." -ForegroundColor Yellow
    pm2 start ecosystem.config.js
}

# Verificar status
Write-Host "📦 Verificando status..." -ForegroundColor Yellow
pm2 status

Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
