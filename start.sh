#!/bin/bash

# 🚀 Script de Inicio - AcaLud
# Este script automatiza el inicio completo de la plataforma

echo "🎓 Iniciando AcaLud - Plataforma Educativa..."
echo "================================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Verificar si Docker está corriendo
echo -e "${YELLOW}🔍 Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    echo -e "${YELLOW}Por favor instala Docker desde: https://www.docker.com/get-started${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker no está corriendo${NC}"
    echo -e "${YELLOW}Por favor inicia Docker y vuelve a intentar${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker encontrado y funcionando${NC}"

# Verificar si Docker Compose está disponible
echo -e "${YELLOW}🔍 Verificando Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose encontrado${NC}"

# Verificar si existe el archivo .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creando archivo .env...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Archivo .env creado desde .env.example${NC}"
    else
        echo -e "${YELLOW}⚠️  .env.example no encontrado, creando .env básico...${NC}"
        cat > .env << EOF
# Configuración básica para AcaLud
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
EOF
        echo -e "${GREEN}✅ Archivo .env básico creado${NC}"
    fi
fi

# Detener servicios existentes si están corriendo
echo -e "${YELLOW}🛑 Deteniendo servicios existentes...${NC}"
docker-compose down --remove-orphans &> /dev/null

# Construir imágenes Docker
echo -e "${YELLOW}🏗️  Construyendo imágenes Docker...${NC}"
docker-compose build

# Iniciar servicios base (PostgreSQL y Redis)
echo -e "${YELLOW}🗄️  Iniciando base de datos y cache...${NC}"
docker-compose up -d postgres redis

# Esperar a que PostgreSQL esté listo
echo -e "${YELLOW}⏳ Esperando que PostgreSQL esté listo...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    sleep 2
    ((attempt++))
    if docker-compose exec -T postgres pg_isready -U acalud_user -d acalud &> /dev/null; then
        echo -e "${GREEN}✅ PostgreSQL está listo${NC}"
        break
    fi
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ PostgreSQL tardó demasiado en iniciarse${NC}"
        exit 1
    fi
    echo -e "${YELLOW}⏳ Esperando PostgreSQL... (intento $attempt/$max_attempts)${NC}"
done

# Iniciar el backend
echo -e "${YELLOW}🖥️  Iniciando backend...${NC}"
docker-compose up -d backend

# Esperar a que el backend esté listo
echo -e "${YELLOW}⏳ Esperando que el backend esté listo...${NC}"
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    sleep 3
    ((attempt++))
    if curl -f -s http://localhost:3001/api/v1/monitoring/health &> /dev/null; then
        echo -e "${GREEN}✅ Backend está listo y funcionando${NC}"
        break
    fi
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ Backend tardó demasiado en iniciarse${NC}"
        echo -e "${YELLOW}Revisar logs: docker-compose logs backend${NC}"
        exit 1
    fi
    echo -e "${YELLOW}⏳ Esperando backend... (intento $attempt/$max_attempts)${NC}"
done

# Verificar si Node.js está instalado para el frontend
echo -e "${YELLOW}🔍 Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo -e "${YELLOW}Por favor instala Node.js desde: https://nodejs.org/${NC}"
    exit 1
fi

node_version=$(node --version)
echo -e "${GREEN}✅ Node.js encontrado: $node_version${NC}"

# Instalar dependencias del frontend si no existen
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependencias del frontend...${NC}"
    npm install --silent
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dependencias instaladas${NC}"
    else
        echo -e "${RED}❌ Error instalando dependencias${NC}"
        exit 1
    fi
fi

# Iniciar el frontend en segundo plano
echo -e "${YELLOW}🌐 Iniciando frontend...${NC}"
npm run dev &> /dev/null &
FRONTEND_PID=$!

# Esperar un poco para que el frontend inicie
sleep 5

# Verificar que todo esté funcionando
echo -e "${YELLOW}🔍 Verificando servicios...${NC}"

# Verificar backend
if curl -f -s http://localhost:3001/api/v1/monitoring/health &> /dev/null; then
    echo -e "${GREEN}✅ Backend: http://localhost:3001 - OK${NC}"
else
    echo -e "${RED}❌ Backend no responde en http://localhost:3001${NC}"
fi

# Verificar frontend
if curl -f -s http://localhost:5173 &> /dev/null; then
    echo -e "${GREEN}✅ Frontend: http://localhost:5173 - OK${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend aún iniciando en http://localhost:5173${NC}"
fi

echo ""
echo -e "${GREEN}🎉 ¡AcaLud está funcionando!${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${WHITE}📱 Accede a la aplicación:${NC}"
echo -e "   ${CYAN}Frontend: http://localhost:5173${NC}"
echo -e "   ${CYAN}Backend API: http://localhost:3001${NC}"
echo -e "   ${CYAN}Documentación: http://localhost:3001/api/docs${NC}"
echo ""
echo -e "${WHITE}👥 Cuentas de prueba:${NC}"
echo -e "   ${YELLOW}Estudiante: student@demo.com / password123${NC}"
echo -e "   ${YELLOW}Profesor: teacher@demo.com / password123${NC}"
echo ""
echo -e "${WHITE}🛠️  Comandos útiles:${NC}"
echo -e "   ${GRAY}Ver logs: docker-compose logs -f${NC}"
echo -e "   ${GRAY}Detener: docker-compose down${NC}"
echo -e "   ${GRAY}Reiniciar: docker-compose restart${NC}"
echo ""
echo -e "${GREEN}🚀 ¡Disfruta usando AcaLud!${NC}"

# Mantener el script corriendo para mostrar logs si se desea
echo ""
echo -e "${YELLOW}Presiona Ctrl+C para detener todos los servicios...${NC}"
trap 'echo -e "\n${YELLOW}🛑 Deteniendo servicios...${NC}"; kill $FRONTEND_PID 2>/dev/null; docker-compose down; echo -e "${GREEN}✅ Servicios detenidos${NC}"; exit 0' INT

# Esperar indefinidamente
while true; do
    sleep 1
done