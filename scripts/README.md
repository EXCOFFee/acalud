# 🔧 Scripts de Instalación AcaLud

Este directorio contiene los scripts automáticos para instalar y configurar el proyecto AcaLud con todas las mejoras implementadas.

## 📋 Scripts Disponibles

### Windows
- **`install-improvements.ps1`** - Script de instalación para PowerShell (Windows)

### Linux/macOS  
- **`install-improvements.sh`** - Script de instalación para Bash (Linux/macOS)

## 🚀 Uso

### Para Windows (PowerShell)
```powershell
# Navegar al directorio del proyecto
cd acalud

# Ejecutar script de instalación
.\scripts\install-improvements.ps1
```

### Para Linux/macOS (Bash)
```bash
# Navegar al directorio del proyecto
cd acalud

# Hacer ejecutable el script
chmod +x scripts/install-improvements.sh

# Ejecutar script de instalación
./scripts/install-improvements.sh
```

## ⚡ Qué hacen estos scripts

Los scripts de instalación automatizan completamente la configuración del proyecto:

### 🔍 Verificación de Prerrequisitos
- ✅ Node.js 18+ instalado
- ✅ npm disponible
- ✅ Git configurado
- ⚠️ Verificación opcional de Docker

### 📦 Instalación de Dependencias
- 📱 Frontend: React, TypeScript, Vite, Tailwind CSS, etc.
- 🔧 Backend: NestJS, TypeScript, PostgreSQL, Redis, etc.
- 🧪 Testing: Jest, React Testing Library
- 🎯 Todas las mejoras implementadas

### ⚙️ Configuración Automática
- 📄 Creación de archivos `.env` desde templates
- 🔧 Configuración de Jest para testing
- 🌐 Setup de React Router v6
- 📊 Configuración de monitoreo y logging
- 🐳 Configuración de Docker (si está disponible)

### 🧪 Validación
- ✅ Ejecución automática de tests
- ✅ Verificación de build del frontend
- ✅ Validación de conexiones de base de datos
- ✅ Verificación de endpoints del backend

## 📊 Salida del Script

Durante la ejecución verás:

```
🎯 Instalando AcaLud con mejoras de alta prioridad...

✅ Verificación de prerrequisitos
✅ Instalación de dependencias del frontend  
✅ Instalación de dependencias del backend
✅ Configuración de variables de entorno
✅ Setup de testing con Jest
✅ Configuración de React Router v6
✅ Setup de monitoreo y logging
✅ Validación de configuraciones

🎉 ¡Instalación completada!

📋 URLs de desarrollo:
   Frontend:  http://localhost:5173
   Backend:   http://localhost:3001
   API Docs:  http://localhost:3001/api/docs

📝 Próximos pasos:
   pnpm run dev          # Iniciar en modo desarrollo
   pnpm test             # Ejecutar tests
   docker-compose up -d # Iniciar con Docker
```

## 🔧 Requisitos

### Obligatorios
- **Node.js 18+** - Runtime de JavaScript
- **pnpm** - Gestor de paquetes (instalar: `corepack enable && corepack prepare pnpm@latest --activate`)
- **Git** - Control de versiones

### Opcionales
- **Docker** - Para containerización
- **Docker Compose** - Para orquestación de servicios
- **PostgreSQL** - Base de datos (o usar Docker)
- **Redis** - Cache (o usar Docker)

## 🐛 Solución de Problemas

### Error: "Node.js no encontrado"
```bash
# Instalar Node.js desde https://nodejs.org/
# Verificar instalación
node --version
npm --version
```

### Error: "Permisos en PowerShell"
```powershell
# Habilitar ejecución de scripts
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Error: "Script no ejecutable" (Linux/macOS)
```bash
# Dar permisos de ejecución
chmod +x scripts/install-improvements.sh
```

### Error: "Puerto en uso"
```bash
# Verificar procesos usando los puertos
netstat -tulpn | grep :3001  # Backend
netstat -tulpn | grep :5173  # Frontend

# Terminar procesos si es necesario
kill -9 <PID>
```

## 📈 Después de la Instalación

Una vez completada la instalación:

1. **Iniciar desarrollo**:
   ```bash
   pnpm run dev
   ```

2. **Ejecutar tests**:
   ```bash
   pnpm test
   ```

3. **Acceder a la aplicación**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Documentación API: http://localhost:3001/api/docs

4. **Revisar documentación**:
   - [Mejoras implementadas](../docs/MEJORAS_IMPLEMENTADAS.md)
   - [Guía de deployment](../docs/DEPLOY.md)

---

**Nota**: Estos scripts instalan automáticamente todas las mejoras de alta prioridad: testing completo, React Router v6, lazy loading, y sistema de monitoreo.
