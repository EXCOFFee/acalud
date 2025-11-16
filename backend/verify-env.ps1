# Script de Verificacion de Entorno - Testing CU-20 y CU-11
# Fecha: 30 de septiembre de 2025

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  VERIFICACION DE ENTORNO - TESTING" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Variables
$backendPath = "C:\Users\santi\Downloads\acalud\backend"
$testImagesPath = "C:\Users\santi\Downloads\test-images"
$uploadsPath = "$backendPath\uploads\avatars"
$baseUrl = "http://localhost:3000"
$e2eTestPath = "$backendPath\test\communications\cu20-cu11.e2e-spec.ts"

$allGood = $true

# 1. Verificar Backend
Write-Host "[1] Verificando Backend..." -ForegroundColor Yellow

$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "    [OK] Backend esta corriendo" -ForegroundColor Green
    Write-Host "    Procesos Node.js: $($nodeProcesses.Count)" -ForegroundColor Gray
} else {
    Write-Host "    [ERROR] Backend NO esta corriendo" -ForegroundColor Red
    Write-Host "    Ejecuta: cd $backendPath; npm run start:dev" -ForegroundColor Yellow
    $allGood = $false
}

# Verificar conectividad
try {
    $null = Invoke-WebRequest -Uri "$baseUrl/api" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "    [OK] Backend responde en $baseUrl" -ForegroundColor Green
} catch {
    Write-Host "    [WARN] Backend no responde en $baseUrl" -ForegroundColor Yellow
}

Write-Host ""

# 2. Verificar Directorio de Uploads
Write-Host "[2] Verificando Directorio de Uploads..." -ForegroundColor Yellow

if (Test-Path $uploadsPath) {
    Write-Host "    [OK] Directorio uploads/avatars existe" -ForegroundColor Green
    $files = Get-ChildItem $uploadsPath -ErrorAction SilentlyContinue
    Write-Host "    Archivos actuales: $($files.Count)" -ForegroundColor Gray
} else {
    Write-Host "    [WARN] Directorio uploads/avatars NO existe" -ForegroundColor Yellow
    Write-Host "    Se creara automaticamente al subir el primer avatar" -ForegroundColor Gray
}

Write-Host ""

# 3. Preparar Directorio de Imagenes de Prueba
Write-Host "[3] Preparando Directorio de Imagenes de Prueba..." -ForegroundColor Yellow

if (-not (Test-Path $testImagesPath)) {
    New-Item -Path $testImagesPath -ItemType Directory -Force | Out-Null
    Write-Host "    [OK] Directorio creado: $testImagesPath" -ForegroundColor Green
} else {
    Write-Host "    [OK] Directorio ya existe: $testImagesPath" -ForegroundColor Green
}

Write-Host ""

# 4. Verificar Archivos de Prueba
Write-Host "[4] Verificando Archivos de Prueba..." -ForegroundColor Yellow

$requiredFiles = @("avatar-valid.jpg", "avatar-valid.png")
$optionalFiles = @("avatar-valid.webp", "avatar-large.jpg", "document.pdf", "animation.gif")

$missingRequired = @()

foreach ($fileName in $requiredFiles) {
    $filePath = Join-Path $testImagesPath $fileName
    if (Test-Path $filePath) {
        $fileInfo = Get-Item $filePath
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        Write-Host "    [OK] $fileName - $sizeMB MB" -ForegroundColor Green
    } else {
        Write-Host "    [ERROR] $fileName - NO ENCONTRADO (REQUERIDO)" -ForegroundColor Red
        $missingRequired += $fileName
        $allGood = $false
    }
}

foreach ($fileName in $optionalFiles) {
    $filePath = Join-Path $testImagesPath $fileName
    if (Test-Path $filePath) {
        $fileInfo = Get-Item $filePath
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        Write-Host "    [OK] $fileName - $sizeMB MB (opcional)" -ForegroundColor Green
    } else {
        Write-Host "    [WARN] $fileName - No encontrado (opcional)" -ForegroundColor Yellow
    }
}

Write-Host ""

# 5. Verificar Suite de Testing (Jest)
Write-Host "[5] Verificando Suite de Testing (Jest)..." -ForegroundColor Yellow

if (Test-Path $e2eTestPath) {
    Write-Host "    [OK] Archivo de pruebas encontrado: test/communications/cu20-cu11.e2e-spec.ts" -ForegroundColor Green
} else {
    Write-Host "    [ERROR] Archivo de pruebas no encontrado" -ForegroundColor Red
    Write-Host "    Verifica que el repositorio esté actualizado" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""

# 6. Verificar Guia de Testing
Write-Host "[6] Verificando Guia de Testing..." -ForegroundColor Yellow

$guidePath = "$backendPath\GUIA_TESTING_JEST.md"
if (Test-Path $guidePath) {
    Write-Host "    [OK] Guia encontrada: GUIA_TESTING_JEST.md" -ForegroundColor Green
} else {
    Write-Host "    [WARN] Guia no encontrada" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  RESUMEN" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

if ($allGood -and $missingRequired.Count -eq 0) {
    Write-Host "[OK] ENTORNO LISTO PARA TESTING" -ForegroundColor Green
    Write-Host ""
    Write-Host "Proximos pasos:" -ForegroundColor Yellow
    Write-Host "  1. Ejecuta pruebas E2E:" -ForegroundColor White
    Write-Host "     cd $backendPath" -ForegroundColor Gray
    Write-Host "     npm run test:e2e -- --runTestsByPath test/communications/cu20-cu11.e2e-spec.ts" -ForegroundColor Gray
    Write-Host "  2. Revisa que todas las aserciones pasen" -ForegroundColor White
    Write-Host "  3. Documenta resultados en el repositorio" -ForegroundColor White
    Write-Host ""
    Write-Host "Documentacion:" -ForegroundColor Cyan
    Write-Host "  - GUIA_TESTING_JEST.md (paso a paso con Jest)" -ForegroundColor Gray
    Write-Host "  - PRUEBAS_CU20_CU11.md (casos detallados)" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "[WARN] ENTORNO REQUIERE CONFIGURACION" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $nodeProcesses) {
        Write-Host "[ACCION REQUERIDA] Iniciar backend:" -ForegroundColor Red
        Write-Host "  cd $backendPath" -ForegroundColor Gray
        Write-Host "  npm run start:dev" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($missingRequired.Count -gt 0) {
        Write-Host "[ACCION REQUERIDA] Copiar archivos de prueba:" -ForegroundColor Red
        Write-Host "  Directorio: $testImagesPath" -ForegroundColor Gray
        Write-Host "  Archivos faltantes:" -ForegroundColor Gray
        foreach ($file in $missingRequired) {
            Write-Host "    - $file" -ForegroundColor Gray
        }
        Write-Host ""
    }
}

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
