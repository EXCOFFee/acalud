# 🧪 Pruebas - CU-22 y CU-27 (Fase 1)

## 📋 Resumen de Implementación

### ✅ CU-22: Quitar Actividad de Aula
**Endpoint:** `DELETE /classrooms/:id/activities/:activityId`  
**Método del Servicio:** `removeActivity(classroomId, activityId, userId)`  
**Archivos Modificados:**
- `backend/src/modules/classrooms/classrooms.controller.ts` (línea ~298)
- `backend/src/modules/classrooms/classrooms.service.ts` (línea ~365)

**Funcionalidad:**
- ✅ Permite al docente propietario del aula quitar actividades
- ✅ Permite a administradores quitar actividades de cualquier aula
- ✅ Usa **soft delete** (isActive = false) en lugar de eliminación física
- ✅ Valida existencia de aula y actividad
- ✅ Valida que la actividad pertenezca al aula
- ✅ Respuesta: HTTP 204 No Content

---

### ✅ CU-27: Publicar Actividad en Biblioteca Pública
**Endpoint:** `PATCH /activities/:id/publish`  
**Método del Servicio:** `publishActivity(activityId, teacherId)`  
**Archivos Modificados:**
- `backend/src/modules/activities/activities.controller.ts` (línea ~242)
- `backend/src/modules/activities/activities.service.ts` (línea ~442)

**Funcionalidad:**
- ✅ Permite al creador publicar su actividad en la biblioteca pública
- ✅ Valida que el usuario sea el creador de la actividad
- ✅ Valida contenido completo (título, descripción, preguntas para quiz)
- ✅ Valida que tenga recompensas definidas
- ✅ Valida que la actividad esté activa
- ✅ Previene publicación duplicada
- ✅ Marca `isPublic = true`
- ✅ Respuesta: Actividad publicada con todos sus datos

---

## 🧪 Casos de Prueba

### **CU-22: Quitar Actividad de Aula**

#### ✅ Caso 1: Quitar actividad exitosamente (Docente propietario)
```bash
# Requisitos previos:
# - Tener un aula con ID conocido (ej: classroom-uuid)
# - Tener una actividad en esa aula (ej: activity-uuid)
# - Token JWT del docente propietario

curl -X DELETE \
  http://localhost:3000/api/classrooms/{classroom-uuid}/activities/{activity-uuid} \
  -H "Authorization: Bearer {token-docente}"

# Respuesta esperada:
# Status: 204 No Content
# Body: (vacío)
```

#### ✅ Caso 2: Quitar actividad como administrador
```bash
curl -X DELETE \
  http://localhost:3000/api/classrooms/{classroom-uuid}/activities/{activity-uuid} \
  -H "Authorization: Bearer {token-admin}"

# Respuesta esperada:
# Status: 204 No Content
```

#### ❌ Caso 3: Error - Docente sin permisos
```bash
curl -X DELETE \
  http://localhost:3000/api/classrooms/{classroom-uuid}/activities/{activity-uuid} \
  -H "Authorization: Bearer {token-otro-docente}"

# Respuesta esperada:
# Status: 403 Forbidden
# {
#   "statusCode": 403,
#   "message": "No tienes permisos para quitar actividades de esta aula",
#   "error": "Forbidden"
# }
```

#### ❌ Caso 4: Error - Aula no encontrada
```bash
curl -X DELETE \
  http://localhost:3000/api/classrooms/uuid-inexistente/activities/{activity-uuid} \
  -H "Authorization: Bearer {token-docente}"

# Respuesta esperada:
# Status: 404 Not Found
# {
#   "statusCode": 404,
#   "message": "Aula no encontrada",
#   "error": "Not Found"
# }
```

#### ❌ Caso 5: Error - Actividad no encontrada en el aula
```bash
curl -X DELETE \
  http://localhost:3000/api/classrooms/{classroom-uuid}/activities/uuid-inexistente \
  -H "Authorization: Bearer {token-docente}"

# Respuesta esperada:
# Status: 404 Not Found
# {
#   "statusCode": 404,
#   "message": "Actividad no encontrada en esta aula",
#   "error": "Not Found"
# }
```

#### ✅ Caso 6: Verificar soft delete (actividad marcada como inactiva)
```bash
# Después de quitar la actividad, verificar que isActive = false
curl -X GET \
  http://localhost:3000/api/activities/{activity-uuid} \
  -H "Authorization: Bearer {token-docente}"

# Respuesta esperada:
# Status: 200 OK
# {
#   "id": "activity-uuid",
#   "title": "...",
#   "isActive": false,  // <-- Debe ser false
#   ...
# }
```

---

### **CU-27: Publicar Actividad**

#### ✅ Caso 1: Publicar actividad exitosamente
```bash
# Requisitos previos:
# - Tener una actividad creada (ej: activity-uuid)
# - Actividad debe tener contenido completo y válido
# - Token JWT del docente creador

curl -X PATCH \
  http://localhost:3000/api/activities/{activity-uuid}/publish \
  -H "Authorization: Bearer {token-docente}" \
  -H "Content-Type: application/json"

# Respuesta esperada:
# Status: 200 OK
# {
#   "id": "activity-uuid",
#   "title": "Mi actividad educativa",
#   "description": "Descripción completa...",
#   "type": "quiz",
#   "difficulty": "medium",
#   "isPublic": true,  // <-- Ahora es true
#   "isActive": true,
#   "content": {
#     "questions": [...]
#   },
#   "rewards": {
#     "coins": 100,
#     "experience": 50
#   },
#   ...
# }
```

#### ❌ Caso 2: Error - Usuario no es el creador
```bash
curl -X PATCH \
  http://localhost:3000/api/activities/{activity-uuid}/publish \
  -H "Authorization: Bearer {token-otro-docente}"

# Respuesta esperada:
# Status: 403 Forbidden
# {
#   "statusCode": 403,
#   "message": "Solo el creador puede publicar esta actividad",
#   "error": "Forbidden"
# }
```

#### ❌ Caso 3: Error - Actividad ya publicada
```bash
# Intentar publicar una actividad que ya tiene isPublic = true
curl -X PATCH \
  http://localhost:3000/api/activities/{activity-uuid}/publish \
  -H "Authorization: Bearer {token-docente}"

# Respuesta esperada:
# Status: 400 Bad Request
# {
#   "statusCode": 400,
#   "message": "Esta actividad ya está publicada",
#   "error": "Bad Request"
# }
```

#### ❌ Caso 4: Error - Actividad sin contenido válido
```bash
# Intentar publicar una actividad con contenido vacío o incompleto
curl -X PATCH \
  http://localhost:3000/api/activities/{activity-incompleta-uuid}/publish \
  -H "Authorization: Bearer {token-docente}"

# Respuesta esperada:
# Status: 400 Bad Request
# {
#   "statusCode": 400,
#   "message": "La actividad debe tener contenido definido",
#   "error": "Bad Request"
# }
```

#### ❌ Caso 5: Error - Quiz sin preguntas
```bash
# Intentar publicar un quiz que no tiene preguntas
curl -X PATCH \
  http://localhost:3000/api/activities/{quiz-sin-preguntas-uuid}/publish \
  -H "Authorization: Bearer {token-docente}"

# Respuesta esperada:
# Status: 400 Bad Request
# {
#   "statusCode": 400,
#   "message": "Un quiz debe tener al menos una pregunta para ser publicado",
#   "error": "Bad Request"
# }
```

#### ❌ Caso 6: Error - Actividad inactiva
```bash
# Intentar publicar una actividad con isActive = false
curl -X PATCH \
  http://localhost:3000/api/activities/{activity-inactiva-uuid}/publish \
  -H "Authorization: Bearer {token-docente}"

# Respuesta esperada:
# Status: 400 Bad Request
# {
#   "statusCode": 400,
#   "message": "No se puede publicar una actividad inactiva",
#   "error": "Bad Request"
# }
```

#### ❌ Caso 7: Error - Título muy corto
```bash
# Actividad con título < 3 caracteres
curl -X PATCH \
  http://localhost:3000/api/activities/{activity-titulo-corto-uuid}/publish \
  -H "Authorization: Bearer {token-docente}"

# Respuesta esperada:
# Status: 400 Bad Request
# {
#   "statusCode": 400,
#   "message": "La actividad debe tener un título válido (mínimo 3 caracteres)",
#   "error": "Bad Request"
# }
```

#### ❌ Caso 8: Error - Descripción muy corta
```bash
# Actividad con descripción < 10 caracteres
curl -X PATCH \
  http://localhost:3000/api/activities/{activity-desc-corta-uuid}/publish \
  -H "Authorization: Bearer {token-docente}"

# Respuesta esperada:
# Status: 400 Bad Request
# {
#   "statusCode": 400,
#   "message": "La actividad debe tener una descripción válida (mínimo 10 caracteres)",
#   "error": "Bad Request"
# }
```

#### ❌ Caso 9: Error - Sin recompensas definidas
```bash
# Actividad sin campo rewards válido
curl -X PATCH \
  http://localhost:3000/api/activities/{activity-sin-rewards-uuid}/publish \
  -H "Authorization: Bearer {token-docente}"

# Respuesta esperada:
# Status: 400 Bad Request
# {
#   "statusCode": 400,
#   "message": "La actividad debe tener recompensas definidas",
#   "error": "Bad Request"
# }
```

---

## 🔍 Validaciones Implementadas

### **CU-22: Quitar Actividad**
| Validación | Código Estado | Mensaje |
|-----------|---------------|---------|
| Aula no encontrada | 404 | "Aula no encontrada" |
| Sin permisos (no owner ni admin) | 403 | "No tienes permisos para quitar actividades de esta aula" |
| Actividad no encontrada en aula | 404 | "Actividad no encontrada en esta aula" |
| **Éxito (soft delete)** | **204** | **(sin contenido)** |

### **CU-27: Publicar Actividad**
| Validación | Código Estado | Mensaje |
|-----------|---------------|---------|
| Actividad no encontrada | 404 | "Actividad no encontrada" |
| No es el creador | 403 | "Solo el creador puede publicar esta actividad" |
| Ya está publicada | 400 | "Esta actividad ya está publicada" |
| Título inválido (< 3 caracteres) | 400 | "La actividad debe tener un título válido (mínimo 3 caracteres)" |
| Descripción inválida (< 10 caracteres) | 400 | "La actividad debe tener una descripción válida (mínimo 10 caracteres)" |
| Sin contenido | 400 | "La actividad debe tener contenido definido" |
| Quiz sin preguntas | 400 | "Un quiz debe tener al menos una pregunta para ser publicado" |
| Sin recompensas | 400 | "La actividad debe tener recompensas definidas" |
| Actividad inactiva | 400 | "No se puede publicar una actividad inactiva" |
| **Éxito** | **200** | **Actividad con isPublic=true** |

---

## 📊 Logs del Sistema

Ambos métodos incluyen **logging exhaustivo** para debugging:

### **CU-22 Logs (removeActivity)**
```
[ClassroomsService] Verificando aula: {classroomId}
[ClassroomsService] Verificando permisos de usuario: {userId}
[ClassroomsService] Verificando existencia de actividad: {activityId}
[ClassroomsService] Marcando actividad como inactiva (soft delete)
[ClassroomsService] Actividad quitada exitosamente
```

### **CU-27 Logs (publishActivity)**
```
📢 [PUBLISH_ACTIVITY] Iniciando publicación de actividad: {activityId}
🔍 [VALIDATION] Buscando actividad: {activityId}
⚠️ [NOT_FOUND] Actividad no encontrada: {activityId}  // Si no existe
⚠️ [FORBIDDEN] Usuario {userId} intentó publicar actividad de otro docente  // Si no es creador
⚠️ [ALREADY_PUBLIC] Actividad ya está publicada: {activityId}  // Si ya publicada
✅ [VALIDATION] Validando contenido de la actividad
✅ [VALIDATION] Todas las validaciones pasaron correctamente
📢 [PUBLISH] Marcando actividad como pública
💾 [DATABASE] Guardando cambios en la base de datos
✅ [SUCCESS] Actividad publicada exitosamente en {duration}ms
📊 [ACTIVITY_INFO] ID: {id}, Título: {title}
```

---

## 🎯 Checklist de Pruebas

### CU-22: Quitar Actividad
- [ ] Docente propietario puede quitar actividades de su aula
- [ ] Administrador puede quitar actividades de cualquier aula
- [ ] Otro docente NO puede quitar actividades de aulas ajenas
- [ ] Estudiante NO puede quitar actividades
- [ ] Error 404 cuando aula no existe
- [ ] Error 404 cuando actividad no existe en el aula
- [ ] Soft delete: `isActive` cambia a `false`
- [ ] Actividad sigue existiendo en la base de datos
- [ ] Respuesta HTTP 204 No Content
- [ ] No se puede acceder a la actividad después de quitarla

### CU-27: Publicar Actividad
- [ ] Docente creador puede publicar su actividad
- [ ] Otro docente NO puede publicar actividades ajenas
- [ ] No se puede publicar la misma actividad dos veces
- [ ] Valida título mínimo 3 caracteres
- [ ] Valida descripción mínimo 10 caracteres
- [ ] Valida contenido no vacío
- [ ] Quiz requiere al menos una pregunta
- [ ] Valida recompensas definidas (coins, experience)
- [ ] No se puede publicar actividad inactiva
- [ ] `isPublic` cambia a `true` después de publicar
- [ ] Respuesta HTTP 200 con actividad completa
- [ ] Logs informativos en consola

---

## 🚀 Próximos Pasos

### Fase 2 - Endpoints Pendientes (Complejidad Media)
1. **CU-20: Agregar Actividad a Aula** - POST /classrooms/:id/activities
2. **CU-11: Modificar Avatar** - PATCH /users/profile/avatar (requiere multer)

### Sugerencias de Testing
- Priorizar la suite **Jest e2e** (`npm run test:e2e`)
- Documentar validaciones extra en **PRUEBAS_CU20_CU11.md**
- Utilizar **Thunder Client** solo para exploración manual puntual
- Validar **casos límite** y **edge cases**
- Probar con **múltiples roles** (teacher, student, admin)

---

## ✅ Estado de Compilación

```bash
npm run build  # ✅ EXITOSO - 0 errores
```

**Archivos modificados compilados sin errores:**
- ✅ classrooms.controller.ts
- ✅ classrooms.service.ts
- ✅ activities.controller.ts
- ✅ activities.service.ts

---

## 📝 Notas Técnicas

### Soft Delete vs Hard Delete
**Decisión:** Se implementó **soft delete** en CU-22 para:
- Mantener historial de actividades
- Permitir recuperación si fue error
- Mantener integridad referencial
- Facilitar auditorías

### Validaciones en Publicación
**Decisión:** Validaciones exhaustivas en CU-27 para:
- Garantizar calidad del contenido público
- Evitar actividades incompletas en biblioteca
- Asegurar que quizzes tengan preguntas
- Validar que tengan recompensas configuradas
- Prevenir publicación de actividades inactivas

---

**Fecha de Implementación:** 30 de septiembre de 2025  
**Desarrollador:** GitHub Copilot + Santi  
**Estado:** ✅ FASE 1 COMPLETADA
