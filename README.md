# 🎓 AcaLud - Plataforma Académica Lúdica

![AcaLud Logo](https://via.placeholder.com/800x200/6366f1/ffffff?text=AcaLud+-+Plataforma+Académica+Lúdica)

## 📋 Descripción

AcaLud es una plataforma académica lúdica innovadora que conecta docentes, estudiantes y familias para mejorar el aprendizaje extraescolar mediante actividades gamificadas. La plataforma combina educación y entretenimiento para crear experiencias de aprendizaje atractivas y efectivas.

## 🏗️ Arquitectura

### Frontend (React + TypeScript)
- **Framework**: React 18 con TypeScript
- **Build Tool**: Vite
- **Estilos**: Tailwind CSS
- **Iconos**: Lucide React
- **Patrones**: Context API, Hooks, Repository Pattern

### Backend (NestJS + TypeScript)
- **Framework**: NestJS
- **Base de Datos**: PostgreSQL con TypeORM
- **Autenticación**: JWT + Passport
- **Cache**: Redis
- **Documentación**: Swagger/OpenAPI
- **Patrones**: Repository, Singleton, Dependency Injection

### Infraestructura
- **Contenedores**: Docker + Docker Compose
- **Reverse Proxy**: Nginx
- **Monitoreo**: Health checks integrados
- **Seguridad**: Rate limiting, CORS, Headers de seguridad

## 🎯 Funcionalidades Principales

### Para Docentes
- ✅ Dashboard con estadísticas de aulas y actividades
- ✅ Gestión de aulas virtuales
- ✅ Creación de actividades lúdicas (Quiz, Juegos, Memoria)
- ✅ Repositorio de actividades compartidas
- ✅ Sistema de invitación por códigos
- ✅ Seguimiento del progreso de estudiantes

### Para Estudiantes
- ✅ Dashboard gamificado con progreso
- ✅ Sistema de niveles y experiencia (XP)
- ✅ Monedas virtuales y recompensas
- ✅ Acceso a aulas y actividades
- ✅ Sistema de logros y estadísticas
- ✅ Tienda virtual para personalización

### Sistema de Gamificación
- 🏆 Niveles basados en experiencia
- 💰 Monedas virtuales por completar actividades
- 🎖️ Sistema de logros y recompensas
- 🛍️ Tienda virtual para personalización
- 📊 Estadísticas detalladas de progreso

## 🚀 Instalación y Deploy

### Prerrequisitos
- Node.js 18+
- Docker y Docker Compose
- Git

### Desarrollo Local

#### 1. Clonar el Repositorio
```bash
git clone https://github.com/tu-usuario/acalud.git
cd acalud
```

#### 2. Configurar Variables de Entorno
```bash
# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus configuraciones

# Frontend (opcional)
cp .env.example .env
# Editar .env si necesitas configuraciones específicas
```

#### 3. Desarrollo con Docker (Recomendado)
```bash
# Levantar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down
```

#### 4. Desarrollo Manual

##### Backend
```bash
cd backend
npm install
npm run start:dev
```

##### Frontend
```bash
npm install
npm run dev
```

### Producción

#### Deploy con Docker Compose
```bash
# Configurar variables de entorno para producción
cp .env.example .env
# Editar .env con valores de producción

# Deploy
docker-compose -f docker-compose.yml up -d

# Verificar estado
docker-compose ps
```

#### Deploy en Servicios Cloud

##### AWS (ECS + RDS + ElastiCache)
1. Crear RDS PostgreSQL instance
2. Crear ElastiCache Redis cluster
3. Configurar ECS con las imágenes Docker
4. Configurar ALB para load balancing
5. Configurar Route 53 para DNS

##### DigitalOcean (App Platform)
1. Conectar repositorio de GitHub
2. Configurar build commands:
   ```yaml
   name: acalud
   services:
   - name: frontend
     source_dir: /
     build_command: npm run build
     run_command: serve -s dist
   - name: backend
     source_dir: /backend
     build_command: npm run build
     run_command: npm run start:prod
   databases:
   - name: acalud-postgres
     engine: PG
     version: "15"
   ```

##### Vercel (Frontend) + Railway (Backend)
1. **Frontend en Vercel**:
   ```bash
   vercel --prod
   ```

2. **Backend en Railway**:
   - Conectar repositorio
   - Configurar variables de entorno
   - Deploy automático

### Variables de Entorno de Producción

#### Backend (.env)
```env
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_PORT=5432
DB_USERNAME=your-db-user
DB_PASSWORD=your-secure-password
DB_NAME=acalud_production
REDIS_HOST=your-redis-host
REDIS_PORT=6379
JWT_SECRET=your-super-secure-jwt-secret-256-bits
FRONTEND_URL=https://your-domain.com
```

#### Frontend (.env)
```env
VITE_API_URL=https://api.your-domain.com/api/v1
VITE_APP_NAME=AcaLud
```

## 📚 API Documentation

Una vez levantado el backend, la documentación de la API estará disponible en:
- **Desarrollo**: http://localhost:3001/api/docs
- **Producción**: https://api.your-domain.com/api/docs

### Endpoints Principales

#### Autenticación
- `POST /api/v1/auth/register` - Registrar usuario
- `POST /api/v1/auth/login` - Iniciar sesión
- `GET /api/v1/auth/profile` - Obtener perfil

#### Usuarios
- `GET /api/v1/users/:id` - Obtener usuario
- `PATCH /api/v1/users/:id` - Actualizar usuario
- `GET /api/v1/users/:id/stats` - Estadísticas del usuario

#### Aulas
- `GET /api/v1/classrooms` - Listar aulas
- `POST /api/v1/classrooms` - Crear aula
- `POST /api/v1/classrooms/:id/join` - Unirse a aula

#### Actividades
- `GET /api/v1/activities` - Listar actividades
- `POST /api/v1/activities` - Crear actividad
- `POST /api/v1/activities/:id/complete` - Completar actividad

## 🧪 Testing

### Backend
```bash
cd backend
npm run test
npm run test:e2e
npm run test:cov
```

### Frontend
```bash
npm run test
npm run test:coverage
```

## 📊 Monitoreo

### Health Checks
- **Frontend**: http://localhost:3000/health
- **Backend**: http://localhost:3001/api/v1/health
- **Database**: Incluido en Docker health checks

### Logs
```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f backend
```

## 🔒 Seguridad

### Medidas Implementadas
- ✅ Autenticación JWT
- ✅ Validación de entrada con class-validator
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ Headers de seguridad
- ✅ Sanitización de datos
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
