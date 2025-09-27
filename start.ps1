Write-Host "AcaLud - Plataforma Educativa" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Verificar Docker
Write-Host "Verificando Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "Docker encontrado" -ForegroundColor Green
} catch {
    Write-Host "Docker no encontrado. Instalarlo desde: https://www.docker.com" -ForegroundColor Red
    exit 1
}

# Crear .env si no existe
if (-not (Test-Path ".env")) {
    Write-Host "Creando archivo .env..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host ".env creado desde .env.example" -ForegroundColor Green
    } else {
        @"
POSTGRES_DB=acalud
POSTGRES_USER=acalud_user
POSTGRES_PASSWORD=acalud_password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
JWT_SECRET=acalud_super_secret_jwt_key_2024
JWT_EXPIRES_IN=24h
REDIS_HOST=redis
REDIS_PORT=6379
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
NODE_ENV=development
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host ".env basico creado" -ForegroundColor Green
    }
}

# Detener servicios existentes
Write-Host "Deteniendo servicios existentes..." -ForegroundColor Yellow
docker-compose down --remove-orphans 2>$null

# Iniciar servicios
Write-Host "Iniciando base de datos..." -ForegroundColor Yellow
docker-compose up -d postgres redis

Write-Host "Esperando PostgreSQL..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Iniciando backend..." -ForegroundColor Yellow
docker-compose up -d backend

Write-Host "Esperando backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js no encontrado. Instalarlo desde: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Instalar dependencias si no existen
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install --silent
}

# Iniciar frontend
Write-Host "Iniciando frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command", "npm run dev" -WindowStyle Hidden

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "AcaLud esta funcionando!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Accede a:" -ForegroundColor White
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  API Docs: http://localhost:3001/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cuentas de prueba:" -ForegroundColor White
Write-Host "  Estudiante: student@demo.com / password123" -ForegroundColor Yellow
Write-Host "  Profesor: teacher@demo.com / password123" -ForegroundColor Yellow
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor White
Write-Host "  Ver logs: docker-compose logs -f" -ForegroundColor Gray
Write-Host "  Detener: docker-compose down" -ForegroundColor Gray
Write-Host ""
Write-Host "Disfruta AcaLud!" -ForegroundColor Green