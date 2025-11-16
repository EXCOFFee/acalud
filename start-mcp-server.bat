@echo off
REM Script para iniciar el servidor MCP de AcaLud

echo.
echo =====================================================
echo  🔧 AcaLud MCP Server
echo =====================================================
echo.

cd /d "%~dp0backend"

echo ✅ Compilando servidor...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error al compilar
    pause
    exit /b 1
)

echo.
echo ✅ Iniciando servidor MCP...
echo.
echo 📍 Conectándose a: localhost:5432
echo 📦 Base de datos: acalud_db
echo.

set DB_HOST=localhost
set DB_PORT=5432
set DB_USERNAME=postgres
set DB_PASSWORD=santy331
set DB_NAME=acalud_db

node dist/mcp/acalud-mcp-server.js

pause
