# 📋 Instrucciones para GitHub - AcaLud

## 🚀 Para el Desarrollador (Subir el Proyecto)

### 1. Crear Repositorio en GitHub
1. Ve a [GitHub](https://github.com) e inicia sesión
2. Haz clic en "New repository" (botón verde)
3. Nombre del repositorio: `acalud`
4. Descripción: `🎓 AcaLud - Plataforma Educativa con Docker`
5. Selecciona **Público** (para que otros puedan verlo)
6. **NO** marques "Add a README file" (ya tenemos uno)
7. Haz clic en "Create repository"

### 2. Subir el Código
En tu terminal, desde la carpeta del proyecto:

```bash
# Inicializar git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Hacer el primer commit
git commit -m "🎉 Initial commit: AcaLud - Plataforma Educativa completa

✅ Frontend React + TypeScript + Vite
✅ Backend NestJS + PostgreSQL + Redis  
✅ Docker Compose para desarrollo
✅ Sistema de autenticación JWT
✅ Módulos: usuarios, aulas, actividades, juegos, gamificación
✅ Scripts de inicio automatizados
✅ Documentación completa"

# Agregar el repositorio remoto
git remote add origin https://github.com/EXCOFFee/acalud.git

# Subir el código
git push -u origin main
```

### 3. Configurar el Repositorio
1. Ve a tu repositorio en GitHub
2. En la sección "About" (lado derecho), agrega:
   - **Description**: `🎓 Plataforma educativa completa con React, NestJS y Docker`
   - **Website**: Tu demo URL (si tienes una)
   - **Topics**: `education`, `react`, `nestjs`, `typescript`, `docker`, `postgresql`, `gamification`

---

## 👥 Para los Probadores (Usar el Proyecto)

### Opción 1: Descarga Directa (Más Fácil)
1. Ve al repositorio: `https://github.com/EXCOFFee/acalud`
2. Haz clic en el botón verde **"Code"**
3. Selecciona **"Download ZIP"**
4. Extrae el archivo ZIP en tu computadora
5. Abre una terminal en la carpeta extraída
6. Sigue las instrucciones del **README.md**

### Opción 2: Clonar con Git (Recomendado)
```bash
# Clonar el repositorio
git clone https://github.com/EXCOFFee/acalud.git

# Entrar a la carpeta del proyecto
cd acalud

# Para Windows: ejecutar script de inicio
.\start.ps1

# Para Linux/Mac: ejecutar script de inicio
./start.sh
```

### ✅ Verificación Rápida
Después de ejecutar el script, deberías ver:
- ✅ **Frontend**: http://localhost:5173
- ✅ **Backend**: http://localhost:3001
- ✅ **API Docs**: http://localhost:3001/api/docs

### 👤 Cuentas de Prueba
- **Estudiante**: `student@demo.com` / `password123`
- **Profesor**: `teacher@demo.com` / `password123`

---

## 🛠️ Requisitos del Sistema

### Obligatorios
- **Docker Desktop** - [Descargar aquí](https://www.docker.com/products/docker-desktop)
- **Node.js 18+** - [Descargar aquí](https://nodejs.org/)
- **Git** - [Descargar aquí](https://git-scm.com/)

### Verificar Instalación
```bash
# Verificar Docker
docker --version

# Verificar Node.js
node --version

# Verificar Git
git --version
```

---

## 🆘 Solución de Problemas para Probadores

### Problema: "Docker no está corriendo"
**Solución**: 
- Windows/Mac: Abre Docker Desktop
- Linux: `sudo systemctl start docker`

### Problema: "Puerto ocupado"
**Solución**:
```bash
# Detener servicios existentes
docker-compose down

# Si sigue ocupado, matar procesos:
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F

# Linux/Mac:
lsof -ti:5173 | xargs kill -9
```

### Problema: "No puedo acceder a localhost:5173"
**Solución**:
1. Espera 1-2 minutos más (el frontend tarda en iniciarse)
2. Verifica que el script terminó sin errores
3. Ejecuta: `docker-compose logs -f` para ver logs

### Problema: "Error de login"
**Solución**:
1. Verifica que el backend responda: http://localhost:3001/api/v1/monitoring/health
2. Usa las credenciales exactas: `student@demo.com` / `password123`
3. Si persiste, reinicia: `docker-compose restart backend`

---

## 📞 Contacto y Soporte

Si encuentras problemas:

1. **Revisa la documentación**: El `README.md` tiene soluciones comunes
2. **Verifica requisitos**: Docker, Node.js y Git instalados
3. **Abre un Issue**: En el repositorio de GitHub
4. **Incluye información**:
   - Sistema operativo
   - Versiones de Docker y Node.js
   - Logs de error completos
   - Pasos que seguiste

---

## 🌟 ¿Te Gustó el Proyecto?

Si AcaLud te resultó útil:
- ⭐ **Dale una estrella** al repositorio
- 🍴 **Haz un fork** para tus propias modificaciones  
- 📤 **Compártelo** con otros educadores
- 💡 **Sugiere mejoras** en los Issues

¡Gracias por probar AcaLud! 🎓