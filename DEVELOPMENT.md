# 噫 AcaLud - Guﾃｭa de Desarrollo y Deploy

## 搭 **Requisitos Previos**
- Node.js 18+ 
- pnpm 9+ (recomendado: `corepack enable && corepack prepare pnpm@latest --activate`)
- Docker & Docker Compose (para deploy)
- PostgreSQL (para desarrollo local opcional)

## 肌 **Desarrollo Local**

### **Opciﾃｳn 1: Script Automﾃ｡tico (Recomendado)**
```bash
# Windows
./dev-start.bat

# Linux/Mac  
chmod +x dev-start.sh
./dev-start.sh
```

### **Opciﾃｳn 2: Comandos Manuales**
```bash
# Instalar todas las dependencias (usa workspace de pnpm)
pnpm install

# Ejecutar frontend y backend juntos
ppnpm run dev:full

# O ejecutar por separado:
pnpm run dev          # Solo frontend (puerto 5173)
pnpm run dev:backend  # Solo backend (puerto 3000)
```

### **URLs de Desarrollo:**
- 導 **Frontend**: http://localhost:5173
- 肌 **Backend**: http://localhost:3000  
- 答 **API Docs**: http://localhost:3000/api
- 投 **Swagger**: http://localhost:3000/api

## 女・・**Build y Testing**

```bash
# Compilar todo
ppnpm run build:full

# Verificar tipos TypeScript
ppnpm run type-check:full

# Linting completo
ppnpm run lint:full

# Tests
pnpm test                          # Frontend tests
pnpm --filter acalud-backend test  # Backend tests
```

## 正 **Deploy con Docker**

### **Desarrollo/Testing con Docker:**
```bash
# Build y ejecutar todos los servicios
ppnpm run docker:up:build

# Solo ejecutar (si ya estﾃ｡ buildeado)
pnpm run docker:up

# Detener servicios
pnpm run docker:down
```

### **Producciﾃｳn:**
```bash
# Build para producciﾃｳn
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build

# Con variables de entorno
docker-compose --env-file .env.prod up --build
```

## 倹 **URLs de Docker Deploy:**
- 導 **Frontend**: http://localhost:80
- 肌 **Backend**: http://localhost:3000
- 淀・・**PostgreSQL**: localhost:5432
- 噫 **Redis**: localhost:6379

## 刀 **Estructura del Workflow**

```
逃 acalud/
笏懌楳笏 識 dev-start.bat/sh     # Scripts de desarrollo rﾃ｡pido
笏懌楳笏 逃 package.json         # Scripts centralizados
笏懌楳笏 逃 pnpm-workspace.yaml  # Configuraciﾃｳn de workspace pnpm
笏懌楳笏 正 docker-compose.yml   # Orquestaciﾃｳn de servicios
笏懌楳笏 肌 backend/             # API NestJS + TypeScript
笏・  笏懌楳笏 逃 package.json     # Dependencias backend
笏・  笏懌楳笏 正 Dockerfile       # Imagen del backend
笏・  笏披楳笏 肌 src/             # Cﾃｳdigo fuente
笏披楳笏 耳 src/                 # Frontend React + TypeScript
    笏懌楳笏 耳 components/      # Componentes React
    笏披楳笏 肌 services/        # Servicios API
```

## 櫨 **Comandos ﾃ嗾iles**

```bash
# Desarrollo
ppnpm run dev:full              # Todo junto con hot reload
ppnpm run type-check:full       # Verificar TypeScript completo
ppnpm run lint:full             # Linting completo

# Docker  
ppnpm run docker:up:build       # Build + ejecutar servicios
pnpm run docker:down           # Detener todo

# Utilidades
pnpm install                   # Instalar dependencias completas (workspace)
ppnpm run build:full            # Build de producciﾃｳn completo

# Filtros de workspace (ejecutar en paquete especﾃｭfico)
pnpm --filter acalud-backend run start:dev
pnpm --filter acalud-frontend run dev
```

## 識 **Flujo de Trabajo Recomendado**

1. **Desarrollo**: `pnpm run dev:full` o `./dev-start.bat`
2. **Testing**: `pnpm run type-check:full && pnpm run lint:full`
3. **Build Local**: `pnpm run build:full`  
4. **Docker Testing**: `pnpm run docker:up:build`
5. **Deploy**: Usar docker-compose en servidor

## 圷 **Troubleshooting**

```bash
# Limpiar cachﾃｩ y reinstalar
rm -rf node_modules backend/node_modules
pnpm install

# Limpiar Docker
docker-compose down --volumes --rmi all
pnpm run docker:up:build

# Verificar puertos
netstat -an | findstr :3000
netstat -an | findstr :5173
```

## 脂 **ﾂ｡Todo Listo!**

Tu setup permite:
- 笨・**Desarrollo local** con hot reload
- 笨・**TypeScript** compilado y validado  
- 笨・**Docker deploy** para producciﾃｳn
- 笨・**Scripts convenientes** para todo
- 笨・**Workflow hﾃｭbrido** flexible
