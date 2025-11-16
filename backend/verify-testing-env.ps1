# Script de Verificacion de Entorno - Testing CU-20 y CU-11

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   VERIFICACION DE ENTORNO - TESTING" -ForegroundColor Cyan
Write-Host "   CU-20 y CU-11" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Variables
$backendPath = "C:\Users\santi\Downloads\acalud\backend"
$testImagesPath = "C:\Users\santi\Downloads\test-images"
$uploadsPath = "$backendPath\uploads\avatars"
$baseUrl = "http://localhost:3000"

# 1. Verificar Backend
Write-Host "[1] Verificando Backend..." -ForegroundColor Yellow
Write-Host ""

# Verificar proceso Node.js
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   ✅ Backend está corriendo" -ForegroundColor Green
    Write-Host "   📊 Procesos Node.js activos: $($nodeProcesses.Count)" -ForegroundColor Gray
} else {
    Write-Host "   ❌ Backend NO está corriendo" -ForegroundColor Red
    Write-Host "   💡 Ejecuta: cd $backendPath; npm run start:dev" -ForegroundColor Yellow
    exit 1
}

# Verificar conectividad
try {
    $null = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Backend responde en $baseUrl" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Backend no responde en $baseUrl" -ForegroundColor Yellow
    Write-Host "   💡 Verifica que el servidor esté levantado correctamente" -ForegroundColor Gray
}

Write-Host ""

# 2. Verificar Directorio de Uploads
Write-Host "2️⃣  Verificando Directorio de Uploads..." -ForegroundColor Yellow
Write-Host ""

if (Test-Path $uploadsPath) {
    Write-Host "   ✅ Directorio uploads/avatars existe" -ForegroundColor Green
    $files = Get-ChildItem $uploadsPath -ErrorAction SilentlyContinue
    Write-Host "   📁 Archivos actuales: $($files.Count)" -ForegroundColor Gray
    
    if ($files.Count -gt 0) {
        Write-Host "   📄 Últimos 5 archivos:" -ForegroundColor Gray
        $files | Select-Object -First 5 | ForEach-Object {
            $sizeKB = [math]::Round($_.Length / 1KB, 2)
            Write-Host "      - $($_.Name) ($sizeKB KB)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "   ⚠️  Directorio uploads/avatars NO existe" -ForegroundColor Yellow
    Write-Host "   💡 Se creará automáticamente al subir el primer avatar" -ForegroundColor Gray
}

Write-Host ""

# 3. Preparar Directorio de Imágenes de Prueba
Write-Host "3️⃣  Preparando Directorio de Imágenes de Prueba..." -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $testImagesPath)) {
    New-Item -Path $testImagesPath -ItemType Directory -Force | Out-Null
    Write-Host "   ✅ Directorio creado: $testImagesPath" -ForegroundColor Green
} else {
    Write-Host "   ✅ Directorio ya existe: $testImagesPath" -ForegroundColor Green
}

Write-Host ""

# 4. Verificar Archivos de Prueba
Write-Host "4️⃣  Verificando Archivos de Prueba..." -ForegroundColor Yellow
Write-Host ""

$requiredFiles = @(
    @{ Name = "avatar-valid.jpg"; Required = $true; MaxSize = 2MB },
    @{ Name = "avatar-valid.png"; Required = $true; MaxSize = 2MB },
    @{ Name = "avatar-valid.webp"; Required = $false; MaxSize = 2MB },
    @{ Name = "avatar-large.jpg"; Required = $false; MinSize = 2MB },
    @{ Name = "document.pdf"; Required = $false },
    @{ Name = "animation.gif"; Required = $false }
)

$missingFiles = @()

foreach ($file in $requiredFiles) {
    $filePath = Join-Path $testImagesPath $file.Name
    if (Test-Path $filePath) {
        $fileInfo = Get-Item $filePath
        $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)
        
        $sizeStr = if ($sizeMB -gt 0.1) { "$sizeMB MB" } else { "$sizeKB KB" }
        
        Write-Host "   ✅ $($file.Name) - $sizeStr" -ForegroundColor Green
        
        # Validar tamaño
        if ($file.MaxSize -and $fileInfo.Length -gt $file.MaxSize) {
            Write-Host "      ⚠️  Archivo muy grande (máx: $($file.MaxSize / 1MB) MB)" -ForegroundColor Yellow
        }
        if ($file.MinSize -and $fileInfo.Length -lt $file.MinSize) {
            Write-Host "      ⚠️  Archivo muy pequeño (mín: $($file.MinSize / 1MB) MB)" -ForegroundColor Yellow
        }
    } else {
        if ($file.Required) {
            Write-Host "   ❌ $($file.Name) - NO ENCONTRADO (REQUERIDO)" -ForegroundColor Red
            $missingFiles += $file.Name
        } else {
            Write-Host "   ⚠️  $($file.Name) - No encontrado (opcional)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""

# 5. Verificar configuración de Jest
Write-Host "5️⃣  Verificando configuración de Jest..." -ForegroundColor Yellow
Write-Host ""

$jestConfigPath = "$backendPath\test\jest-e2e.json"
$specPath = "$backendPath\test\communications\cu20-cu11.e2e-spec.ts"
$jestConfigExists = Test-Path $jestConfigPath
$specExists = Test-Path $specPath

if ($jestConfigExists) {
    Write-Host "   ✅ Configuración encontrada: test/jest-e2e.json" -ForegroundColor Green
} else {
    Write-Host "   ❌ Falta test/jest-e2e.json" -ForegroundColor Red
}

if ($specExists) {
    Write-Host "   ✅ Suite CU20/CU11 localizada" -ForegroundColor Green
} else {
    Write-Host "   ❌ No se encontró test/communications/cu20-cu11.e2e-spec.ts" -ForegroundColor Red
}

$packagePath = "$backendPath\package.json"
$hasE2eScript = $false
if (Test-Path $packagePath) {
    $packageJson = Get-Content $packagePath -Raw | ConvertFrom-Json
    if ($packageJson.scripts.'test:e2e') {
        $hasE2eScript = $true
        Write-Host "   ✅ Script npm run test:e2e disponible" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Script test:e2e no definido en package.json" -ForegroundColor Red
    }
}

Write-Host ""

# 6. Resumen
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "   RESUMEN" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

if ($nodeProcesses -and $missingFiles.Count -eq 0 -and $jestConfigExists -and $specExists -and $hasE2eScript) {
    Write-Host "✅ ENTORNO LISTO PARA TESTING" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos pasos:" -ForegroundColor Yellow
    Write-Host "   1. Ejecuta npm run test:e2e" -ForegroundColor White
    Write-Host "   2. Revisa resultados y logs en consola" -ForegroundColor White
    Write-Host "   3. Verifica archivos temporales en uploads/test" -ForegroundColor White
    Write-Host "   4. Documenta hallazgos relevantes" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 Guía completa: $backendPath\GUIA_TESTING_JEST.md" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  ENTORNO REQUIERE CONFIGURACIÓN" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $nodeProcesses) {
        Write-Host "❌ Backend no está corriendo" -ForegroundColor Red
        Write-Host "   → cd $backendPath" -ForegroundColor Gray
        Write-Host "   → npm run start:dev" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($missingFiles.Count -gt 0) {
        Write-Host "❌ Archivos de prueba faltantes:" -ForegroundColor Red
        foreach ($file in $missingFiles) {
            Write-Host "   → $file" -ForegroundColor Gray
        }
        Write-Host "   💡 Copia archivos de prueba a: $testImagesPath" -ForegroundColor Yellow
        Write-Host ""
    }
    
    if (-not $jestConfigExists -or -not $specExists -or -not $hasE2eScript) {
        Write-Host "❌ Configuración de Jest incompleta" -ForegroundColor Red
        if (-not $jestConfigExists) {
            Write-Host "   → Falta test/jest-e2e.json" -ForegroundColor Gray
        }
        if (-not $specExists) {
            Write-Host "   → Falta test/communications/cu20-cu11.e2e-spec.ts" -ForegroundColor Gray
        }
        if (-not $hasE2eScript) {
            Write-Host "   → Agrega script test:e2e en package.json" -ForegroundColor Gray
        }
        Write-Host ""
    }
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# 7. Crear archivos de prueba básicos (si no existen)
Write-Host "7️⃣  Creando Archivos de Prueba Básicos..." -ForegroundColor Yellow
Write-Host ""

# Crear archivo de texto de ejemplo para simular imágenes
if (-not (Test-Path "$testImagesPath\README.txt")) {
    $readmeContent = @"
ARCHIVOS DE PRUEBA PARA TESTING CU-11
======================================

Necesitas los siguientes archivos:

VÁLIDOS (< 2MB):
- avatar-valid.jpg   → Imagen JPG menor a 2MB
- avatar-valid.png   → Imagen PNG menor a 2MB
- avatar-valid.webp  → Imagen WebP menor a 2MB (opcional)

INVÁLIDOS:
- avatar-large.jpg   → Imagen JPG mayor a 2MB (para probar error)
- document.pdf       → Archivo PDF (para probar error de tipo)
- animation.gif      → Archivo GIF (para probar error de tipo)

INSTRUCCIONES:
1. Copia imágenes reales a este directorio
2. Renómbralas según los nombres de arriba
3. Verifica los tamaños con: Get-ChildItem | Select-Object Name, Length
4. Ejecuta nuevamente: .\verify-testing-env.ps1

UBICACIÓN: $testImagesPath

Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

    Set-Content -Path "$testImagesPath\README.txt" -Value $readmeContent -Encoding UTF8
    Write-Host "   ✅ Creado: README.txt con instrucciones" -ForegroundColor Green
}

Write-Host ""
Write-Host "💡 TIP: Revisa $testImagesPath\README.txt para instrucciones" -ForegroundColor Cyan
Write-Host ""
