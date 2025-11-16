# 📋 ANÁLISIS DE ENDPOINTS FALTANTES - CASOS DE USO PENDIENTES

## 🎯 Resumen Ejecutivo

**Fecha de análisis:** 30 de Septiembre, 2025

**Estado general:** 39/42 casos de uso implementados (93%)

**Casos de uso analizados:**
- ✅ CU-16: Abandonar Aula → **YA EXISTE**
- ⚠️ CU-11: Modificar Avatar → **PARCIAL (falta endpoint)**
- ❌ CU-20: Agregar Actividad a Aula → **NO EXISTE**
- ❌ CU-22: Quitar Actividad de Aula → **NO EXISTE**
- ⚠️ CU-27: Publicar Actividad → **PARCIAL (falta endpoint)**

---

## ✅ CU-16: Abandonar Aula - IMPLEMENTADO

### Estado: COMPLETO ✅

**Endpoint encontrado:**
```typescript
// classrooms.controller.ts línea 234
@Delete(':id/leave')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: 'Salirse de un aula' })
async leaveClassroom(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<void> {
  await this.classroomsService.leaveClassroom(id, req.user.id);
}
```

**Servicio implementado:**
```typescript
// classrooms.service.ts línea 259
async leaveClassroom(classroomId: string, studentId: string): Promise<void> {
  // Lógica completa implementada
}
```

**Ruta:** `DELETE /classrooms/:id/leave`

**Funcionalidad:**
- Usuario autenticado puede abandonar un aula
- Validaciones de permisos
- Manejo de errores

**✅ NO REQUIERE ACCIÓN**

---

## ⚠️ CU-11: Modificar Avatar - PARCIAL

### Estado: CAMPO EXISTE, FALTA ENDPOINT ⚠️

**Campo en entidad:**
```typescript
// user.entity.ts línea 109-114
@ApiProperty({ description: 'URL del avatar del usuario', required: false })
@Column({ nullable: true })
@IsOptional()
@IsString({ message: 'URL del avatar debe ser una cadena de texto' })
@Length(0, 500, { message: 'URL del avatar no puede exceder 500 caracteres' })
avatar?: string;
```

**Endpoint actual:**
```typescript
// users.controller.ts
// ❌ NO EXISTE endpoint específico para avatar
// Actualmente solo existe PATCH /users/profile que actualiza todos los campos
```

### ❌ QUÉ FALTA IMPLEMENTAR:

#### 1. Endpoint específico para avatar

**Ruta:** `PATCH /users/profile/avatar`

**Características requeridas:**
- Recibir archivo de imagen (multipart/form-data)
- Validar tipo de archivo (jpg, jpeg, png, webp)
- Validar tamaño máximo (ej: 2MB)
- Usar `files.service` existente para subir archivo
- Actualizar campo `user.avatar` con URL del archivo
- Eliminar avatar anterior si existe
- Retornar usuario actualizado

**Ejemplo de implementación necesaria:**

```typescript
// users.controller.ts
@Patch('profile/avatar')
@UseInterceptors(FileInterceptor('avatar'))
@ApiOperation({ summary: 'Actualizar avatar del usuario' })
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      avatar: {
        type: 'string',
        format: 'binary',
      },
    },
  },
})
async updateAvatar(
  @Request() req,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
        new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
      ],
    }),
  )
  file: Express.Multer.File,
): Promise<User> {
  return this.usersService.updateAvatar(req.user.id, file);
}
```

**Servicio necesario:**

```typescript
// users.service.ts
async updateAvatar(userId: string, file: Express.Multer.File): Promise<User> {
  // 1. Obtener usuario
  const user = await this.findById(userId);
  
  // 2. Si tiene avatar anterior, eliminarlo
  if (user.avatar) {
    await this.filesService.deleteFile(user.avatar);
  }
  
  // 3. Subir nuevo avatar
  const avatarUrl = await this.filesService.uploadSingle(file, 'avatars');
  
  // 4. Actualizar usuario
  user.avatar = avatarUrl;
  return await this.userRepository.save(user);
}
```

**Dependencias:**
- `@nestjs/platform-express` (FileInterceptor)
- `files.service` (ya existe en el proyecto)
- Configuración de multer

---

## ❌ CU-20: Agregar Actividad a Aula - NO EXISTE

### Estado: NO IMPLEMENTADO ❌

**Búsqueda realizada:**
```bash
# Buscado en classrooms.controller.ts y classrooms.service.ts
# NO se encontró endpoint para agregar actividad a aula
```

**Relación encontrada:**
```typescript
// activity.entity.ts
@ManyToOne(() => Classroom, (classroom) => classroom.activities)
@JoinColumn({ name: 'classroomId' })
classroom: Classroom;

@Column({ type: 'uuid', nullable: false })
classroomId: string;
```

**Análisis:**
- Las actividades YA TIENEN relación con Classroom (ManyToOne)
- Al crear actividad, se asigna `classroomId` en CreateActivityDto
- **PERO** no existe endpoint para agregar actividad existente a otra aula

### ❌ QUÉ FALTA IMPLEMENTAR:

#### Opción A: Agregar actividad existente a aula

**Ruta:** `POST /classrooms/:id/activities`

**Body:**
```json
{
  "activityId": "uuid-de-actividad-existente"
}
```

**Características:**
- Solo docentes pueden agregar actividades
- Validar que el usuario sea owner del aula
- Validar que la actividad exista
- Validar que la actividad no esté ya en el aula
- Actualizar relación actividad-aula

**Implementación necesaria:**

```typescript
// classrooms.controller.ts
@Post(':id/activities')
@ApiOperation({ summary: 'Agregar actividad existente a aula' })
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      activityId: { type: 'string', format: 'uuid' },
    },
  },
})
async addActivityToClassroom(
  @Param('id', ParseUUIDPipe) classroomId: string,
  @Body() body: { activityId: string },
  @Request() req,
): Promise<Classroom> {
  return this.classroomsService.addActivity(
    classroomId,
    body.activityId,
    req.user.id
  );
}
```

**Servicio necesario:**

```typescript
// classrooms.service.ts
async addActivity(
  classroomId: string,
  activityId: string,
  userId: string
): Promise<Classroom> {
  // 1. Validar que el aula existe
  const classroom = await this.findById(classroomId);
  
  // 2. Validar que el usuario es owner
  if (classroom.teacherId !== userId) {
    throw new ForbiddenException('Solo el docente puede agregar actividades');
  }
  
  // 3. Validar que la actividad existe
  const activity = await this.activityRepository.findOne({
    where: { id: activityId }
  });
  
  if (!activity) {
    throw new NotFoundException('Actividad no encontrada');
  }
  
  // 4. Validar que la actividad no esté ya en el aula
  if (activity.classroomId === classroomId) {
    throw new ConflictException('La actividad ya está en esta aula');
  }
  
  // 5. Actualizar actividad
  activity.classroomId = classroomId;
  await this.activityRepository.save(activity);
  
  // 6. Retornar aula actualizada
  return this.findById(classroomId);
}
```

#### Opción B: Compartir/copiar actividad entre aulas

**Alternativa:** En lugar de "mover" la actividad, crear una copia

**Ventaja:** No afecta actividad original

**Desventaja:** Más complejo

---

## ❌ CU-22: Quitar Actividad de Aula - NO EXISTE

### Estado: NO IMPLEMENTADO ❌

**Búsqueda realizada:**
```bash
# Buscado en classrooms.controller.ts y classrooms.service.ts
# NO se encontró endpoint para quitar actividad
```

### ❌ QUÉ FALTA IMPLEMENTAR:

**Ruta:** `DELETE /classrooms/:id/activities/:activityId`

**Características:**
- Solo docentes pueden quitar actividades
- Validar que el usuario sea owner del aula
- Validar que la actividad existe y está en el aula
- Opciones:
  - **Opción A:** Eliminar actividad completamente (hard delete)
  - **Opción B:** Desvincular de aula (set classroomId = null)
  - **Opción C:** Desactivar actividad (set isActive = false)

**Implementación necesaria:**

```typescript
// classrooms.controller.ts
@Delete(':id/activities/:activityId')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: 'Quitar actividad del aula' })
@ApiResponse({
  status: 204,
  description: 'Actividad quitada exitosamente',
})
@ApiResponse({
  status: 403,
  description: 'Solo el docente puede quitar actividades',
})
@ApiResponse({
  status: 404,
  description: 'Aula o actividad no encontrada',
})
async removeActivityFromClassroom(
  @Param('id', ParseUUIDPipe) classroomId: string,
  @Param('activityId', ParseUUIDPipe) activityId: string,
  @Request() req,
): Promise<void> {
  await this.classroomsService.removeActivity(
    classroomId,
    activityId,
    req.user.id
  );
}
```

**Servicio necesario:**

```typescript
// classrooms.service.ts
async removeActivity(
  classroomId: string,
  activityId: string,
  userId: string
): Promise<void> {
  // 1. Validar que el aula existe
  const classroom = await this.findById(classroomId);
  
  // 2. Validar que el usuario es owner
  if (classroom.teacherId !== userId) {
    throw new ForbiddenException('Solo el docente puede quitar actividades');
  }
  
  // 3. Validar que la actividad existe y está en el aula
  const activity = await this.activityRepository.findOne({
    where: { id: activityId, classroomId }
  });
  
  if (!activity) {
    throw new NotFoundException('Actividad no encontrada en esta aula');
  }
  
  // 4. Opción elegida: Desactivar (soft delete)
  activity.isActive = false;
  await this.activityRepository.save(activity);
  
  // Alternativa: Desvincular
  // activity.classroomId = null;
  // await this.activityRepository.save(activity);
  
  // Alternativa: Eliminar completamente
  // await this.activityRepository.remove(activity);
}
```

---

## ⚠️ CU-27: Publicar Actividad - PARCIAL

### Estado: CAMPO EXISTE, FALTA ENDPOINT ⚠️

**Campo en entidad:**
```typescript
// activity.entity.ts línea 148-149
@IsBoolean({ message: 'isPublic debe ser un valor booleano' })
isPublic: boolean;
```

**Relación con biblioteca:**
```typescript
// activity.entity.ts línea 190-192
// Relación con biblioteca de actividades
@OneToMany('ActivityLibrary', (libraryEntry: any) => libraryEntry.originalActivity)
libraryEntries: any[];
```

**Análisis:**
- Campo `isPublic` existe pero no hay endpoint para cambiarlo
- Módulo `activity-library` existe
- Falta endpoint para "publicar" actividad (hacer pública)

### ❌ QUÉ FALTA IMPLEMENTAR:

#### 1. Endpoint para publicar actividad

**Ruta:** `PATCH /activities/:id/publish`

**Características:**
- Solo el creador de la actividad puede publicarla
- Cambiar `isPublic` de false a true
- Crear entrada en `activity-library` para hacerla visible
- Validar que la actividad esté completa (tenga contenido)
- Retornar actividad actualizada

**Implementación necesaria:**

```typescript
// activities.controller.ts
@Patch(':id/publish')
@ApiOperation({ summary: 'Publicar actividad a la biblioteca pública' })
@ApiResponse({
  status: 200,
  description: 'Actividad publicada exitosamente',
  type: Activity,
})
@ApiResponse({
  status: 403,
  description: 'Solo el creador puede publicar la actividad',
})
@ApiResponse({
  status: 400,
  description: 'La actividad no está completa o ya está publicada',
})
async publishActivity(
  @Param('id', ParseUUIDPipe) id: string,
  @Request() req,
): Promise<Activity> {
  return this.activitiesService.publishActivity(id, req.user.id);
}
```

**Servicio necesario:**

```typescript
// activities.service.ts
async publishActivity(activityId: string, userId: string): Promise<Activity> {
  // 1. Obtener actividad con relaciones
  const activity = await this.activityRepository.findOne({
    where: { id: activityId },
    relations: ['creator', 'classroom'],
  });
  
  if (!activity) {
    throw new NotFoundException('Actividad no encontrada');
  }
  
  // 2. Validar que el usuario es el creador
  if (activity.creatorId !== userId) {
    throw new ForbiddenException('Solo el creador puede publicar la actividad');
  }
  
  // 3. Validar que no esté ya publicada
  if (activity.isPublic) {
    throw new BadRequestException('La actividad ya está publicada');
  }
  
  // 4. Validar que la actividad esté completa
  if (!activity.content || activity.content.length === 0) {
    throw new BadRequestException('La actividad debe tener contenido para ser publicada');
  }
  
  // 5. Marcar como pública
  activity.isPublic = true;
  await this.activityRepository.save(activity);
  
  // 6. Crear entrada en biblioteca (si existe el módulo)
  // await this.activityLibraryService.addToLibrary(activity);
  
  this.logger.log(`✅ Actividad publicada: ${activity.id} por ${userId}`);
  
  return activity;
}
```

#### 2. Endpoint para despublicar (opcional)

**Ruta:** `PATCH /activities/:id/unpublish`

**Funcionalidad:** Revertir publicación (isPublic = false)

---

## 📊 Resumen de Acciones Requeridas

| CU | Título | Estado Actual | Acción Requerida | Prioridad | Complejidad |
|----|--------|---------------|------------------|-----------|-------------|
| CU-16 | Abandonar Aula | ✅ Completo | Ninguna | - | - |
| CU-11 | Modificar Avatar | ⚠️ Parcial | Crear endpoint + servicio | Alta | Media |
| CU-20 | Agregar Actividad a Aula | ❌ No existe | Crear endpoint + servicio | Media | Media |
| CU-22 | Quitar Actividad de Aula | ❌ No existe | Crear endpoint + servicio | Media | Baja |
| CU-27 | Publicar Actividad | ⚠️ Parcial | Crear endpoint + servicio | Alta | Baja |

---

## 🎯 Plan de Implementación Sugerido

### Fase 1: Endpoints Simples (30-45 min)

1. **CU-22: Quitar Actividad** ✅ Complejidad: Baja
   - Crear endpoint DELETE /classrooms/:id/activities/:activityId
   - Crear método removeActivity en classrooms.service
   - Soft delete (isActive = false) recomendado

2. **CU-27: Publicar Actividad** ✅ Complejidad: Baja
   - Crear endpoint PATCH /activities/:id/publish
   - Crear método publishActivity en activities.service
   - Cambiar isPublic a true

### Fase 2: Endpoints Medios (45-60 min)

3. **CU-20: Agregar Actividad** ⚠️ Complejidad: Media
   - Crear endpoint POST /classrooms/:id/activities
   - Crear método addActivity en classrooms.service
   - Validaciones de owner y permisos

4. **CU-11: Avatar** ⚠️ Complejidad: Media
   - Configurar FileInterceptor
   - Crear endpoint PATCH /users/profile/avatar
   - Integrar con files.service existente
   - Validaciones de tipo y tamaño

---

## 🔧 Dependencias Técnicas

### Para CU-11 (Avatar):

**Paquetes necesarios:**
```json
{
  "@nestjs/platform-express": "^10.0.0", // Para FileInterceptor
  "multer": "^1.4.5-lts.1"                // Para manejo de archivos
}
```

**Tipos:**
```bash
npm install -D @types/multer
```

**Configuración en app.module.ts:**
```typescript
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@Module({
  imports: [
    // ...otros imports
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/avatars',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
    }),
  ],
})
```

### Para los demás CU:

- ✅ Ya existe TypeORM configurado
- ✅ Ya existen servicios (classrooms, activities)
- ✅ Ya existen guards (JWT, Roles)
- ✅ Ya existe files.service (para avatar)

---

## ✅ Checklist de Implementación

### CU-22: Quitar Actividad

- [ ] Crear DTO si es necesario
- [ ] Agregar método en classrooms.service.ts
- [ ] Agregar endpoint en classrooms.controller.ts
- [ ] Agregar documentación Swagger
- [ ] Agregar validaciones de permisos
- [ ] Agregar logging
- [ ] Compilar y probar

### CU-27: Publicar Actividad

- [ ] Agregar método publishActivity en activities.service.ts
- [ ] Agregar endpoint en activities.controller.ts
- [ ] Agregar documentación Swagger
- [ ] Agregar validaciones (creador, completitud)
- [ ] Agregar logging
- [ ] Compilar y probar

### CU-20: Agregar Actividad

- [ ] Crear AddActivityToClassroomDto
- [ ] Agregar método en classrooms.service.ts
- [ ] Agregar endpoint en classrooms.controller.ts
- [ ] Agregar documentación Swagger
- [ ] Agregar validaciones de owner
- [ ] Agregar logging
- [ ] Compilar y probar

### CU-11: Avatar

- [ ] Configurar MulterModule
- [ ] Crear método updateAvatar en users.service.ts
- [ ] Agregar endpoint en users.controller.ts
- [ ] Configurar FileInterceptor
- [ ] Agregar validaciones (tipo, tamaño)
- [ ] Integrar con files.service
- [ ] Agregar documentación Swagger
- [ ] Compilar y probar

---

## 📝 Notas Finales

**Recomendaciones:**

1. **Implementar en orden de prioridad:**
   - CU-27 (Publicar) y CU-22 (Quitar) primero (más simples)
   - CU-20 (Agregar) después
   - CU-11 (Avatar) al final (requiere configuración adicional)

2. **Testing:**
  - Automatizar validaciones con Jest + Supertest
  - Verificar permisos (docente vs estudiante)
  - Cubrir validaciones de errores con asserts específicos

3. **Documentación:**
   - Mantener comentarios exhaustivos
   - Actualizar Swagger en cada endpoint
   - Documentar casos de error

4. **Principios SOLID:**
   - Mantener SRP en servicios
   - Validaciones en DTOs
   - Logging completo

---

**¿Deseas que implemente alguno de estos endpoints ahora?**

Puedo comenzar con el más simple (CU-22 o CU-27) para que veas el patrón, y luego continuar con los demás.
