# Script de instalação para Windows Server
# Execute como Administrador no PowerShell

Write-Host "🚀 Iniciando instalação de dependências..." -ForegroundColor Yellow

# Verificar se está rodando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host "Clique com botão direito no PowerShell e selecione 'Executar como administrador'" -ForegroundColor Yellow
    exit 1
}

# Verificar Node.js
Write-Host "📦 Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado!" -ForegroundColor Red
    Write-Host "Por favor, instale Node.js 18.x ou 20.x de: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verificar NPM
Write-Host "📦 Verificando NPM..." -ForegroundColor Yellow
try {
    $npmVersion = npm -v
    Write-Host "✅ NPM encontrado: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ NPM não encontrado!" -ForegroundColor Red
    exit 1
}

# Instalar PM2 globalmente
Write-Host "📦 Instalando PM2..." -ForegroundColor Yellow
npm install -g pm2
npm install -g pm2-windows-startup

# Verificar instalação PM2
try {
    $pm2Version = pm2 -v
    Write-Host "✅ PM2 instalado: v$pm2Version" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao instalar PM2!" -ForegroundColor Red
    exit 1
}

# Verificar PostgreSQL
Write-Host "📦 Verificando PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    Write-Host "✅ PostgreSQL encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  PostgreSQL não encontrado!" -ForegroundColor Yellow
    Write-Host "Por favor, instale PostgreSQL 14+ de: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
}

# Verificar Git
Write-Host "📦 Verificando Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Git não encontrado!" -ForegroundColor Yellow
    Write-Host "Por favor, instale Git de: https://git-scm.com/download/win" -ForegroundColor Yellow
}

# Verificar IIS
Write-Host "📦 Verificando IIS..." -ForegroundColor Yellow
$iisService = Get-Service -Name "W3SVC" -ErrorAction SilentlyContinue
if ($iisService) {
    Write-Host "✅ IIS encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  IIS não encontrado!" -ForegroundColor Yellow
    Write-Host "Para instalar IIS, execute:" -ForegroundColor Yellow
    Write-Host "Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✅ Verificação concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Configure o PostgreSQL (crie banco 'manutapp' e usuário)" -ForegroundColor White
Write-Host "2. Clone/faça upload da aplicação" -ForegroundColor White
Write-Host "3. Configure o arquivo .env" -ForegroundColor White
Write-Host "4. Execute: npm install && npm run build" -ForegroundColor White
Write-Host "5. Configure PM2 e IIS" -ForegroundColor White
