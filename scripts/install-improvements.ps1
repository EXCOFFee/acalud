# ============================================================================
# 🚀 SCRIPT DE INSTALACIÓN COMPLETA - ACALUD MEJORADO (WINDOWS)
# ============================================================================
# Instala todas las dependencias y configura el proyecto con las mejoras

Write-Host "🎯 Instalando AcaLud con mejoras de alta prioridad..." -ForegroundColor Blue
Write-Host ""

# Funciones para mensajes coloreados
function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Verificar Node.js
Write-Info "Verificando Node.js..."
try {
    $nodeVersion = node --version
    $majorVersion = [int]($nodeVersion -split '\.')[0].TrimStart('v')
    
    if ($majorVersion -lt 18) {
        Write-Error "Node.js 18+ es requerido. Versión actual: $nodeVersion"
        exit 1
    }
    
    Write-Success "Node.js $nodeVersion detectado"
} catch {
    Write-Error "Node.js no está instalado. Por favor instala Node.js 18+ primero."
    exit 1
}

# Verificar npm
Write-Info "Verificando npm..."
try {
    $npmVersion = npm --version
    Write-Success "npm $npmVersion detectado"
} catch {
    Write-Error "npm no está disponible"
    exit 1
}

# ============================================================================
# INSTALACIÓN DEL FRONTEND
# ============================================================================

Write-Info "🔧 Instalando dependencias del frontend..."

# Instalar dependencias existentes
Write-Info "Instalando dependencias base..."
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Error "Error instalando dependencias base del frontend"
    exit 1
}

# Instalar nuevas dependencias para las mejoras
Write-Info "Instalando nuevas dependencias de mejoras..."

# React Router
npm install react-router-dom

# Testing
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest ts-jest @types/jest

# Jest environment
npm install --save-dev jest-environment-jsdom

Write-Success "✅ Frontend: Dependencias instaladas"

# Crear directorio de tests si no existe
if (!(Test-Path "src\test")) {
    New-Item -ItemType Directory -Path "src\test"
    Write-Success "Directorio src\test creado"
}

# Crear directorio de __tests__ para componentes
if (!(Test-Path "src\components\Auth\__tests__")) {
    New-Item -ItemType Directory -Path "src\components\Auth\__tests__" -Force
    Write-Success "Directorio src\components\Auth\__tests__ creado"
}

# ============================================================================
# INSTALACIÓN DEL BACKEND
# ============================================================================

Write-Info "🔧 Instalando dependencias del backend..."

Set-Location backend

# Instalar dependencias existentes
Write-Info "Instalando dependencias base del backend..."
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Error "Error instalando dependencias base del backend"
    Set-Location ..
    exit 1
}

# Instalar nuevas dependencias para testing
Write-Info "Instalando dependencias de testing..."
npm install --save-dev @types/jest jest ts-jest supertest @types/supertest

Write-Success "✅ Backend: Dependencias instaladas"

# Crear directorio de tests si no existe
if (!(Test-Path "test")) {
    New-Item -ItemType Directory -Path "test"
    Write-Success "Directorio test creado"
}

if (!(Test-Path "src\test")) {
    New-Item -ItemType Directory -Path "src\test"
    Write-Success "Directorio src\test creado"
}

Set-Location ..

# ============================================================================
# CONFIGURACIÓN DE SCRIPTS
# ============================================================================

Write-Info "📝 Configurando scripts de package.json..."

# Verificar si package.json del frontend tiene los scripts necesarios
$frontendPackage = Get-Content "package.json" | ConvertFrom-Json

# Agregar scripts si no existen
$scriptsToAdd = @{
    "test" = "jest"
    "test:watch" = "jest --watch"
    "test:coverage" = "jest --coverage"
    "test:ci" = "jest --coverage --watchAll=false"
}

$updated = $false
foreach ($script in $scriptsToAdd.GetEnumerator()) {
    if (-not $frontendPackage.scripts.PSObject.Properties.Name.Contains($script.Key)) {
        $frontendPackage.scripts | Add-Member -MemberType NoteProperty -Name $script.Key -Value $script.Value
        $updated = $true
    }
}

if ($updated) {
    $frontendPackage | ConvertTo-Json -Depth 10 | Set-Content "package.json"
    Write-Success "Scripts del frontend actualizados"
}

# Backend scripts
Set-Location backend
$backendPackage = Get-Content "package.json" | ConvertFrom-Json

$backendScriptsToAdd = @{
    "test" = "jest"
    "test:watch" = "jest --watch"
    "test:coverage" = "jest --coverage"
    "test:e2e" = "jest --config test/jest-e2e.json"
}

$backendUpdated = $false
foreach ($script in $backendScriptsToAdd.GetEnumerator()) {
    if (-not $backendPackage.scripts.PSObject.Properties.Name.Contains($script.Key)) {
        $backendPackage.scripts | Add-Member -MemberType NoteProperty -Name $script.Key -Value $script.Value
        $backendUpdated = $true
    }
}

if ($backendUpdated) {
    $backendPackage | ConvertTo-Json -Depth 10 | Set-Content "package.json"
    Write-Success "Scripts del backend actualizados"
}

Set-Location ..

# ============================================================================
# VERIFICACIÓN FINAL
# ============================================================================

Write-Info "🔍 Verificando instalación..."

# Verificar archivos clave
$filesToCheck = @(
    "jest.config.js",
    "src\router\index.tsx",
    "src\utils\monitoring\logger.tsx",
    "backend\jest.config.js",
    "backend\src\modules\monitoring\monitoring.module.ts"
)

$allFilesExist = $true
foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        Write-Success "✅ $file existe"
    } else {
        Write-Warning "⚠️  $file no encontrado"
        $allFilesExist = $false
    }
}

# Verificar dependencias clave
Write-Info "Verificando dependencias instaladas..."

try {
    # Verificar React Router
    npm list react-router-dom --depth=0 | Out-Null
    Write-Success "✅ react-router-dom instalado"
} catch {
    Write-Warning "⚠️  react-router-dom puede no estar instalado correctamente"
}

try {
    # Verificar Jest
    npm list jest --depth=0 | Out-Null
    Write-Success "✅ jest instalado en frontend"
} catch {
    Write-Warning "⚠️  jest puede no estar instalado correctamente en frontend"
}

# ============================================================================
# INSTRUCCIONES FINALES
# ============================================================================

Write-Host ""
Write-Host "🎉 ¡INSTALACIÓN COMPLETADA!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 🧪 Ejecutar tests:" -ForegroundColor White
Write-Host "   Frontend: npm test" -ForegroundColor Gray
Write-Host "   Backend:  cd backend && npm test" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🚀 Iniciar desarrollo:" -ForegroundColor White
Write-Host "   Frontend: npm run dev" -ForegroundColor Gray
Write-Host "   Backend:  cd backend && npm run start:dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 🐳 Usar Docker (opcional):" -ForegroundColor White
Write-Host "   docker-compose up -d" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 URLs DISPONIBLES:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor Gray
Write-Host "   API Docs: http://localhost:3001/api/docs" -ForegroundColor Gray
Write-Host "   Health:   http://localhost:3001/api/v1/monitoring/health" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 DOCUMENTACIÓN:" -ForegroundColor Yellow
Write-Host "   📖 MEJORAS_IMPLEMENTADAS.md - Documentación completa" -ForegroundColor Gray
Write-Host "   📖 README.md - Guía general del proyecto" -ForegroundColor Gray
Write-Host ""

if ($allFilesExist) {
    Write-Success "🎯 ¡Todas las mejoras están listas para usar!"
} else {
    Write-Warning "⚠️  Algunos archivos pueden necesitar verificación manual"
}

Write-Host ""
Write-Host "🤝 ¡Gracias por mejorar AcaLud! Happy coding! 🚀" -ForegroundColor Blue
