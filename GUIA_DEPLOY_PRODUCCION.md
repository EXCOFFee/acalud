# 🚀 Guía Completa de Deploy a Producción - AcaLud

## 📋 Índice
1. [Preparación Previa](#preparación-previa)
2. [Variables de Entorno](#variables-de-entorno)
3. [Deploy en Diferentes Plataformas](#deploy-en-diferentes-plataformas)
4. [Configuración de Dominio](#configuración-de-dominio)
5. [Checklist Final](#checklist-final)

---

## ✅ Preparación Previa

### 🔍 Verificar que TODO funcione localmente

Antes de hacer deploy, asegúrate de que:
- ✅ Backend compila sin errores (`cd backend && npm run build`)
- ✅ Frontend compila sin errores (`npm run build`)
- ✅ Base de datos funciona correctamente
- ✅ Todas las funcionalidades están probadas
- ✅ No hay errores en la consola del navegador

---

## 🔐 Variables de Entorno

### 📁 Frontend - Crear archivo `.env.production`

Crea este archivo en la **raíz del proyecto** (donde está `package.json` del frontend):

```bash
# .env.production (FRONTEND)

# 🌐 URL del backend en producción
VITE_API_URL=https://tu-backend.com/api/v1

# Ejemplo si usas subdominios:
# VITE_API_URL=https://api.acalud.com/api/v1

# Ejemplo si usas el mismo dominio con /api:
# VITE_API_URL=https://acalud.com/api/v1
```

### 📁 Backend - Crear archivo `.env.production`

Crea este archivo en la carpeta `backend/`:

```bash
# .env.production (BACKEND)

# ============================================================================
# BASE DE DATOS
# ============================================================================
POSTGRES_DB=acalud_production
POSTGRES_USER=acalud_user_prod
POSTGRES_PASSWORD=TU_PASSWORD_SUPER_SEGURO_AQUI_12345!@#
POSTGRES_HOST=tu-host-postgres.com  # O IP del servidor
POSTGRES_PORT=5432

# ============================================================================
# AUTENTICACIÓN - ¡¡¡MUY IMPORTANTE!!!
# ============================================================================
# 🚨 CAMBIA ESTA CLAVE - Genera una nueva y única para producción
JWT_SECRET=tu_clave_super_secreta_unica_irrepetible_2024_$%#@!
JWT_EXPIRES_IN=24h

# ============================================================================
# REDIS (CACHE)
# ============================================================================
REDIS_HOST=tu-host-redis.com  # O IP del servidor
REDIS_PORT=6379

# ============================================================================
# URLs
# ============================================================================
FRONTEND_URL=https://tu-dominio.com
BACKEND_URL=https://tu-backend.com

# ============================================================================
# ENTORNO
# ============================================================================
NODE_ENV=production

# ============================================================================
# CONFIGURACIÓN DE SEGURIDAD
# ============================================================================
CORS_ORIGIN=https://tu-dominio.com

# ============================================================================
# CONFIGURACIÓN DE EMAIL (OPCIONAL)
# ============================================================================
# Si tienes recuperación de contraseña por email:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_password_de_aplicacion

# ============================================================================
# CONFIGURACIÓN DE ARCHIVOS
# ============================================================================
MAX_FILE_SIZE=10MB
UPLOAD_PATH=./uploads
```

---

## 🌍 Deploy en Diferentes Plataformas

### 🟦 Opción 1: Vercel (Frontend) + Railway (Backend + DB)

#### **Frontend en Vercel:**

1. **Instalar Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Iniciar sesión:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Configurar variables de entorno en Vercel:**
   - Ve a tu proyecto en vercel.com
   - Settings → Environment Variables
   - Agrega: `VITE_API_URL` = `https://tu-backend.railway.app/api/v1`

#### **Backend en Railway:**

1. **Crear cuenta en Railway.app**

2. **Crear nuevo proyecto:**
   - New Project → Deploy from GitHub repo
   - Selecciona tu repositorio

3. **Configurar variables de entorno:**
   - Settings → Variables
   - Copia todas las variables de `.env.production` del backend

4. **Railway automáticamente:**
   - ✅ Detecta que es NestJS
   - ✅ Ejecuta `npm run build`
   - ✅ Ejecuta `npm run start:prod`
   - ✅ Provee base de datos PostgreSQL
   - ✅ Provee Redis

---

### 🟩 Opción 2: Netlify (Frontend) + Render (Backend)

#### **Frontend en Netlify:**

1. **Build del frontend:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod
   ```

3. **O conectar con GitHub:**
   - Ve a netlify.com
   - New site from Git
   - Build command: `npm run build`
   - Publish directory: `dist`

#### **Backend en Render:**

1. **Crear cuenta en Render.com**

2. **New Web Service:**
   - Connect repository
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm run start:prod`

3. **Agregar PostgreSQL:**
   - New → PostgreSQL
   - Conectar con el Web Service

---

### 🐳 Opción 3: Docker + VPS (Control Total)

Si tienes un servidor VPS (DigitalOcean, AWS, Linode, etc.):

1. **Crear `docker-compose.production.yml`:**
   ```yaml
   version: '3.8'

   services:
     # Base de datos
     postgres:
       image: postgres:15
       environment:
         POSTGRES_DB: ${POSTGRES_DB}
         POSTGRES_USER: ${POSTGRES_USER}
         POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
       volumes:
         - postgres_data:/var/lib/postgresql/data
       restart: always

     # Redis
     redis:
       image: redis:7-alpine
       restart: always

     # Backend
     backend:
       build:
         context: ./backend
         dockerfile: Dockerfile
       environment:
         NODE_ENV: production
         POSTGRES_HOST: postgres
         REDIS_HOST: redis
       env_file:
         - ./backend/.env.production
       depends_on:
         - postgres
         - redis
       restart: always

     # Frontend
     frontend:
       build:
         context: .
         dockerfile: Dockerfile.frontend
         args:
           VITE_API_URL: ${VITE_API_URL}
       restart: always

     # Nginx (Proxy reverso)
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx/nginx.conf:/etc/nginx/nginx.conf
         - ./nginx/ssl:/etc/nginx/ssl  # Para certificados SSL
       depends_on:
         - frontend
         - backend
       restart: always

   volumes:
     postgres_data:
   ```

2. **Deploy en el servidor:**
   ```bash
   # Conectar al servidor
   ssh usuario@tu-servidor.com

   # Clonar el repositorio
   git clone https://github.com/tu-usuario/acalud.git
   cd acalud

   # Crear archivos .env
   nano .env.production
   nano backend/.env.production

   # Iniciar con Docker
   docker-compose -f docker-compose.production.yml up -d
   ```

---

## 🌐 Configuración de Dominio

### 📍 DNS Records necesarios:

Si tu dominio es `acalud.com`:

```
Type    Name        Value                       TTL
A       @           Tu_IP_del_servidor          3600
A       www         Tu_IP_del_servidor          3600
A       api         Tu_IP_del_servidor          3600
CNAME   www         acalud.com                  3600
```

### 🔒 Certificado SSL (HTTPS):

**Con Certbot (Gratuito):**
```bash
# En tu servidor VPS
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d acalud.com -d www.acalud.com -d api.acalud.com
```

**Con Cloudflare (Recomendado):**
1. Registra tu dominio en Cloudflare
2. Cambia los nameservers de tu dominio
3. Activa "Flexible SSL" o "Full SSL"
4. ✅ SSL automático y gratis

---

## ✅ Checklist Final de Deploy

### 🔐 Seguridad:
- [ ] JWT_SECRET es único y fuerte (mínimo 32 caracteres)
- [ ] Contraseñas de base de datos son seguras
- [ ] CORS configurado solo para tu dominio
- [ ] Variables de entorno NO están en el código
- [ ] `.env` está en `.gitignore`
- [ ] SSL/HTTPS activado

### 🌐 Backend:
- [ ] `NODE_ENV=production`
- [ ] Base de datos PostgreSQL funcionando
- [ ] Redis funcionando (si lo usas)
- [ ] Migraciones de DB ejecutadas
- [ ] Seeds iniciales cargados (si los necesitas)
- [ ] Logs de errores configurados
- [ ] Backup de base de datos programado

### 💻 Frontend:
- [ ] `VITE_API_URL` apunta al backend correcto
- [ ] Build exitoso (`npm run build`)
- [ ] No hay errores de consola
- [ ] localStorage funciona correctamente
- [ ] Rutas funcionan con refresh (configurar redirects)

### 🧪 Testing:
- [ ] Login funciona
- [ ] Registro funciona
- [ ] Persistencia de sesión funciona (reload mantiene sesión)
- [ ] Persistencia de navegación funciona (reload mantiene página)
- [ ] Crear/editar/eliminar aulas funciona
- [ ] Crear/editar/eliminar actividades funciona
- [ ] Sistema de gamificación funciona
- [ ] Subida de archivos funciona

### 📱 Responsive:
- [ ] Funciona en móvil
- [ ] Funciona en tablet
- [ ] Funciona en desktop

---

## 🆘 Problemas Comunes

### ❌ "Cannot connect to backend"
**Solución:** Verifica que `VITE_API_URL` en el frontend apunta a la URL correcta del backend.

### ❌ "401 Unauthorized" después de deploy
**Solución:** El JWT_SECRET del backend debe ser el mismo que usaste para generar los tokens.

### ❌ "CORS Error"
**Solución:** En el backend, configura CORS para permitir tu dominio frontend:
```typescript
// backend/src/main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true
});
```

### ❌ Refresh en rutas da 404
**Solución:** Configura redirects en tu hosting:

**Vercel** - Crear `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Netlify** - Crear `_redirects`:
```
/*    /index.html   200
```

---

## 🎯 Resumen Rápido

### **Lo que SÍ funciona en producción:**
✅ localStorage (sesión y navegación)
✅ Todas las funcionalidades del sistema
✅ Persistencia de datos
✅ Autenticación JWT

### **Lo que debes cambiar:**
🔧 `VITE_API_URL` → URL real del backend
🔧 `JWT_SECRET` → Clave única y segura
🔧 Contraseñas de DB → Seguras
🔧 CORS → Solo tu dominio

### **Comandos rápidos:**
```bash
# Frontend
npm run build

# Backend
cd backend
npm run build
npm run start:prod

# Con Docker
docker-compose -f docker-compose.production.yml up -d
```

---

## 📞 Soporte

Si tienes problemas con el deploy:
1. Revisa los logs del backend: `docker logs backend` o en tu plataforma
2. Revisa la consola del navegador (F12)
3. Verifica las variables de entorno
4. Comprueba que el backend esté accesible: `curl https://tu-backend.com/api/v1/health`

---

**¡Listo para producción! 🚀**
