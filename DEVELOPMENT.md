# 🚀 AcaLud - Guía de Desarrollo y Deploy

## 📋 **Requisitos Previos**
- Node.js 18+ 
- npm 8+
- Docker & Docker Compose (para deploy)
- PostgreSQL (para desarrollo local opcional)

## 🔧 **Desarrollo Local**

### **Opción 1: Script Automático (Recomendado)**
```bash
# Windows
./dev-start.bat

# Linux/Mac  
chmod +x dev-start.sh
./dev-start.sh
```

### **Opción 2: Comandos Manuales**
```bash
# Instalar todas las dependencias
npm run install:all

# Ejecutar frontend y backend juntos
npm run dev:full

# O ejecutar por separado:
npm run dev          # Solo frontend (puerto 5173)
npm run dev:backend  # Solo backend (puerto 3000)
```

### **URLs de Desarrollo:**
- 📱 **Frontend**: http://localhost:5173
- 🔧 **Backend**: http://localhost:3000  
- 📚 **API Docs**: http://localhost:3000/api
- 📊 **Swagger**: http://localhost:3000/api

## 🏗️ **Build y Testing**

```bash
# Compilar todo
npm run build:full

# Verificar tipos TypeScript
npm run type-check:full

# Linting completo
npm run lint:full

# Tests
npm test                # Frontend tests
cd backend && npm test  # Backend tests
```

## 🐳 **Deploy con Docker**

### **Desarrollo/Testing con Docker:**
```bash
# Build y ejecutar todos los servicios
npm run docker:up:build

# Solo ejecutar (si ya está buildeado)
npm run docker:up

# Detener servicios
npm run docker:down
```

### **Producción:**
```bash
# Build para producción
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build

# Con variables de entorno
docker-compose --env-file .env.prod up --build
```

## 🌐 **URLs de Docker Deploy:**
- 📱 **Frontend**: http://localhost:80
- 🔧 **Backend**: http://localhost:3000
- 🗄️ **PostgreSQL**: localhost:5432
- 🚀 **Redis**: localhost:6379

## 📁 **Estructura del Workflow**

```
📦 acalud/
├── 🎯 dev-start.bat/sh     # Scripts de desarrollo rápido
├── 📦 package.json         # Scripts centralizados
├── 🐳 docker-compose.yml   # Orquestación de servicios
├── 🔧 backend/             # API NestJS + TypeScript
│   ├── 📦 package.json     # Dependencias backend
│   ├── 🐳 Dockerfile       # Imagen del backend
│   └── 🔧 src/             # Código fuente
└── 🎨 src/                 # Frontend React + TypeScript
    ├── 🎨 components/      # Componentes React
    └── 🔧 services/        # Servicios API
```

## 🔥 **Comandos Útiles**

```bash
# Desarrollo
npm run dev:full              # Todo junto con hot reload
npm run type-check:full       # Verificar TypeScript completo
npm run lint:full             # Linting completo

# Docker  
npm run docker:up:build       # Build + ejecutar servicios
npm run docker:down           # Detener todo

# Utilidades
npm run install:all           # Instalar dependencias completas
npm run build:full            # Build de producción completo
```

## 🎯 **Flujo de Trabajo Recomendado**

1. **Desarrollo**: `npm run dev:full` o `./dev-start.bat`
2. **Testing**: `npm run type-check:full && npm run lint:full`
3. **Build Local**: `npm run build:full`  
4. **Docker Testing**: `npm run docker:up:build`
5. **Deploy**: Usar docker-compose en servidor

## 🚨 **Troubleshooting**

```bash
# Limpiar caché y reinstalar
rm -rf node_modules backend/node_modules
npm run install:all

# Limpiar Docker
docker-compose down --volumes --rmi all
npm run docker:up:build

# Verificar puertos
netstat -an | findstr :3000
netstat -an | findstr :5173
```

## 🎉 **¡Todo Listo!**

Tu setup permite:
- ✅ **Desarrollo local** con hot reload
- ✅ **TypeScript** compilado y validado  
- ✅ **Docker deploy** para producción
- ✅ **Scripts convenientes** para todo
- ✅ **Workflow híbrido** flexible