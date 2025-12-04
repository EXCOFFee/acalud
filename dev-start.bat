@echo off
REM 🚀 Script de desarrollo local - AcaLud (Windows)
REM Ejecuta frontend y backend en paralelo para desarrollo

echo 🏁 Iniciando AcaLud en modo desarrollo...
echo ===============================================

REM Verificar que las dependencias estén instaladas
echo 📦 Verificando dependencias...

if not exist "node_modules\" (
    echo ⚠️  Instalando dependencias del frontend...
    call pnpm install
)

if not exist "backend\node_modules\" (
    echo ⚠️  Instalando dependencias del backend...
    cd backend
    call pnpm install
    cd ..
)

echo ✅ Dependencias verificadas
echo.

REM Iniciar servicios en paralelo
echo 🎯 Iniciando Frontend y Backend...
echo.
echo 🎉 ¡AcaLud ejecutándose!
echo ===============================================
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:3000
echo 📚 API Docs: http://localhost:3000/api
echo.
echo 💡 Presiona Ctrl+C para detener todos los servicios
echo.

REM Iniciar en paralelo usando start
start "AcaLud Frontend" cmd /k "pnpm run dev"
start "AcaLud Backend" cmd /k "cd backend && pnpm run start:dev"

echo ✨ Servicios iniciados en ventanas separadas
pause