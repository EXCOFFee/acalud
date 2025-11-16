#!/bin/bash

# Script para iniciar el servidor MCP de AcaLud

echo ""
echo "====================================================="
echo " 🔧 AcaLud MCP Server"
echo "====================================================="
echo ""

cd "$(dirname "$0")/backend"

echo "✅ Compilando servidor..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error al compilar"
    exit 1
fi

echo ""
echo "✅ Iniciando servidor MCP..."
echo ""
echo "📍 Conectándose a: localhost:5432"
echo "📦 Base de datos: acalud_db"
echo ""

export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=postgres
export DB_PASSWORD=santy331
export DB_NAME=acalud_db

node dist/mcp/acalud-mcp-server.js
