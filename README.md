# 🎓 AcaLud - Plataforma Educativa# 🎓 AcaLud - Plataforma Académica Lúdica



**AcaLud** es una plataforma educativa completa que combina gestión de aulas, actividades interactivas, juegos educativos y gamificación para crear una experiencia de aprendizaje moderna y atractiva.![AcaLud Logo](https://via.placeholder.com/800x200/6366f1/ffffff?text=AcaLud+-+Plataforma+Académica+Lúdica)



## 🚀 Inicio Rápido (Solo 3 pasos)## 📋 Descripción



### PrerrequisitosAcaLud es una plataforma académica lúdica innovadora que conecta docentes, estudiantes y familias para mejorar el aprendizaje extraescolar mediante actividades gamificadas. La plataforma combina educación y entretenimiento para crear experiencias de aprendizaje atractivas y efectivas.

- **Docker** y **Docker Compose** instalados en tu sistema

- **Node.js** (versión 18 o superior)## 🏗️ Arquitectura

- **Git** para clonar el repositorio

### Frontend (React + TypeScript)

### 1. Clonar el Proyecto- **Framework**: React 18 con TypeScript

```bash- **Build Tool**: Vite

git clone https://github.com/EXCOFFee/acalud.git- **Estilos**: Tailwind CSS

cd acalud- **Iconos**: Lucide React

```- **Patrones**: Context API, Hooks, Repository Pattern



### 2. Configurar Variables de Entorno### Backend (NestJS + TypeScript)

```bash- **Framework**: NestJS

# Copia el archivo de ejemplo (ya incluye configuración por defecto)- **Base de Datos**: PostgreSQL con TypeORM

cp .env.example .env- **Autenticación**: JWT + Passport

```- **Cache**: Redis

- **Documentación**: Swagger/OpenAPI

### 3. Iniciar Todo con un Solo Comando- **Patrones**: Repository, Singleton, Dependency Injection

```bash

# Para Windows PowerShell:### Infraestructura

.\start.ps1- **Contenedores**: Docker + Docker Compose

- **Reverse Proxy**: Nginx

# Para Linux/Mac:- **Monitoreo**: Health checks integrados

./start.sh- **Seguridad**: Rate limiting, CORS, Headers de seguridad

```

## 🎯 Funcionalidades Principales

¡Eso es todo! La aplicación estará disponible en:

- **Frontend**: http://localhost:5173### Para Docentes

- **Backend API**: http://localhost:3001- ✅ Dashboard con estadísticas de aulas y actividades

- **Documentación API**: http://localhost:3001/api/docs- ✅ Gestión de aulas virtuales

- ✅ Creación de actividades lúdicas (Quiz, Juegos, Memoria)

## 👥 Cuentas de Demo- ✅ Repositorio de actividades compartidas

- ✅ Sistema de invitación por códigos

Una vez que la aplicación esté funcionando, puedes usar estas cuentas para probar:- ✅ Seguimiento del progreso de estudiantes



### Estudiante Demo### Para Estudiantes

- **Email**: `student@demo.com`- ✅ Dashboard gamificado con progreso

- **Contraseña**: `password123`- ✅ Sistema de niveles y experiencia (XP)

- ✅ Monedas virtuales y recompensas

### Profesor Demo- ✅ Acceso a aulas y actividades

- **Email**: `teacher@demo.com`- ✅ Sistema de logros y estadísticas

- **Contraseña**: `password123`- ✅ Tienda virtual para personalización



## 🏗️ Arquitectura del Proyecto### Sistema de Gamificación

- 🏆 Niveles basados en experiencia

### Backend (NestJS)- 💰 Monedas virtuales por completar actividades

- **Framework**: NestJS con TypeScript- 🎖️ Sistema de logros y recompensas

- **Base de Datos**: PostgreSQL- 🛍️ Tienda virtual para personalización

- **Cache**: Redis- 📊 Estadísticas detalladas de progreso

- **Autenticación**: JWT

- **Documentación**: Swagger/OpenAPI## 🚀 Instalación y Deploy



### Frontend (React)### Prerrequisitos

- **Framework**: React 18 con TypeScript- Node.js 18+

- **Build Tool**: Vite- Docker y Docker Compose

- **Estilos**: Tailwind CSS- Git

- **Estado**: Context API

### Desarrollo Local

### Infraestructura

- **Contenedores**: Docker & Docker Compose#### 1. Clonar el Repositorio

- **Proxy**: Nginx (para producción)```bash

- **Base de Datos**: PostgreSQL 15git clone https://github.com/tu-usuario/acalud.git

- **Cache**: Redis 7cd acalud

```

## 📁 Estructura del Proyecto

#### 2. Instalación Automática (Recomendado)

```

acalud/Para Windows:

├── backend/                 # API Backend (NestJS)```powershell

│   ├── src/# Ejecutar script de instalación

│   │   ├── modules/        # Módulos de funcionalidad.\scripts\install-improvements.ps1

│   │   │   ├── auth/       # Autenticación```

│   │   │   ├── users/      # Gestión de usuarios

│   │   │   ├── classrooms/ # Aulas virtualesPara Linux/macOS:

│   │   │   ├── activities/ # Actividades```bash

│   │   │   ├── games/      # Juegos educativos# Hacer ejecutable y ejecutar script de instalación

│   │   │   └── gamification/ # Sistema de puntoschmod +x scripts/install-improvements.sh

│   │   └── database/       # Configuración DB./scripts/install-improvements.sh

│   └── Dockerfile```

├── src/                    # Frontend (React)

│   ├── components/         # Componentes React#### 3. Configurar Variables de Entorno

│   ├── services/          # Servicios API```bash

│   ├── contexts/          # Context API# Backend

│   └── types/             # Tipos TypeScriptcp backend/.env.example backend/.env

├── nginx/                 # Configuración Nginx# Editar backend/.env con tus configuraciones

├── docker-compose.yml     # Orquestación Docker

└── scripts/              # Scripts de utilidad# Frontend (opcional)

```cp .env.example .env

# Editar .env si necesitas configuraciones específicas

## 🎮 Funcionalidades Principales```



### Para Profesores#### 4. Desarrollo con Docker (Recomendado)

- ✅ Crear y gestionar aulas virtuales```bash

- ✅ Diseñar actividades interactivas# Levantar todos los servicios

- ✅ Configurar juegos educativos (Crucigrama, Simulación)docker-compose up -d

- ✅ Sistema de gamificación con puntos y logros

- ✅ Monitoreo del progreso estudiantil# Ver logs

docker-compose logs -f

### Para Estudiantes

- ✅ Unirse a aulas con códigos de acceso# Detener servicios

- ✅ Participar en actividadesdocker-compose down

- ✅ Jugar juegos educativos```

- ✅ Ganar puntos y desbloquear logros

- ✅ Dashboard personalizado#### 5. Desarrollo Manual



### Juegos Incluidos##### Backend

- 🧩 **Crucigrama**: Juego de palabras educativo```bash

- 🎯 **Simulación**: Escenarios interactivos de aprendizajecd backend

npm install

## 🛠️ Comandos de Desarrollonpm run start:dev

```

### Inicio Rápido

```bash##### Frontend

# Iniciar todo el stack```bash

docker-compose up -dnpm install

npm run dev

# Ver logs en tiempo real```

docker-compose logs -f

### Producción

# Detener todo

docker-compose down#### Deploy con Docker Compose

``````bash

# Configurar variables de entorno para producción

### Desarrollo Frontendcp .env.example .env

```bash# Editar .env con valores de producción

# Instalar dependencias

npm install# Deploy

docker-compose -f docker-compose.yml up -d

# Modo desarrollo con hot reload

npm run dev# Verificar estado

docker-compose ps

# Build para producción```

npm run build

```#### Deploy en Servicios Cloud



### Desarrollo Backend##### AWS (ECS + RDS + ElastiCache)

```bash1. Crear RDS PostgreSQL instance

cd backend2. Crear ElastiCache Redis cluster

3. Configurar ECS con las imágenes Docker

# Instalar dependencias4. Configurar ALB para load balancing

npm install5. Configurar Route 53 para DNS



# Modo desarrollo##### DigitalOcean (App Platform)

npm run start:dev1. Conectar repositorio de GitHub

2. Configurar build commands:

# Build para producción   ```yaml

npm run build   name: acalud

```   services:

   - name: frontend

## 🔧 Configuración Avanzada     source_dir: /

     build_command: npm run build

### Variables de Entorno Importantes     run_command: serve -s dist

   - name: backend

```env     source_dir: /backend

# Base de Datos     build_command: npm run build

POSTGRES_DB=acalud     run_command: npm run start:prod

POSTGRES_USER=acalud_user   databases:

POSTGRES_PASSWORD=acalud_password   - name: acalud-postgres

     engine: PG

# JWT     version: "15"

JWT_SECRET=tu_secreto_super_seguro_aqui   ```

JWT_EXPIRES_IN=24h

##### Vercel (Frontend) + Railway (Backend)

# URLs1. **Frontend en Vercel**:

FRONTEND_URL=http://localhost:5173   ```bash

BACKEND_URL=http://localhost:3001   vercel --prod

   ```

# Redis

REDIS_HOST=redis2. **Backend en Railway**:

REDIS_PORT=6379   - Conectar repositorio

```   - Configurar variables de entorno

   - Deploy automático

### Puertos Utilizados

- **5173**: Frontend (Vite)### Variables de Entorno de Producción

- **3001**: Backend API

- **5432**: PostgreSQL#### Backend (.env)

- **6379**: Redis```env

NODE_ENV=production

## 🧪 TestingPORT=3000

DB_HOST=your-db-host

```bashDB_PORT=5432

# Frontend testsDB_USERNAME=your-db-user

npm run testDB_PASSWORD=your-secure-password

DB_NAME=acalud_production

# Backend testsREDIS_HOST=your-redis-host

cd backend && npm run testREDIS_PORT=6379

JWT_SECRET=your-super-secure-jwt-secret-256-bits

# E2E testsFRONTEND_URL=https://your-domain.com

npm run test:e2e```

```

#### Frontend (.env)

## 📦 Despliegue en Producción```env

VITE_API_URL=https://api.your-domain.com/api/v1

### Docker Compose (Recomendado)VITE_APP_NAME=AcaLud

```bash```

# Build y deploy

docker-compose -f docker-compose.prod.yml up -d## 📚 API Documentation



# Con SSL y dominio personalizadoUna vez levantado el backend, la documentación de la API estará disponible en:

docker-compose -f docker-compose.prod.yml -f docker-compose.ssl.yml up -d- **Desarrollo**: http://localhost:3001/api/docs

```- **Producción**: https://api.your-domain.com/api/docs



### Variables para Producción### Endpoints Principales

```env

NODE_ENV=production#### Autenticación

JWT_SECRET=un_secreto_muy_seguro_para_produccion- `POST /api/v1/auth/register` - Registrar usuario

FRONTEND_URL=https://tu-dominio.com- `POST /api/v1/auth/login` - Iniciar sesión

BACKEND_URL=https://api.tu-dominio.com- `GET /api/v1/auth/profile` - Obtener perfil

```

#### Usuarios

## 🤝 Contribuir- `GET /api/v1/users/:id` - Obtener usuario

- `PATCH /api/v1/users/:id` - Actualizar usuario

1. Fork el proyecto- `GET /api/v1/users/:id/stats` - Estadísticas del usuario

2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)

3. Commit tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)#### Aulas

4. Push a la rama (`git push origin feature/nueva-funcionalidad`)- `GET /api/v1/classrooms` - Listar aulas

5. Crea un Pull Request- `POST /api/v1/classrooms` - Crear aula

- `POST /api/v1/classrooms/:id/join` - Unirse a aula

## 📋 Solución de Problemas

#### Actividades

### Problema: "Cannot connect to database"- `GET /api/v1/activities` - Listar actividades

```bash- `POST /api/v1/activities` - Crear actividad

# Verificar que PostgreSQL esté corriendo- `POST /api/v1/activities/:id/complete` - Completar actividad

docker-compose ps

## 📖 Documentación Adicional

# Reiniciar servicios

docker-compose restart postgres backendPara información detallada sobre el proyecto:

```

- **[📋 Mejoras Implementadas](docs/MEJORAS_IMPLEMENTADAS.md)** - Detalles técnicos de las mejoras implementadas

### Problema: "CORS Error"- **[🚀 Deploy y Producción](docs/DEPLOY.md)** - Guía completa de deployment

- Verificar que `FRONTEND_URL` en `.env` sea correcto- **[📝 Instrucciones GitHub](docs/INSTRUCCIONES_GITHUB.md)** - Configuración del repositorio

- Asegurarse de que ambos servicios estén corriendo- **[📊 Resumen de Implementación](docs/RESUMEN_FINAL_IMPLEMENTACION.md)** - Resumen ejecutivo del proyecto



### Problema: "Port already in use"## 🧪 Testing

```bash

# Encontrar y matar proceso en puerto 3001### Backend

netstat -ano | findstr :3001```bash

taskkill /PID <numero_pid> /Fcd backend

```npm run test

npm run test:e2e

### Limpiar Todo y Empezar de Nuevonpm run test:cov

```bash```

# Detener todo

docker-compose down### Frontend

```bash

# Eliminar volúmenes (¡Cuidado! Esto borra la DB)npm run test

docker-compose down -vnpm run test:coverage

```

# Limpiar imágenes

docker system prune -f## 📊 Monitoreo



# Volver a iniciar### Health Checks

docker-compose up -d- **Frontend**: http://localhost:3000/health

```- **Backend**: http://localhost:3001/api/v1/health

- **Database**: Incluido en Docker health checks

## 📄 Licencia

### Logs

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.```bash

# Ver logs de todos los servicios

## 👥 Equipodocker-compose logs -f



Desarrollado con ❤️ para la educación digital.# Ver logs de un servicio específico

docker-compose logs -f backend

---```



## 🆘 ¿Necesitas Ayuda?## 🔒 Seguridad



Si tienes problemas:### Medidas Implementadas

1. Revisa la sección de **Solución de Problemas** arriba- ✅ Autenticación JWT

2. Verifica que Docker esté corriendo- ✅ Validación de entrada con class-validator

3. Asegúrate de que los puertos no estén ocupados- ✅ Rate limiting

4. Revisa los logs: `docker-compose logs -f`- ✅ CORS configurado

- ✅ Headers de seguridad

**¡Listo para empezar tu experiencia educativa con AcaLud!** 🎓- ✅ Sanitización de datos
- ✅ Encriptación de contraseñas

### Para Producción
- [ ] Certificados SSL/TLS
- [ ] WAF (Web Application Firewall)
- [ ] Backup automático de base de datos
- [ ] Monitoreo de seguridad
- [ ] Logs de auditoría

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

### Estándares de Código
- ESLint para linting
- Prettier para formateo
- Conventional Commits
- Tests requeridos para nuevas funcionalidades

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo

- **Desarrollador Principal**: Tu Nombre
- **UI/UX Designer**: Diseñador
- **Product Manager**: Manager

## 📞 Soporte

- **Email**: soporte@acalud.com
- **Documentación**: https://docs.acalud.com
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/acalud/issues)

## 🔮 Roadmap

### v1.1 (Próximo)
- [ ] Modo offline para actividades
- [ ] Notificaciones push
- [ ] Chat en tiempo real
- [ ] Integración con LMS existentes

### v1.2 (Futuro)
- [ ] Aplicación móvil nativa
- [ ] Analíticas avanzadas
- [ ] IA para recomendaciones
- [ ] Modo colaborativo en tiempo real

---

⭐ **¡Si te gusta este proyecto, dale una estrella!** ⭐
