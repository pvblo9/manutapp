# Script de Setup Completo - ManutApp
# Execute como Administrador no PowerShell

param(
    [string]$AppDir = "C:\inetpub\manutapp"
)

Write-Host "🚀 Configuração Completa do ManutApp" -ForegroundColor Green
Write-Host ""

# Verificar se está como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Execute como Administrador!" -ForegroundColor Red
    Write-Host "Clique com botão direito no PowerShell → Executar como administrador" -ForegroundColor Yellow
    exit 1
}

# Verificar se diretório existe
if (-not (Test-Path $AppDir)) {
    Write-Host "❌ Diretório não encontrado: $AppDir" -ForegroundColor Red
    Write-Host "Copie os arquivos primeiro para: $AppDir" -ForegroundColor Yellow
    exit 1
}

Set-Location $AppDir

Write-Host "📁 Diretório: $AppDir" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Node.js
Write-Host "1️⃣ Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    $npmVersion = npm -v
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "   ✅ NPM: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js não encontrado!" -ForegroundColor Red
    Write-Host "   Instale de: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 2. Verificar .env
Write-Host ""
Write-Host "2️⃣ Verificando arquivo .env..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    if (Test-Path "env.example.txt") {
        Write-Host "   ⚠️  Arquivo .env não encontrado. Criando a partir de env.example.txt..." -ForegroundColor Yellow
        Copy-Item "env.example.txt" ".env"
        Write-Host "   ✅ Arquivo .env criado!" -ForegroundColor Green
        Write-Host "   ⚠️  IMPORTANTE: Edite o arquivo .env com suas configurações!" -ForegroundColor Yellow
        Write-Host "   Pressione qualquer tecla para continuar após editar..." -ForegroundColor Yellow
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } else {
        Write-Host "   ❌ Arquivo .env não encontrado e env.example.txt também não existe!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "   ✅ Arquivo .env encontrado" -ForegroundColor Green
}

# 3. Instalar dependências
Write-Host ""
Write-Host "3️⃣ Instalando dependências (isso pode demorar alguns minutos)..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erro ao instalar dependências!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Dependências instaladas" -ForegroundColor Green

# 4. Gerar Prisma Client
Write-Host ""
Write-Host "4️⃣ Gerando Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erro ao gerar Prisma Client!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Prisma Client gerado" -ForegroundColor Green

# 5. Executar migrations
Write-Host ""
Write-Host "5️⃣ Executando migrations do banco de dados..." -ForegroundColor Yellow
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  Erro ao executar migrations. Verifique a conexão com o banco!" -ForegroundColor Yellow
    Write-Host "   Verifique o arquivo .env e a string DATABASE_URL" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Migrations executadas" -ForegroundColor Green
}

# 6. Build
Write-Host ""
Write-Host "6️⃣ Fazendo build da aplicação..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Erro no build!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Build concluído" -ForegroundColor Green

# 7. Instalar PM2
Write-Host ""
Write-Host "7️⃣ Instalando PM2..." -ForegroundColor Yellow
npm install -g pm2 pm2-windows-startup
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ⚠️  Erro ao instalar PM2. Tentando continuar..." -ForegroundColor Yellow
} else {
    Write-Host "   ✅ PM2 instalado" -ForegroundColor Green
}

# 8. Criar diretório de logs
Write-Host ""
Write-Host "8️⃣ Criando diretório de logs..." -ForegroundColor Yellow
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force | Out-Null
}
Write-Host "   ✅ Diretório de logs criado" -ForegroundColor Green

# 9. Iniciar com PM2
Write-Host ""
Write-Host "9️⃣ Iniciando aplicação com PM2..." -ForegroundColor Yellow
pm2 delete manutapp 2>$null
pm2 start ecosystem.config.js
pm2 save
Write-Host "   ✅ Aplicação iniciada" -ForegroundColor Green

# 10. Configurar startup
Write-Host ""
Write-Host "🔟 Configurando PM2 para iniciar no boot..." -ForegroundColor Yellow
pm2-startup install
Write-Host "   ✅ PM2 configurado para iniciar no boot" -ForegroundColor Green

# 11. Configurar Firewall
Write-Host ""
Write-Host "1️⃣1️⃣ Configurando Firewall..." -ForegroundColor Yellow
$firewallRule = Get-NetFirewallRule -DisplayName "ManutApp" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    New-NetFirewallRule -DisplayName "ManutApp" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow | Out-Null
    Write-Host "   ✅ Regra de firewall criada" -ForegroundColor Green
} else {
    Write-Host "   ✅ Regra de firewall já existe" -ForegroundColor Green
}

# 12. Configurar hosts (DNS local)
Write-Host ""
Write-Host "1️⃣2️⃣ Configurando DNS local (hosts)..." -ForegroundColor Yellow
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$hostsContent = Get-Content $hostsPath
if ($hostsContent -notmatch "manutapp") {
    Add-Content -Path $hostsPath -Value "`n127.0.0.1    manutapp"
    Write-Host "   ✅ Entrada 'manutapp' adicionada ao hosts" -ForegroundColor Green
} else {
    Write-Host "   ✅ Entrada 'manutapp' já existe no hosts" -ForegroundColor Green
}

# Status final
Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Status da aplicação:" -ForegroundColor Yellow
pm2 status
Write-Host ""
Write-Host "🌐 Acesse a aplicação em:" -ForegroundColor Yellow
Write-Host "   - http://localhost:3000" -ForegroundColor Cyan
Write-Host "   - http://manutapp:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Comandos úteis:" -ForegroundColor Yellow
Write-Host "   pm2 status          - Ver status" -ForegroundColor White
Write-Host "   pm2 logs manutapp   - Ver logs" -ForegroundColor White
Write-Host "   pm2 restart manutapp - Reiniciar" -ForegroundColor White
Write-Host ""
