# Script para configurar banco de dados PostgreSQL no Windows
# Execute como Administrador

Write-Host "🗄️  Configurando banco de dados manutapp..." -ForegroundColor Yellow

# Verificar PostgreSQL
$pgPath = "C:\Program Files\PostgreSQL\14\bin\psql.exe"
if (-not (Test-Path $pgPath)) {
    # Tentar outras versões
    $pgVersions = @("15", "16", "13", "12")
    foreach ($version in $pgVersions) {
        $testPath = "C:\Program Files\PostgreSQL\$version\bin\psql.exe"
        if (Test-Path $testPath) {
            $pgPath = $testPath
            break
        }
    }
}

if (-not (Test-Path $pgPath)) {
    Write-Host "❌ PostgreSQL não encontrado!" -ForegroundColor Red
    Write-Host "Por favor, instale PostgreSQL primeiro." -ForegroundColor Yellow
    exit 1
}

# Solicitar senha do superuser
$pgPassword = Read-Host "Digite a senha do usuário 'postgres'" -AsSecureString
$pgPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pgPassword)
)

# Solicitar senha do novo usuário
$dbPassword = Read-Host "Digite a senha para o usuário 'manutapp_user'" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

if ([string]::IsNullOrWhiteSpace($dbPasswordPlain)) {
    Write-Host "❌ Senha não pode ser vazia!" -ForegroundColor Red
    exit 1
}

# Configurar variável de ambiente temporária
$env:PGPASSWORD = $pgPasswordPlain

Write-Host "📦 Criando banco de dados..." -ForegroundColor Yellow
& $pgPath -U postgres -c "CREATE DATABASE manutapp;" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Banco de dados criado" -ForegroundColor Green
} else {
    Write-Host "⚠️  Banco pode já existir, continuando..." -ForegroundColor Yellow
}

Write-Host "📦 Criando usuário..." -ForegroundColor Yellow
$createUserSQL = "CREATE USER manutapp_user WITH PASSWORD '$dbPasswordPlain';"
& $pgPath -U postgres -c $createUserSQL 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Usuário criado" -ForegroundColor Green
} else {
    Write-Host "⚠️  Usuário pode já existir, continuando..." -ForegroundColor Yellow
}

Write-Host "📦 Configurando permissões..." -ForegroundColor Yellow
& $pgPath -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE manutapp TO manutapp_user;" 2>&1 | Out-Null
& $pgPath -U postgres -d manutapp -c "GRANT ALL ON SCHEMA public TO manutapp_user;" 2>&1 | Out-Null
& $pgPath -U postgres -d manutapp -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO manutapp_user;" 2>&1 | Out-Null
& $pgPath -U postgres -d manutapp -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO manutapp_user;" 2>&1 | Out-Null

Write-Host "✅ Banco de dados configurado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Informações de conexão:" -ForegroundColor Yellow
Write-Host "   Database: manutapp" -ForegroundColor White
Write-Host "   User: manutapp_user" -ForegroundColor White
Write-Host "   Password: [a senha que você digitou]" -ForegroundColor White
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Port: 5432" -ForegroundColor White
Write-Host ""
Write-Host "📝 String de conexão para .env:" -ForegroundColor Yellow
Write-Host "   DATABASE_URL=`"postgresql://manutapp_user:$dbPasswordPlain@localhost:5432/manutapp?schema=public`"" -ForegroundColor Cyan

# Limpar senha da memória
$pgPasswordPlain = $null
$dbPasswordPlain = $null
$env:PGPASSWORD = $null
