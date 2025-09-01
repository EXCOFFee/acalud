# AcaLud - Plataforma Educativa Gamificada

## 📋 Descripción del Proyecto

AcaLud es una plataforma educativa innovadora que combina metodologías de enseñanza tradicionales con elementos de gamificación para crear una experiencia de aprendizaje atractiva y efectiva. La plataforma permite a los docentes crear aulas virtuales, diseñar actividades interactivas y hacer seguimiento del progreso de sus estudiantes.

### 🌟 Características Principales

- **Sistema de Aulas Virtuales**: Creación y gestión de espacios de aprendizaje digitales
- **Actividades Interactivas**: Quiz, juegos, ejercicios drag-and-drop, y más
- **Gamificación Completa**: Sistema de niveles, experiencia, monedas y logros
- **Gestión de Usuarios**: Roles diferenciados para estudiantes, docentes y administradores
- **Sistema de Archivos**: Subida y gestión de recursos educativos
- **Análisis y Estadísticas**: Seguimiento detallado del progreso y rendimiento

## 🏗️ Arquitectura del Sistema

### Frontend (React + TypeScript)
```
src/
├── components/           # Componentes React reutilizables
│   ├── Auth/            # Autenticación (Login, Register)
│   ├── Dashboard/       # Dashboards por rol
│   └── Layout/          # Componentes de diseño
├── contexts/            # Context API para estado global
├── services/            # Servicios HTTP y lógica de negocio
└── types/              # Definiciones de tipos TypeScript
```

### Backend (NestJS + TypeScript)
```
backend/src/
├── modules/            # Módulos funcionales
│   ├── auth/          # Autenticación y autorización
│   ├── users/         # Gestión de usuarios
│   ├── classrooms/    # Aulas virtuales
│   ├── activities/    # Actividades educativas
│   ├── gamification/  # Sistema de logros y recompensas
│   └── files/         # Gestión de archivos
├── config/            # Configuraciones del sistema
└── database/          # Migraciones y scripts de BD
```

## 🗄️ Base de Datos

### Modelo de Datos Principal

#### Usuarios (users)
- **id**: UUID único del usuario
- **email**: Email único para autenticación
- **firstName**: Nombre del usuario
- **lastName**: Apellido del usuario
- **password**: Contraseña hasheada con bcrypt
- **role**: Rol del usuario (student, teacher, admin)
- **level**: Nivel actual en el sistema de gamificación
- **experience**: Puntos de experiencia acumulados
- **coins**: Monedas virtuales del usuario
- **avatar**: URL del avatar personalizado
- **isActive**: Estado activo del usuario

#### Aulas (classrooms)
- **id**: UUID único del aula
- **name**: Nombre descriptivo del aula
- **description**: Descripción detallada del curso
- **subject**: Materia o asignatura
- **grade**: Grado o nivel educativo
- **inviteCode**: Código único para unirse al aula
- **teacherId**: ID del docente propietario
- **color**: Color de identificación visual
- **settings**: Configuraciones específicas (JSON)

#### Actividades (activities)
- **id**: UUID único de la actividad
- **title**: Título de la actividad
- **description**: Descripción detallada
- **type**: Tipo de actividad (quiz, game, interactive, etc.)
- **difficulty**: Nivel de dificultad (easy, medium, hard, expert)
- **content**: Contenido de la actividad (JSON)
- **baseExperience**: Experiencia base otorgada
- **dueDate**: Fecha límite de entrega
- **maxAttempts**: Número máximo de intentos
- **classroomId**: ID del aula a la que pertenece

#### Completamiento de Actividades (activity_completions)
- **id**: UUID único del completamiento
- **activityId**: ID de la actividad completada
- **userId**: ID del estudiante
- **score**: Puntuación obtenida (0-100)
- **answers**: Respuestas del estudiante (JSON)
- **attempts**: Número de intentos realizados
- **timeSpent**: Tiempo invertido en segundos
- **completedAt**: Fecha y hora de completamiento

#### Logros (achievements)
- **id**: UUID único del logro
- **title**: Título del logro
- **description**: Descripción del logro
- **identifier**: Identificador único para referencia
- **type**: Tipo de logro (progress, special, academic, etc.)
- **criteria**: Criterios para desbloquear (JSON)
- **rewards**: Recompensas otorgadas (JSON)
- **rarity**: Rareza del logro (common, rare, epic, legendary)

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+ (opcional, para caché)
- Docker y Docker Compose (opcional)

### Configuración del Backend

1. **Instalar dependencias**:
```bash
cd backend
npm install
```

2. **Configurar variables de entorno**:
```bash
cp .env.example .env
```

3. **Editar `.env`** con tus configuraciones:
```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=acalud_user
DB_PASSWORD=tu_password
DB_NAME=acalud_db

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_EXPIRES_IN=7d

# Redis (opcional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Configuración del servidor
PORT=3001
NODE_ENV=development
```

4. **Ejecutar migraciones**:
```bash
npm run migration:run
```

5. **Iniciar el servidor**:
```bash
npm run start:dev
```

### Configuración del Frontend

1. **Instalar dependencias**:
```bash
cd ../
npm install
```

2. **Configurar variables de entorno**:
```bash
cp .env.example .env
```

3. **Editar `.env`**:
```env
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=AcaLud
```

4. **Iniciar el desarrollo**:
```bash
npm run dev
```

## 📚 Documentación de APIs

### Autenticación

#### POST `/auth/register`
Registra un nuevo usuario en el sistema.

**Body**:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "MiPassword123!",
  "firstName": "Juan",
  "lastName": "Pérez",
  "role": "student"
}
```

**Respuesta**:
```json
{
  "user": {
    "id": "uuid",
    "email": "usuario@ejemplo.com",
    "firstName": "Juan",
    "lastName": "Pérez",
    "role": "student"
  },
  "access_token": "jwt_token"
}
```

#### POST `/auth/login`
Inicia sesión en el sistema.

**Body**:
```json
{
  "email": "usuario@ejemplo.com",
  "password": "MiPassword123!"
}
```

### Aulas Virtuales

#### GET `/classrooms`
Obtiene lista de aulas con filtros y paginación.

**Query Params**:
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10, max: 50)
- `search`: Búsqueda por nombre o descripción
- `subject`: Filtrar por materia
- `grade`: Filtrar por grado

#### POST `/classrooms`
Crea una nueva aula (solo docentes).

**Body**:
```json
{
  "name": "Matemáticas Avanzadas",
  "description": "Curso de matemáticas para bachillerato",
  "subject": "Matemáticas",
  "grade": "10° Grado",
  "color": "#6366f1"
}
```

#### POST `/classrooms/join`
Unirse a un aula usando código de invitación.

**Body**:
```json
{
  "inviteCode": "ABC12345"
}
```

### Actividades

#### POST `/activities`
Crea una nueva actividad (solo docentes).

**Body**:
```json
{
  "title": "Tabla del 7",
  "description": "Practica la tabla de multiplicar del 7",
  "type": "quiz",
  "difficulty": "medium",
  "subject": "Matemáticas",
  "classroomId": "uuid-aula",
  "content": {
    "questions": [
      {
        "id": 1,
        "question": "¿Cuánto es 7 x 8?",
        "options": ["54", "56", "58", "60"],
        "correctAnswer": 1,
        "points": 10
      }
    ]
  },
  "baseExperience": 100,
  "maxAttempts": 3
}
```

#### POST `/activities/:id/complete`
Completa una actividad (solo estudiantes).

**Body**:
```json
{
  "score": 85,
  "answers": {
    "question_1": "B",
    "question_2": "A"
  },
  "timeSpent": 450
}
```

### Gamificación

#### GET `/gamification/achievements`
Obtiene todos los logros disponibles.

#### GET `/gamification/achievements/my`
Obtiene los logros del usuario autenticado.

#### GET `/gamification/inventory`
Obtiene el inventario del usuario.

#### POST `/gamification/store/purchase`
Compra un item de la tienda.

**Body**:
```json
{
  "itemId": "avatar_ninja_001",
  "itemName": "Avatar Ninja Azul",
  "itemType": "avatar",
  "price": 150,
  "itemData": {
    "color": "#3B82F6",
    "style": "ninja"
  }
}
```

## 🎮 Sistema de Gamificación

### Mecánicas de Juego

#### Experiencia y Niveles
- **Experiencia Base**: Cada actividad otorga experiencia base configurable
- **Multiplicadores**: Bonificación por dificultad y puntuación obtenida
- **Fórmula de Nivel**: `Nivel = floor(sqrt(experiencia / 100)) + 1`

#### Sistema de Monedas
- **Ganancia**: 10% de la experiencia obtenida se convierte en monedas
- **Usos**: Compra de avatares, temas, decoraciones y power-ups
- **Economía**: Sistema balanceado para mantener el valor de las monedas

#### Logros y Achievements
- **Categorías**: Progress, Special, Social, Academic
- **Tipos**: Activities Completed, Experience Gained, Level Reached, etc.
- **Rareza**: Common, Rare, Epic, Legendary
- **Recompensas**: Experiencia, monedas e items especiales

### Tipos de Actividades

#### Quiz Interactivos
- Preguntas de opción múltiple
- Retroalimentación inmediata
- Sistema de puntuación por tiempo
- Múltiples intentos configurables

#### Juegos Educativos
- Drag and Drop
- Memory Games
- Interactive Simulations
- Gamified Exercises

#### Evaluaciones
- Assignments con fecha límite
- Rúbricas de evaluación
- Comentarios del docente
- Historial de intentos

## 🔐 Seguridad

### Autenticación
- **JWT Tokens**: Tokens seguros con expiración configurable
- **Password Hashing**: bcrypt con salt rounds altos
- **Rate Limiting**: Protección contra ataques de fuerza bruta

### Autorización
- **Role-Based Access Control (RBAC)**: Roles diferenciados
- **Resource-Level Permissions**: Permisos granulares por recurso
- **Guards**: Protección automática de rutas sensibles

### Validación de Datos
- **Input Validation**: Validación exhaustiva con class-validator
- **Sanitización**: Limpieza de datos de entrada
- **File Upload Security**: Validación de tipos y tamaños de archivo

## 📊 Monitoreo y Analytics

### Métricas del Sistema
- **Usuarios Activos**: Seguimiento de engagement
- **Completamiento de Actividades**: Tasas de éxito y abandono
- **Tiempo de Respuesta**: Rendimiento del sistema
- **Errores**: Logs detallados para debugging

### Analytics Educativos
- **Progreso del Estudiante**: Seguimiento individual
- **Rendimiento por Aula**: Estadísticas grupales
- **Efectividad de Actividades**: Análisis de dificultad y engagement
- **Reportes para Docentes**: Dashboards informativos

## 🧪 Testing

### Backend Testing
```bash
# Tests unitarios
npm run test

# Tests de integración
npm run test:e2e

# Coverage
npm run test:cov
```

### Frontend Testing
```bash
# Tests con Vitest
npm run test

# Tests en modo watch
npm run test:watch
```

## 🚢 Despliegue en Producción

### Variables de Entorno de Producción
```env
NODE_ENV=production
JWT_SECRET=secret_muy_seguro_para_produccion
DB_HOST=tu_db_host
DB_SSL=true
REDIS_URL=redis://tu_redis_url
```

### Docker Compose para Producción
```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
    ports:
      - "80:3000"
  
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: acalud_prod
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

## 🤝 Contribución

### Flujo de Desarrollo
1. Fork del repositorio
2. Crear rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Hacer commits descriptivos
4. Crear Pull Request con descripción detallada
5. Revisión y merge

### Estándares de Código
- **ESLint + Prettier**: Formato automático
- **Conventional Commits**: Mensajes de commit estandarizados
- **TypeScript Strict**: Tipado estricto
- **Documentación**: JSDoc para funciones complejas

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](./LICENSE) para más detalles.

## 👥 Equipo

- **Desarrollo Full Stack**: Arquitectura y implementación completa
- **UX/UI Design**: Diseño centrado en la experiencia educativa
- **DevOps**: Configuración de CI/CD y despliegue
- **Testing**: Aseguramiento de calidad y testing automatizado

## 📞 Soporte

Para reportar bugs, solicitar features o obtener ayuda:

- **Issues**: GitHub Issues del proyecto
- **Documentación**: Wiki del proyecto
- **Email**: soporte@acalud.com

---

**AcaLud** - Transformando la educación a través de la gamificación 🎓✨
