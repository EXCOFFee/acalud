# 🛡️ MÓDULO DE MODERACIÓN - DOCUMENTACIÓN COMPLETA

## 📋 Índice
1. [Introducción](#introducción)
2. [Casos de Uso Implementados](#casos-de-uso-implementados)
3. [Arquitectura del Módulo](#arquitectura-del-módulo)
4. [Entidades](#entidades)
5. [DTOs (Data Transfer Objects)](#dtos-data-transfer-objects)
6. [Servicio](#servicio)
7. [Controlador](#controlador)
8. [Endpoints de la API](#endpoints-de-la-api)
9. [Validaciones y Seguridad](#validaciones-y-seguridad)
10. [Principios SOLID Aplicados](#principios-solid-aplicados)
11. [Ejemplos de Uso](#ejemplos-de-uso)

---

## 🎯 Introducción

El **Módulo de Moderación** proporciona un sistema completo para que usuarios reporten contenido inapropiado y administradores gestionen estos reportes. Este módulo es fundamental para mantener un ambiente educativo seguro y respetuoso.

### Características Principales

- ✅ **Sistema de reportes**: Usuarios pueden reportar actividades con contenido inapropiado
- ✅ **Categorización**: 7 tipos de reportes (contenido inapropiado, spam, plagio, etc.)
- ✅ **Niveles de severidad**: 4 niveles (bajo, medio, alto, crítico)
- ✅ **Anti-spam**: Protección contra abuso del sistema de reportes
- ✅ **Flujo de moderación**: Estados del reporte (pendiente → revisión → resuelto/rechazado)
- ✅ **Estadísticas**: Dashboard con métricas de reportes
- ✅ **Filtrado avanzado**: Búsqueda por múltiples criterios
- ✅ **Logging completo**: Trazabilidad de todas las operaciones

---

## 📝 Casos de Uso Implementados

### CU-40: Reportar Actividad

**Actor:** Usuario autenticado (Estudiante, Docente, Admin)

**Descripción:** Permite reportar una actividad con contenido que viola las políticas.

**Flujo Principal:**
1. Usuario navega a una actividad
2. Usuario hace clic en "Reportar contenido"
3. Sistema muestra formulario de reporte
4. Usuario selecciona tipo de reporte (ej: "Contenido inapropiado")
5. Usuario escribe razón breve (ej: "Contiene lenguaje ofensivo")
6. Usuario proporciona descripción detallada
7. Usuario selecciona severidad
8. Sistema valida datos
9. Sistema verifica que no es spam (mismo contenido reportado en <24h)
10. Sistema verifica límite diario (máximo 10 reportes/día)
11. Sistema crea reporte con estado "pendiente"
12. Sistema confirma creación
13. Si severidad es "crítica", sistema notifica a admins inmediatamente

**Validaciones:**
- Razón: 10-200 caracteres
- Descripción: 20-2000 caracteres
- Tipo: Enum válido
- Severidad: Enum válido
- ID de actividad: UUID válido y actividad existe
- No spam: No reportar mismo contenido en <24h
- Límite: Máximo 10 reportes por usuario por día

**Excepciones:**
- `NotFoundException`: Actividad no encontrada
- `ConflictException`: Reporte duplicado o límite excedido
- `ForbiddenException`: Usuario suspendido

### CU-41: Ver Lista de Reportes (Moderador)

**Actor:** Administrador

**Descripción:** Permite visualizar todos los reportes del sistema con filtros.

**Flujo Principal:**
1. Admin accede a panel de moderación
2. Sistema muestra lista de reportes (más recientes primero)
3. Admin puede filtrar por:
   - Tipo de reporte
   - Estado (pendiente, en revisión, resuelto, rechazado)
   - Severidad
   - Rango de fechas
   - Usuario reportero
   - Actividad reportada
   - Búsqueda de texto
4. Sistema aplica filtros y muestra resultados paginados
5. Admin puede hacer clic en un reporte para ver detalles

**Características:**
- Paginación (máximo 100 por página)
- Ordenamiento por fecha de creación (DESC)
- Filtros combinables
- Búsqueda de texto en reason y description
- Carga de relaciones (reporter, activity, moderator)

### CU-42: Gestionar Reportes

**Actor:** Administrador

**Descripción:** Permite actualizar estado de reportes y tomar acciones.

**Flujo Principal:**
1. Admin abre un reporte específico
2. Sistema muestra detalles completos:
   - Información del reporte
   - Datos del usuario que reportó
   - Contenido reportado (actividad)
   - Historial de cambios
3. Admin analiza el contenido
4. Admin decide acción:
   - **Marcar en revisión**: Asigna el reporte a sí mismo
   - **Resolver**: Contenido viola políticas, se toma acción
   - **Rechazar**: Contenido es aceptable
   - **Cerrar**: Cerrar sin acción
5. Admin escribe notas de moderación (requerido para resolver/rechazar)
6. Admin describe acción tomada (ej: "Actividad desactivada")
7. Sistema valida transiciones de estado
8. Sistema guarda cambios
9. Sistema registra fecha de revisión
10. Sistema notifica al usuario que reportó (si está resuelto)

**Transiciones de Estado Válidas:**
- `pending` → `reviewing`, `closed`
- `reviewing` → `resolved`, `rejected`, `pending`, `closed`
- `resolved` → `closed`
- `rejected` → `closed`
- `closed` → (ninguna)

**Validaciones:**
- Notas requeridas para resolver/rechazar
- Solo admins pueden actualizar reportes
- Transiciones de estado válidas

---

## 🏗️ Arquitectura del Módulo

```
moderation/
├── entities/
│   └── report.entity.ts          # Entidad Report con validaciones
├── dto/
│   ├── create-report.dto.ts      # DTO para crear reportes
│   ├── update-report.dto.ts      # DTO para actualizar reportes
│   ├── report-filter.dto.ts      # DTO para filtrar reportes
│   └── index.ts                  # Barrel export
├── moderation.service.ts         # Lógica de negocio
├── moderation.controller.ts      # Endpoints HTTP
└── moderation.module.ts          # Configuración del módulo
```

### Dependencias

- **TypeORM**: Acceso a base de datos
- **Users Module**: Validar usuarios reporteros y moderadores
- **Activities Module**: Validar actividades reportadas
- **class-validator**: Validación de DTOs
- **NestJS Guards**: Autenticación (JwtAuthGuard) y autorización (RolesGuard)

---

## 📊 Entidades

### Report Entity

**Archivo:** `report.entity.ts`

**Descripción:** Representa un reporte de contenido inapropiado en el sistema.

**Campos Principales:**

| Campo | Tipo | Descripción | Validación |
|-------|------|-------------|------------|
| `id` | UUID | Identificador único | PK, auto-generado |
| `type` | Enum | Tipo de reporte | Enum ReportType |
| `reason` | String | Razón breve | 10-200 caracteres |
| `description` | Text | Descripción detallada | 20-2000 caracteres |
| `severity` | Enum | Severidad | Enum ReportSeverity |
| `status` | Enum | Estado actual | Enum ReportStatus |
| `reporterId` | UUID | Usuario que reportó | FK a User |
| `reportedActivityId` | UUID | Actividad reportada | FK a Activity (nullable) |
| `moderatorId` | UUID | Moderador asignado | FK a User (nullable) |
| `moderatorNotes` | Text | Notas del moderador | Nullable, max 2000 |
| `actionTaken` | String | Acción tomada | Nullable, max 500 |
| `reviewedAt` | Timestamp | Fecha de revisión | Nullable |
| `ipAddress` | String | IP del reportero | Para detección de spam |
| `userAgent` | String | User-Agent | Para análisis |
| `createdAt` | Timestamp | Fecha de creación | Auto |
| `updatedAt` | Timestamp | Última actualización | Auto |

**Enums:**

#### ReportType
```typescript
enum ReportType {
  INAPPROPRIATE_CONTENT = 'inappropriate_content', // Contenido ofensivo/discriminatorio
  SPAM = 'spam',                                   // Spam o contenido repetitivo
  PLAGIARISM = 'plagiarism',                       // Contenido copiado sin atribución
  MISINFORMATION = 'misinformation',               // Información falsa o engañosa
  HARASSMENT = 'harassment',                       // Acoso o comportamiento abusivo
  COPYRIGHT = 'copyright',                         // Violación de derechos de autor
  OTHER = 'other',                                 // Otro tipo de problema
}
```

#### ReportStatus
```typescript
enum ReportStatus {
  PENDING = 'pending',       // Pendiente de revisión
  REVIEWING = 'reviewing',   // En proceso de revisión
  RESOLVED = 'resolved',     // Resuelto (acción tomada)
  REJECTED = 'rejected',     // Rechazado (contenido aceptable)
  CLOSED = 'closed',         // Cerrado sin acción
}
```

#### ReportSeverity
```typescript
enum ReportSeverity {
  LOW = 'low',           // Problema menor
  MEDIUM = 'medium',     // Problema moderado
  HIGH = 'high',         // Problema grave
  CRITICAL = 'critical', // Problema crítico (requiere acción inmediata)
}
```

**Métodos de Utilidad:**

- `isPending()`: Verifica si está pendiente
- `isReviewing()`: Verifica si está en revisión
- `isResolved()`: Verifica si fue resuelto
- `isRejected()`: Verifica si fue rechazado
- `isClosed()`: Verifica si está cerrado
- `isHighPriority()`: Verifica si es alta prioridad
- `getDaysSinceCreation()`: Calcula días desde creación
- `getTypeDisplayName()`: Nombre legible del tipo
- `getStatusDisplayName()`: Nombre legible del estado
- `getSeverityEmoji()`: Emoji representativo de severidad

**Índices:**
- `[status, createdAt]`: Búsquedas por estado y fecha
- `[reporterId, createdAt]`: Reportes de un usuario
- `[reportedActivityId, status]`: Reportes de una actividad

---

## 📦 DTOs (Data Transfer Objects)

### CreateReportDto

**Uso:** Crear un nuevo reporte

**Campos:**

```typescript
{
  type: ReportType;              // Tipo de reporte (required)
  reason: string;                // Razón breve 10-200 chars (required)
  description: string;           // Descripción 20-2000 chars (required)
  severity?: ReportSeverity;     // Severidad (optional, default: MEDIUM)
  reportedActivityId?: string;   // UUID de actividad (optional)
}
```

**Ejemplo:**
```json
{
  "type": "inappropriate_content",
  "reason": "Contiene lenguaje ofensivo",
  "description": "La pregunta 3 del cuestionario utiliza términos discriminatorios...",
  "severity": "high",
  "reportedActivityId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### UpdateReportDto

**Uso:** Actualizar un reporte existente (solo admins)

**Campos:**

```typescript
{
  status?: ReportStatus;        // Nuevo estado (optional)
  moderatorNotes?: string;      // Notas del moderador max 2000 (optional)
  actionTaken?: string;         // Acción tomada max 500 (optional)
}
```

**Ejemplo:**
```json
{
  "status": "resolved",
  "moderatorNotes": "Contenido revisado, efectivamente viola políticas.",
  "actionTaken": "Actividad desactivada y usuario advertido"
}
```

### ReportFilterDto

**Uso:** Filtrar reportes en búsquedas

**Campos:**

```typescript
{
  type?: ReportType;             // Filtrar por tipo
  status?: ReportStatus;         // Filtrar por estado
  severity?: ReportSeverity;     // Filtrar por severidad
  reporterId?: string;           // Filtrar por usuario reportero
  moderatorId?: string;          // Filtrar por moderador
  reportedActivityId?: string;   // Filtrar por actividad
  startDate?: string;            // Fecha inicio (ISO 8601)
  endDate?: string;              // Fecha fin (ISO 8601)
  search?: string;               // Búsqueda de texto
}
```

**Ejemplo:**
```json
{
  "status": "pending",
  "severity": "high",
  "startDate": "2023-12-01",
  "endDate": "2023-12-31"
}
```

---

## 🔧 Servicio

### ModerationService

**Archivo:** `moderation.service.ts`

**Responsabilidades:**
- Crear reportes con validaciones anti-spam
- Listar reportes con filtros y paginación
- Actualizar reportes (cambiar estado, agregar notas)
- Eliminar reportes (solo admins)
- Generar estadísticas de reportes

**Métodos Principales:**

#### `createReport(dto, userId, ip, userAgent)`

Crea un nuevo reporte.

**Validaciones:**
1. Usuario existe y está activo
2. Actividad reportada existe (si se proporciona)
3. No es spam (mismo contenido en <24h)
4. No excede límite diario (10 reportes/día)

**Lógica:**
1. Validar usuario reportero
2. Validar actividad reportada
3. Detectar reportes duplicados (anti-spam)
4. Verificar límite diario (10/día)
5. Crear reporte con estado PENDING
6. Si es crítico, notificar a admins
7. Retornar reporte con relaciones

**Excepciones:**
- `NotFoundException`: Usuario o actividad no existe
- `ForbiddenException`: Usuario suspendido
- `ConflictException`: Spam o límite excedido

#### `findReports(filters, page, limit)`

Lista reportes con filtros y paginación.

**Características:**
- Paginación eficiente (skip/take)
- Filtros combinables
- Búsqueda de texto (OR en reason/description)
- Ordenamiento por fecha (DESC)
- Carga de relaciones (reporter, activity, moderator)

**Retorna:**
```typescript
{
  data: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

#### `updateReport(id, dto, moderatorId)`

Actualiza un reporte existente.

**Validaciones:**
1. Reporte existe
2. Usuario es admin
3. Transición de estado es válida
4. Si resuelve/rechaza, requiere notas

**Lógica:**
1. Validar permisos (solo admin)
2. Validar transición de estado
3. Asignar moderador si pasa a "reviewing"
4. Registrar fecha de revisión si resuelve/rechaza
5. Guardar cambios
6. Notificar al reportero si está resuelto

#### `getReportStatistics(startDate?, endDate?)`

Genera estadísticas de reportes.

**Retorna:**
```typescript
{
  total: number;
  byStatus: Record<ReportStatus, number>;
  byType: Record<ReportType, number>;
  bySeverity: Record<ReportSeverity, number>;
  pending: number;
  reviewing: number;
  resolved: number;
  rejected: number;
  avgResolutionTime: number;  // En días
  recentReports: number;      // Últimas 24h
}
```

---

## 🌐 Controlador

### ModerationController

**Archivo:** `moderation.controller.ts`

**Prefix:** `/moderation`

**Guards:**
- `JwtAuthGuard`: Todas las rutas requieren autenticación
- `RolesGuard`: Rutas admin requieren rol ADMIN

**Endpoints:**

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | `/reports` | Usuarios | Crear reporte (CU-40) |
| GET | `/reports/my-reports` | Usuarios | Ver mis reportes |
| GET | `/reports` | Admin | Listar todos los reportes (CU-41) |
| GET | `/reports/:id` | Admin | Ver reporte específico |
| PUT | `/reports/:id` | Admin | Actualizar reporte (CU-42) |
| DELETE | `/reports/:id` | Admin | Eliminar reporte |
| GET | `/statistics` | Admin | Estadísticas de reportes |

---

## 🔐 Endpoints de la API

### POST /moderation/reports

**Descripción:** Crear un nuevo reporte (CU-40)

**Acceso:** Usuarios autenticados

**Body:**
```json
{
  "type": "inappropriate_content",
  "reason": "Contiene lenguaje ofensivo",
  "description": "La pregunta 3 utiliza términos discriminatorios...",
  "severity": "high",
  "reportedActivityId": "123e4567-..."
}
```

**Respuesta 201:**
```json
{
  "success": true,
  "message": "Reporte creado exitosamente. Será revisado por nuestro equipo.",
  "data": {
    "id": "123e4567-...",
    "type": "inappropriate_content",
    "reason": "Contiene lenguaje ofensivo",
    "severity": "high",
    "status": "pending",
    "createdAt": "2023-12-01T10:30:00Z"
  },
  "timestamp": "2023-12-01T10:30:00Z"
}
```

**Errores:**
- 400: Datos inválidos
- 404: Actividad no encontrada
- 409: Reporte duplicado o límite excedido
- 403: Usuario suspendido

### GET /moderation/reports/my-reports

**Descripción:** Ver mis reportes

**Acceso:** Usuarios autenticados

**Query Params:**
- `page` (number): Número de página
- `limit` (number): Elementos por página

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Reportes obtenidos exitosamente",
  "data": {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "timestamp": "2023-12-01T10:30:00Z"
}
```

### GET /moderation/reports

**Descripción:** Listar todos los reportes con filtros (CU-41)

**Acceso:** Solo Admin

**Query Params:**
- `page` (number): Página
- `limit` (number): Elementos por página
- `type` (ReportType): Filtrar por tipo
- `status` (ReportStatus): Filtrar por estado
- `severity` (ReportSeverity): Filtrar por severidad
- `reporterId` (UUID): Filtrar por usuario reportero
- `moderatorId` (UUID): Filtrar por moderador
- `reportedActivityId` (UUID): Filtrar por actividad
- `startDate` (ISO 8601): Fecha inicio
- `endDate` (ISO 8601): Fecha fin
- `search` (string): Búsqueda de texto

**Ejemplo:**
```
GET /moderation/reports?status=pending&severity=high&page=1&limit=10
```

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Reportes obtenidos exitosamente",
  "data": {
    "data": [
      {
        "id": "123e4567-...",
        "type": "inappropriate_content",
        "reason": "Contiene lenguaje ofensivo",
        "severity": "high",
        "status": "pending",
        "reporter": { "id": "...", "name": "Juan Pérez" },
        "reportedActivity": { "id": "...", "title": "Cuestionario Historia" },
        "createdAt": "2023-12-01T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "timestamp": "2023-12-01T10:30:00Z"
}
```

**Errores:**
- 403: No eres admin

### GET /moderation/reports/:id

**Descripción:** Obtener reporte específico por ID

**Acceso:** Solo Admin

**Params:**
- `id` (UUID): ID del reporte

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Reporte obtenido exitosamente",
  "data": {
    "id": "123e4567-...",
    "type": "inappropriate_content",
    "reason": "Contiene lenguaje ofensivo",
    "description": "La pregunta 3 utiliza términos...",
    "severity": "high",
    "status": "pending",
    "reporter": { "id": "...", "name": "Juan", "email": "juan@..." },
    "reportedActivity": {
      "id": "...",
      "title": "Cuestionario Historia",
      "creator": { "id": "...", "name": "Prof. García" }
    },
    "moderatorId": null,
    "moderator": null,
    "moderatorNotes": null,
    "actionTaken": null,
    "reviewedAt": null,
    "ipAddress": "192.168.1.1",
    "createdAt": "2023-12-01T10:30:00Z",
    "updatedAt": "2023-12-01T10:30:00Z"
  },
  "timestamp": "2023-12-01T10:30:00Z"
}
```

**Errores:**
- 404: Reporte no encontrado
- 403: No eres admin

### PUT /moderation/reports/:id

**Descripción:** Actualizar reporte (CU-42)

**Acceso:** Solo Admin

**Params:**
- `id` (UUID): ID del reporte

**Body:**
```json
{
  "status": "resolved",
  "moderatorNotes": "Contenido revisado, efectivamente viola políticas.",
  "actionTaken": "Actividad desactivada y usuario advertido"
}
```

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Reporte actualizado exitosamente",
  "data": {
    "id": "123e4567-...",
    "status": "resolved",
    "moderatorId": "admin-id-...",
    "moderator": { "id": "...", "name": "Admin García" },
    "moderatorNotes": "Contenido revisado, efectivamente viola políticas.",
    "actionTaken": "Actividad desactivada y usuario advertido",
    "reviewedAt": "2023-12-15T14:30:00Z",
    "updatedAt": "2023-12-15T14:30:00Z",
    ...
  },
  "timestamp": "2023-12-15T14:30:00Z"
}
```

**Errores:**
- 400: Transición de estado inválida o notas faltantes
- 404: Reporte no encontrado
- 403: No eres admin

### DELETE /moderation/reports/:id

**Descripción:** Eliminar reporte permanentemente

**Acceso:** Solo Admin

**Params:**
- `id` (UUID): ID del reporte

**Respuesta 204:** (Sin contenido)

**Errores:**
- 404: Reporte no encontrado
- 403: No eres admin

### GET /moderation/statistics

**Descripción:** Obtener estadísticas de reportes

**Acceso:** Solo Admin

**Query Params:**
- `startDate` (ISO 8601): Fecha inicio (opcional)
- `endDate` (ISO 8601): Fecha fin (opcional)

**Ejemplo:**
```
GET /moderation/statistics?startDate=2023-12-01&endDate=2023-12-31
```

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Estadísticas generadas exitosamente",
  "data": {
    "total": 125,
    "pending": 15,
    "reviewing": 8,
    "resolved": 92,
    "rejected": 10,
    "avgResolutionTime": 2.5,
    "recentReports": 5,
    "byStatus": {
      "pending": 15,
      "reviewing": 8,
      "resolved": 92,
      "rejected": 10,
      "closed": 0
    },
    "byType": {
      "inappropriate_content": 45,
      "spam": 30,
      "plagiarism": 20,
      "misinformation": 15,
      "harassment": 10,
      "copyright": 3,
      "other": 2
    },
    "bySeverity": {
      "low": 30,
      "medium": 50,
      "high": 35,
      "critical": 10
    }
  },
  "timestamp": "2023-12-01T10:30:00Z"
}
```

**Errores:**
- 403: No eres admin

---

## 🛡️ Validaciones y Seguridad

### Validaciones Anti-Spam

#### 1. Detección de Reportes Duplicados
```typescript
// Si usuario reportó el mismo contenido en las últimas 24 horas
const recentDuplicate = await reportRepository.findOne({
  where: {
    reporterId,
    reportedActivityId,
    createdAt: Between(last24Hours, now)
  }
});

if (recentDuplicate) {
  throw new ConflictException('Ya has reportado este contenido recientemente');
}
```

#### 2. Límite de Reportes por Día
```typescript
// Máximo 10 reportes por usuario por día
const reportsToday = await reportRepository.count({
  where: {
    reporterId,
    createdAt: Between(todayStart, todayEnd)
  }
});

if (reportsToday >= 10) {
  throw new ConflictException('Has alcanzado el límite de reportes por día (10)');
}
```

#### 3. Registro de IP y User-Agent
```typescript
// Se guarda IP y User-Agent para análisis de patrones de abuso
const report = reportRepository.create({
  ...reportData,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent')
});
```

### Validaciones de Permisos

#### 1. Solo Admins Pueden Gestionar Reportes
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
async updateReport(...) { ... }
```

#### 2. Transiciones de Estado Válidas
```typescript
const validTransitions: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.PENDING]: [ReportStatus.REVIEWING, ReportStatus.CLOSED],
  [ReportStatus.REVIEWING]: [ReportStatus.RESOLVED, ReportStatus.REJECTED, ReportStatus.PENDING, ReportStatus.CLOSED],
  [ReportStatus.RESOLVED]: [ReportStatus.CLOSED],
  [ReportStatus.REJECTED]: [ReportStatus.CLOSED],
  [ReportStatus.CLOSED]: [],
};

if (!validTransitions[currentStatus].includes(newStatus)) {
  throw new BadRequestException('Transición de estado inválida');
}
```

#### 3. Notas Requeridas para Resolución
```typescript
if ([ReportStatus.RESOLVED, ReportStatus.REJECTED].includes(status)) {
  if (!moderatorNotes) {
    throw new BadRequestException('Debes proporcionar notas al resolver/rechazar');
  }
}
```

### Validaciones de Datos

#### 1. DTOs con class-validator
```typescript
export class CreateReportDto {
  @IsEnum(ReportType)
  @IsNotEmpty()
  type: ReportType;

  @IsString()
  @MinLength(10)
  @MaxLength(200)
  @IsNotEmpty()
  reason: string;

  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  @IsNotEmpty()
  description: string;

  @IsEnum(ReportSeverity)
  @IsOptional()
  severity?: ReportSeverity;

  @IsUUID(4)
  @IsOptional()
  reportedActivityId?: string;
}
```

#### 2. ValidationPipe en Controller
```typescript
@Post('reports')
async createReport(
  @Body(ValidationPipe) createReportDto: CreateReportDto,
  ...
) { ... }
```

### Seguridad Adicional

#### 1. Rate Limiting
```typescript
// Configurado en app.module.ts
ThrottlerModule.forRoot([{
  ttl: 60000,    // 1 minuto
  limit: 100,    // 100 requests por minuto
}])
```

#### 2. Sanitización de Inputs
```typescript
// trim() en campos de texto antes de guardar
reason: createReportDto.reason.trim(),
description: createReportDto.description.trim(),
```

#### 3. SQL Injection Prevention
```typescript
// TypeORM usa prepared statements automáticamente
// QueryBuilder con parámetros nombrados
queryBuilder.andWhere('report.status = :status', { status });
```

---

## 🎨 Principios SOLID Aplicados

### 1. Single Responsibility Principle (SRP)

**Cada clase tiene una única responsabilidad:**

- `Report`: Representa datos de un reporte
- `ModerationService`: Lógica de negocio de reportes
- `ModerationController`: Manejo de peticiones HTTP
- `CreateReportDto`: Validación de datos de entrada
- `ModerationModule`: Configuración del módulo

**Ejemplo:**
```typescript
// ❌ MAL: Controller con lógica de negocio
@Post('reports')
async create(@Body() dto: CreateReportDto) {
  // Validar usuario
  const user = await this.userRepo.findOne(...);
  if (!user) throw new NotFoundException();
  
  // Detectar spam
  const recent = await this.reportRepo.find(...);
  if (recent.length > 0) throw new ConflictException();
  
  // Crear reporte
  const report = this.reportRepo.create(dto);
  return this.reportRepo.save(report);
}

// ✅ BIEN: Controller delega a servicio
@Post('reports')
async create(@Body() dto: CreateReportDto) {
  return this.moderationService.createReport(dto, userId, ip, userAgent);
}
```

### 2. Open/Closed Principle (OCP)

**Abierto para extensión, cerrado para modificación:**

- Sistema extensible para nuevos tipos de reportes sin modificar código existente
- Enums para tipos, estados y severidades
- Fácil agregar nuevos tipos de contenido reportable (usuarios, comentarios, etc.)

**Ejemplo:**
```typescript
// ✅ Agregar nuevo tipo de reporte sin modificar código existente
enum ReportType {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  // Nuevo tipo agregado fácilmente:
  FAKE_NEWS = 'fake_news',
}

// ✅ Agregar nuevo tipo de contenido reportable sin modificar servicio
@Column({ type: 'uuid', nullable: true })
reportedCommentId: string | null;

@ManyToOne(() => Comment, { nullable: true, onDelete: 'SET NULL' })
reportedComment: Comment | null;
```

### 3. Liskov Substitution Principle (LSP)

**Las subclases deben ser sustituibles por sus clases base:**

- Report extiende Entity base de TypeORM correctamente
- Métodos de utilidad no rompen contrato base
- Implementación correcta de interfaces NestJS

**Ejemplo:**
```typescript
// ✅ Report puede sustituir a cualquier Entity
@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  
  // Métodos adicionales no rompen contrato
  isPending(): boolean {
    return this.status === ReportStatus.PENDING;
  }
}
```

### 4. Interface Segregation Principle (ISP)

**Interfaces específicas mejor que interfaces generales:**

- DTOs específicos para cada operación (CreateReportDto, UpdateReportDto, ReportFilterDto)
- No forzar implementación de métodos innecesarios
- Servicios exponen solo métodos necesarios

**Ejemplo:**
```typescript
// ✅ DTOs específicos para cada caso
export class CreateReportDto {
  type: ReportType;
  reason: string;
  description: string;
  // Solo campos necesarios para creación
}

export class UpdateReportDto {
  status?: ReportStatus;
  moderatorNotes?: string;
  // Solo campos actualizables por moderadores
}

// ❌ MAL: DTO general que fuerza campos innecesarios
export class ReportDto {
  id: string;           // No necesario en creación
  createdAt: Date;      // Auto-generado
  status: ReportStatus; // Requerido solo en update
  // ...todos los campos mezclados
}
```

### 5. Dependency Inversion Principle (DIP)

**Depender de abstracciones, no de implementaciones:**

- Inyección de dependencias vía constructor
- Uso de repositorios (abstracciones) no de implementaciones concretas
- Servicios dependen de interfaces, no de clases concretas

**Ejemplo:**
```typescript
// ✅ Inyección de dependencias - abstracciones
@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
  ) {}
}

// ❌ MAL: Depender de implementaciones concretas
export class ModerationService {
  private reportRepository = new ReportRepositoryImpl();
  private userRepository = new UserRepositoryImpl();
}
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Usuario Reporta Actividad

**Frontend:**
```typescript
// 1. Usuario hace clic en "Reportar contenido" en una actividad
async function reportActivity(activityId: string) {
  try {
    const response = await fetch('/api/v1/moderation/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        type: 'inappropriate_content',
        reason: 'Contiene lenguaje ofensivo',
        description: 'La pregunta 3 del cuestionario utiliza términos discriminatorios hacia minorías étnicas...',
        severity: 'high',
        reportedActivityId: activityId
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Reporte enviado exitosamente');
      // Mostrar confirmación
      showNotification('Tu reporte será revisado por nuestro equipo');
    }
  } catch (error) {
    console.error('Error al crear reporte:', error);
    alert('❌ Error al enviar reporte');
  }
}
```

**Backend (automático):**
```typescript
// ModerationService.createReport():
// 1. Valida usuario existe y está activo ✅
// 2. Valida actividad existe ✅
// 3. Detecta spam (mismo contenido en <24h) ✅
// 4. Verifica límite diario (10/día) ✅
// 5. Crea reporte con estado PENDING
// 6. Si es CRITICAL, notifica a admins
// 7. Retorna reporte creado
```

### Ejemplo 2: Admin Ve Reportes Pendientes

**Frontend:**
```typescript
// Admin accede a panel de moderación
async function loadPendingReports() {
  try {
    const response = await fetch('/api/v1/moderation/reports?status=pending&page=1&limit=20', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const reports = data.data.data;
      const pagination = data.data.pagination;
      
      // Mostrar lista de reportes
      reports.forEach(report => {
        console.log(`[${report.severity}] ${report.reason}`);
        console.log(`Reportado por: ${report.reporter.name}`);
        console.log(`Actividad: ${report.reportedActivity.title}`);
      });
      
      console.log(`Página ${pagination.page} de ${pagination.totalPages}`);
    }
  } catch (error) {
    console.error('Error al cargar reportes:', error);
  }
}
```

### Ejemplo 3: Admin Resuelve Reporte

**Frontend:**
```typescript
// Admin marca reporte como resuelto
async function resolveReport(reportId: string) {
  try {
    const response = await fetch(`/api/v1/moderation/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'resolved',
        moderatorNotes: 'Contenido revisado en detalle. Efectivamente contiene lenguaje inapropiado según políticas institucionales. Se procedió a desactivar la actividad.',
        actionTaken: 'Actividad desactivada y usuario advertido por email'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('✅ Reporte resuelto exitosamente');
      // Actualizar lista de reportes
      loadPendingReports();
    }
  } catch (error) {
    console.error('Error al resolver reporte:', error);
    alert('❌ Error al resolver reporte');
  }
}
```

**Backend (automático):**
```typescript
// ModerationService.updateReport():
// 1. Valida reporte existe ✅
// 2. Valida usuario es admin ✅
// 3. Valida transición PENDING → RESOLVED es válida ✅
// 4. Valida que tiene moderatorNotes ✅
// 5. Asigna moderador (si no tiene)
// 6. Registra fecha de revisión
// 7. Guarda cambios
// 8. Notifica al reportero (TODO)
// 9. Retorna reporte actualizado
```

### Ejemplo 4: Admin Ve Estadísticas

**Frontend:**
```typescript
// Dashboard de moderación
async function loadModerationStats() {
  try {
    const response = await fetch('/api/v1/moderation/statistics', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const stats = data.data;
      
      console.log('=== ESTADÍSTICAS DE MODERACIÓN ===');
      console.log(`Total reportes: ${stats.total}`);
      console.log(`Pendientes: ${stats.pending}`);
      console.log(`En revisión: ${stats.reviewing}`);
      console.log(`Resueltos: ${stats.resolved}`);
      console.log(`Rechazados: ${stats.rejected}`);
      console.log(`Tiempo promedio resolución: ${stats.avgResolutionTime} días`);
      console.log(`Reportes últimas 24h: ${stats.recentReports}`);
      
      // Mostrar gráficos
      renderChart('byType', stats.byType);
      renderChart('bySeverity', stats.bySeverity);
    }
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
}
```

### Ejemplo 5: Usuario Ve Sus Reportes

**Frontend:**
```typescript
// Usuario ve historial de sus reportes
async function loadMyReports() {
  try {
    const response = await fetch('/api/v1/moderation/reports/my-reports?page=1&limit=10', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const reports = data.data.data;
      
      console.log('=== MIS REPORTES ===');
      reports.forEach(report => {
        console.log(`[${report.status}] ${report.reason}`);
        console.log(`Creado: ${new Date(report.createdAt).toLocaleDateString()}`);
        
        if (report.status === 'resolved') {
          console.log(`✅ Resuelto: ${report.actionTaken}`);
        } else if (report.status === 'rejected') {
          console.log(`❌ Rechazado`);
        } else if (report.status === 'reviewing') {
          console.log(`🔍 En revisión por: ${report.moderator?.name}`);
        } else {
          console.log(`⏳ Pendiente de revisión`);
        }
        
        console.log('---');
      });
    }
  } catch (error) {
    console.error('Error al cargar mis reportes:', error);
  }
}
```

---

## 🔄 Flujo Completo del Sistema

### Flujo de Creación de Reporte

```
1. Usuario ve actividad con contenido inapropiado
   ↓
2. Hace clic en "Reportar contenido"
   ↓
3. Frontend muestra formulario de reporte
   ↓
4. Usuario completa formulario:
   - Tipo: "Contenido inapropiado"
   - Razón: "Contiene lenguaje ofensivo"
   - Descripción: "La pregunta 3 usa términos..."
   - Severidad: "Alta"
   ↓
5. Frontend envía POST /moderation/reports
   ↓
6. Backend (ModerationController) recibe request
   ↓
7. ValidationPipe valida DTO
   ↓
8. ModerationService.createReport():
   ├─ Valida usuario existe y activo
   ├─ Valida actividad existe
   ├─ Detecta spam (24h)
   ├─ Verifica límite (10/día)
   ├─ Crea reporte (estado PENDING)
   ├─ Si CRITICAL: notifica admins
   └─ Retorna reporte creado
   ↓
9. Controller retorna respuesta 201
   ↓
10. Frontend muestra confirmación
    ↓
11. (Si CRITICAL) Admins reciben notificación inmediata
```

### Flujo de Moderación

```
1. Admin accede a panel de moderación
   ↓
2. GET /moderation/reports?status=pending
   ↓
3. Backend lista reportes pendientes
   ↓
4. Admin ve lista de reportes:
   [🔴 CRÍTICO] Usuario usa lenguaje discriminatorio
   [🟠 ALTO] Contenido copiado sin atribución
   [🟡 MEDIO] Actividad repetida (spam)
   ↓
5. Admin hace clic en reporte crítico
   ↓
6. GET /moderation/reports/:id
   ↓
7. Backend retorna detalles completos:
   - Información del reporte
   - Datos del reportero
   - Contenido reportado (actividad completa)
   ↓
8. Admin analiza contenido
   ↓
9. Admin decide: "Efectivamente viola políticas"
   ↓
10. Admin completa formulario de resolución:
    - Estado: "Resuelto"
    - Notas: "Contenido revisado, efectivamente viola..."
    - Acción: "Actividad desactivada y usuario advertido"
    ↓
11. Frontend envía PUT /moderation/reports/:id
    ↓
12. Backend (ModerationService.updateReport()):
    ├─ Valida permisos (admin)
    ├─ Valida transición PENDING → RESOLVED
    ├─ Valida que tiene notas
    ├─ Asigna moderador (admin actual)
    ├─ Registra fecha de revisión
    ├─ Guarda cambios
    ├─ Notifica al reportero
    └─ Retorna reporte actualizado
    ↓
13. Controller retorna respuesta 200
    ↓
14. Frontend actualiza vista
    ↓
15. Reportero recibe notificación:
    "Tu reporte ha sido resuelto. Acción tomada: Actividad desactivada..."
```

---

## ✅ Checklist de Implementación

### Casos de Uso
- [x] CU-40: Reportar actividad
- [x] CU-41: Ver lista de reportes (admin)
- [x] CU-42: Gestionar reportes (admin)

### Entidades
- [x] Report con todos los campos requeridos
- [x] Relaciones con User (reporter, moderator)
- [x] Relación con Activity
- [x] Enums (ReportType, ReportStatus, ReportSeverity)
- [x] Métodos de utilidad
- [x] Índices de base de datos

### DTOs
- [x] CreateReportDto con validaciones
- [x] UpdateReportDto con validaciones
- [x] ReportFilterDto con validaciones
- [x] Documentación completa

### Servicio
- [x] createReport() con anti-spam
- [x] findReports() con filtros y paginación
- [x] findReportById()
- [x] updateReport() con validaciones
- [x] deleteReport() (solo admin)
- [x] getReportStatistics()
- [x] Logging completo

### Controlador
- [x] POST /reports (usuarios)
- [x] GET /reports/my-reports (usuarios)
- [x] GET /reports (admin)
- [x] GET /reports/:id (admin)
- [x] PUT /reports/:id (admin)
- [x] DELETE /reports/:id (admin)
- [x] GET /statistics (admin)
- [x] Guards (JWT, Roles)
- [x] Documentación Swagger

### Validaciones
- [x] Detección de spam (24h)
- [x] Límite diario (10/día)
- [x] Permisos (solo admin gestiona)
- [x] Transiciones de estado válidas
- [x] Notas requeridas para resolver/rechazar
- [x] Validación de DTOs

### Módulo
- [x] ModerationModule configurado
- [x] Registrado en AppModule
- [x] Exporta servicio para otros módulos

### Documentación
- [x] README completo
- [x] Comentarios exhaustivos en código
- [x] Ejemplos de uso
- [x] Diagramas de flujo

### Principios SOLID
- [x] SRP: Responsabilidades únicas
- [x] OCP: Extensible sin modificación
- [x] LSP: Sustitución correcta
- [x] ISP: Interfaces específicas
- [x] DIP: Dependencias inyectadas

---

## 🚀 Próximos Pasos

### Mejoras Futuras

1. **Sistema de Notificaciones**
   - Notificar a admins cuando hay reportes críticos
   - Notificar al reportero cuando se resuelve su reporte
   - Email o push notifications

2. **Tipos de Contenido Adicionales**
   - Reportar usuarios
   - Reportar comentarios
   - Reportar aulas

3. **Análisis Avanzado**
   - Machine Learning para detectar patrones de abuso
   - Clasificación automática de severidad
   - Sugerencias de acción basadas en reportes similares

4. **Workflow de Moderación**
   - Asignación automática de reportes a moderadores
   - Cola de trabajo para moderadores
   - SLA (tiempo máximo de respuesta)

5. **Auditoría**
   - Historial completo de cambios en reportes
   - Registrar quién hizo qué cambio y cuándo
   - Exportar reportes para auditoría externa

6. **Dashboard Avanzado**
   - Gráficos en tiempo real
   - Tendencias de reportes
   - Análisis por tipo, severidad, fecha

---

## 📚 Referencias

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [class-validator Documentation](https://github.com/typestack/class-validator)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)

---

## 👥 Contacto

Si tienes preguntas o sugerencias sobre el módulo de moderación, contacta al equipo de desarrollo.

---

**Última actualización:** 2024-01-XX
**Versión:** 1.0.0
**Estado:** ✅ Implementación completa
