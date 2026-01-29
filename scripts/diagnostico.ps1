# Script de Diagnóstico - ManutApp
# Execute no diretório da aplicação

Write-Host "🔍 DIAGNÓSTICO - ManutApp" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se está no diretório correto
Write-Host "1️⃣ Verificando diretório..." -ForegroundColor Yellow
$currentDir = Get-Location
Write-Host "   Diretório atual: $currentDir" -ForegroundColor White

if (-not (Test-Path "package.json")) {
    Write-Host "   ❌ package.json não encontrado!" -ForegroundColor Red
    Write-Host "   Certifique-se de estar no diretório da aplicação" -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✅ package.json encontrado" -ForegroundColor Green

# 2. Verificar arquivo .env
Write-Host ""
Write-Host "2️⃣ Verificando arquivo .env..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "   ❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "   Crie o arquivo .env a partir de env.example.txt" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Arquivo .env encontrado" -ForegroundColor Green
    $envContent = Get-Content .env -Raw
    if ($envContent -match "DATABASE_URL") {
        Write-Host "   ✅ DATABASE_URL configurado" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  DATABASE_URL não encontrado no .env" -ForegroundColor Yellow
    }
}

# 3. Verificar build
Write-Host ""
Write-Host "3️⃣ Verificando build..." -ForegroundColor Yellow
if (-not (Test-Path ".next")) {
    Write-Host "   ❌ Pasta .next não encontrada! Build não foi executado." -ForegroundColor Red
    Write-Host "   Execute: npm run build" -ForegroundColor Yellow
} else {
    Write-Host "   ✅ Pasta .next encontrada" -ForegroundColor Green
}

# 4. Verificar PM2
Write-Host ""
Write-Host "4️⃣ Verificando PM2..." -ForegroundColor Yellow
try {
    $pm2Status = pm2 status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ PM2 está instalado" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Status PM2:" -ForegroundColor Cyan
        pm2 status
    } else {
        Write-Host "   ❌ PM2 não está instalado ou não está funcionando" -ForegroundColor Red
        Write-Host "   Execute: npm install -g pm2" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ PM2 não está instalado" -ForegroundColor Red
    Write-Host "   Execute: npm install -g pm2" -ForegroundColor Yellow
}

# 5. Verificar porta 3000
Write-Host ""
Write-Host "5️⃣ Verificando porta 3000..." -ForegroundColor Yellow
$portCheck = netstat -ano | findstr ":3000"
if ($portCheck) {
    Write-Host "   ⚠️  Porta 3000 está em uso:" -ForegroundColor Yellow
    Write-Host "   $portCheck" -ForegroundColor White
    Write-Host "   Se não for a aplicação, pode estar bloqueando!" -ForegroundColor Yellow
} else {
    Write-Host "   ⚠️  Porta 3000 não está em uso (aplicação não está rodando)" -ForegroundColor Yellow
}

# 6. Verificar logs do PM2
Write-Host ""
Write-Host "6️⃣ Verificando logs do PM2..." -ForegroundColor Yellow
if (Test-Path "logs/pm2-error.log") {
    Write-Host "   📄 Últimas linhas do log de erro:" -ForegroundColor Cyan
    Get-Content "logs/pm2-error.log" -Tail 10 -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Red
    }
} else {
    Write-Host "   ⚠️  Arquivo de log não encontrado" -ForegroundColor Yellow
}

if (Test-Path "logs/pm2-out.log") {
    Write-Host "   📄 Últimas linhas do log de saída:" -ForegroundColor Cyan
    Get-Content "logs/pm2-out.log" -Tail 10 -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "   $_" -ForegroundColor White
    }
}

# 7. Verificar conexão com banco
Write-Host ""
Write-Host "7️⃣ Verificando conexão com banco de dados..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content .env -Raw
    if ($envContent -match 'DATABASE_URL="([^"]+)"') {
        $dbUrl = $matches[1]
        Write-Host "   String de conexão encontrada" -ForegroundColor Green
        if ($dbUrl -match "localhost|127.0.0.1") {
            Write-Host "   ✅ Usando localhost (correto para servidor local)" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⚠️  DATABASE_URL não encontrado no formato esperado" -ForegroundColor Yellow
    }
}

# 8. Verificar Node.js
Write-Host ""
Write-Host "8️⃣ Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    $npmVersion = npm -v
    Write-Host "   ✅ Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "   ✅ NPM: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js não encontrado!" -ForegroundColor Red
}

# Resumo e recomendações
Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📋 RECOMENDAÇÕES:" -ForegroundColor Yellow
Write-Host ""

# Verificar se aplicação está rodando
$pm2List = pm2 jlist 2>$null | ConvertFrom-Json
$manutappRunning = $pm2List | Where-Object { $_.name -eq "manutapp" -and $_.pm2_env.status -eq "online" }

if (-not $manutappRunning) {
    Write-Host "❌ Aplicação NÃO está rodando!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tente:" -ForegroundColor Yellow
    Write-Host "1. pm2 delete manutapp" -ForegroundColor White
    Write-Host "2. pm2 start ecosystem.config.js" -ForegroundColor White
    Write-Host "3. pm2 logs manutapp" -ForegroundColor White
} else {
    Write-Host "✅ Aplicação está rodando no PM2" -ForegroundColor Green
    Write-Host ""
    Write-Host "Se ainda não acessa, verifique:" -ForegroundColor Yellow
    Write-Host "1. Firewall: New-NetFirewallRule -DisplayName 'ManutApp' -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow" -ForegroundColor White
    Write-Host "2. Logs: pm2 logs manutapp" -ForegroundColor White
    Write-Host "3. Teste: http://localhost:3000" -ForegroundColor White
}

Write-Host ""
