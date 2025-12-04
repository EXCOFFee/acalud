#!/bin/bash

# 🚀 Script de desarrollo local - AcaLud
# Ejecuta frontend y backend en paralelo para desarrollo

echo "🏁 Iniciando AcaLud en modo desarrollo..."
echo "==============================================="

# Función para limpiar procesos al salir
cleanup() {
    echo "🛑 Deteniendo servicios..."
    jobs -p | xargs -r kill
    exit 0
}

# Capturar Ctrl+C para limpiar
trap cleanup INT

# Verificar que las dependencias estén instaladas
echo "📦 Verificando dependencias..."

if [ ! -d "node_modules" ]; then
    echo "⚠️  Instalando dependencias del frontend..."
    pnpm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo "⚠️  Instalando dependencias del backend..."
    cd backend && pnpm install && cd ..
fi

echo "✅ Dependencias verificadas"
echo ""

# Iniciar servicios en paralelo
echo "🎯 Iniciando Frontend (Puerto 5173)..."
pnpm run dev &
FRONTEND_PID=$!

echo "🎯 Iniciando Backend (Puerto 3000)..."
cd backend && pnpm run start:dev &
BACKEND_PID=$!
cd ..

echo ""
echo "🎉 ¡AcaLud ejecutándose!"
echo "==============================================="
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:3000"
echo "📚 API Docs: http://localhost:3000/api"
echo ""
echo "💡 Presiona Ctrl+C para detener todos los servicios"
echo ""

# Esperar a que terminen los procesos
wait $FRONTEND_PID $BACKEND_PID