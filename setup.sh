#!/bin/bash

# ============================================================================
# SCRIPT DE SETUP - ACALUD
# ============================================================================
# Automatiza la instalación y configuración del proyecto AcaLud

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de utilidad
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar prerrequisitos
check_prerequisites() {
    print_status "Verificando prerrequisitos..."
    
    # Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js no está instalado. Por favor instala Node.js 18 o superior."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js versión 18 o superior es requerida. Versión actual: $(node -v)"
        exit 1
    fi
    
    # npm
    if ! command -v npm &> /dev/null; then
        print_error "npm no está instalado."
        exit 1
    fi
    
    # Docker (opcional)
    if command -v docker &> /dev/null; then
        print_success "Docker detectado: $(docker --version)"
        DOCKER_AVAILABLE=true
    else
        print_warning "Docker no detectado. Se usará instalación manual."
        DOCKER_AVAILABLE=false
    fi
    
    # Docker Compose (opcional)
    if command -v docker-compose &> /dev/null; then
        print_success "Docker Compose detectado: $(docker-compose --version)"
        COMPOSE_AVAILABLE=true
    else
        print_warning "Docker Compose no detectado."
        COMPOSE_AVAILABLE=false
    fi
    
    print_success "Prerrequisitos verificados"
}

# Configurar variables de entorno
setup_environment() {
    print_status "Configurando variables de entorno..."
    
    # Backend
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        print_success "Archivo backend/.env creado desde template"
        print_warning "Por favor revisa y modifica backend/.env con tus configuraciones"
    else
        print_warning "backend/.env ya existe, saltando..."
    fi
    
    # Frontend
    if [ ! -f ".env" ]; then
        cat > .env << EOL
VITE_API_URL=http://localhost:3001/api/v1
VITE_APP_NAME=AcaLud
EOL
        print_success "Archivo .env creado para frontend"
    else
        print_warning ".env ya existe, saltando..."
    fi
}

# Instalar dependencias
install_dependencies() {
    print_status "Instalando dependencias..."
    
    # Frontend
    print_status "Instalando dependencias del frontend..."
    npm install
    print_success "Dependencias del frontend instaladas"
    
    # Backend
    print_status "Instalando dependencias del backend..."
    cd backend
    npm install
    cd ..
    print_success "Dependencias del backend instaladas"
}

# Setup con Docker
setup_docker() {
    print_status "Configurando con Docker..."
    
    # Crear red Docker si no existe
    if ! docker network ls | grep -q "acalud-network"; then
        docker network create acalud-network
        print_success "Red Docker 'acalud-network' creada"
    fi
    
    # Levantar servicios
    print_status "Levantando servicios con Docker Compose..."
    docker-compose up -d postgres redis
    
    # Esperar a que la base de datos esté lista
    print_status "Esperando a que PostgreSQL esté listo..."
    until docker-compose exec -T postgres pg_isready -U postgres; do
        sleep 2
    done
    print_success "PostgreSQL está listo"
    
    # Ejecutar migraciones
    print_status "Ejecutando migraciones de base de datos..."
    cd backend
    npm run migration:run || print_warning "No hay migraciones para ejecutar"
    cd ..
    
    print_success "Setup con Docker completado"
}

# Setup manual (sin Docker)
setup_manual() {
    print_status "Configurando manualmente..."
    print_warning "Asegúrate de tener PostgreSQL y Redis ejecutándose localmente"
    print_warning "PostgreSQL debe estar disponible en localhost:5432"
    print_warning "Redis debe estar disponible en localhost:6379"
    
    # Verificar conexión a PostgreSQL
    if command -v psql &> /dev/null; then
        print_status "Intentando conectar a PostgreSQL..."
        if psql -h localhost -U postgres -d postgres -c "SELECT 1;" &> /dev/null; then
            print_success "Conexión a PostgreSQL exitosa"
        else
            print_error "No se pudo conectar a PostgreSQL"
            print_error "Asegúrate de que PostgreSQL esté ejecutándose en localhost:5432"
            print_error "Usuario: postgres, Base de datos: acalud_db"
        fi
    fi
    
    print_success "Setup manual completado"
}

# Crear scripts de desarrollo
create_dev_scripts() {
    print_status "Creando scripts de desarrollo..."
    
    # Script para desarrollo
    cat > dev.sh << 'EOL'
#!/bin/bash
echo "🚀 Iniciando AcaLud en modo desarrollo..."

# Función para cleanup
cleanup() {
    echo "🛑 Deteniendo servicios..."
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Iniciar backend
echo "📡 Iniciando backend..."
cd backend && npm run start:dev &
BACKEND_PID=$!

# Esperar un poco para que el backend inicie
sleep 5

# Iniciar frontend
echo "🎨 Iniciando frontend..."
cd .. && npm run dev &
FRONTEND_PID=$!

echo "✅ Servicios iniciados:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo "   API Docs: http://localhost:3001/api/docs"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"

# Esperar a que terminen los procesos
wait $BACKEND_PID $FRONTEND_PID
EOL

    chmod +x dev.sh
    print_success "Script dev.sh creado"
    
    # Script para producción local
    cat > prod.sh << 'EOL'
#!/bin/bash
echo "🚀 Iniciando AcaLud en modo producción..."

# Build frontend
echo "🏗️  Construyendo frontend..."
npm run build

# Build backend
echo "🏗️  Construyendo backend..."
cd backend && npm run build

echo "✅ Build completado"
echo "Para deploy usar: docker-compose up -d"
EOL

    chmod +x prod.sh
    print_success "Script prod.sh creado"
}

# Mostrar información final
show_final_info() {
    print_success "🎉 Setup de AcaLud completado!"
    echo ""
    echo "📋 Próximos pasos:"
    echo ""
    
    if [ "$DOCKER_AVAILABLE" = true ] && [ "$COMPOSE_AVAILABLE" = true ]; then
        echo "🐳 Usando Docker:"
        echo "   docker-compose up -d          # Levantar todos los servicios"
        echo "   docker-compose logs -f        # Ver logs"
        echo "   docker-compose down           # Detener servicios"
        echo ""
    fi
    
    echo "🛠️  Desarrollo manual:"
    echo "   ./dev.sh                      # Iniciar en modo desarrollo"
    echo "   ./prod.sh                     # Build para producción"
    echo ""
    echo "🌐 URLs de desarrollo:"
    echo "   Frontend:  http://localhost:5173"
    echo "   Backend:   http://localhost:3001"
    echo "   API Docs:  http://localhost:3001/api/docs"
    echo ""
    echo "📖 Documentación completa en README.md"
    echo ""
    print_warning "⚠️  Recuerda configurar las variables de entorno en backend/.env antes de producción"
}

# Función principal
main() {
    echo "🎓 AcaLud - Setup Automático"
    echo "============================="
    echo ""
    
    check_prerequisites
    setup_environment
    install_dependencies
    
    if [ "$DOCKER_AVAILABLE" = true ] && [ "$COMPOSE_AVAILABLE" = true ]; then
        echo ""
        read -p "¿Deseas usar Docker para el setup? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            setup_docker
        else
            setup_manual
        fi
    else
        setup_manual
    fi
    
    create_dev_scripts
    show_final_info
}

# Ejecutar función principal
main "$@"
