# 🧪 Pruebas - CU-20 y CU-11 (Fase 2)

## 📋 Resumen de Implementación

### ✅ CU-20: Agregar Actividad a Aula
**Endpoint:** `POST /classrooms/:id/activities`  
**Método del Servicio:** `addActivity(classroomId, activityId, userId)`  
**Archivos Modificados:**
- `backend/src/modules/classrooms/classrooms.module.ts` (importar Activity)
- `backend/src/modules/classrooms/classrooms.controller.ts` (línea ~295)
- `backend/src/modules/classrooms/classrooms.service.ts` (línea ~340)
- `backend/src/modules/classrooms/dto/add-activity.dto.ts` (nuevo)

**Funcionalidad:**
- ✅ Permite al docente propietario del aula agregar actividades
- ✅ Permite a administradores agregar actividades a cualquier aula
- ✅ Valida que la actividad exista y esté activa
- ✅ Previene duplicados en el aula
- ✅ Valida que el docente sea el creador o sea admin
- ✅ Valida que la actividad no pertenezca a otra aula
- ✅ Actualiza relación `classroomId` de la actividad
- ✅ Respuesta: HTTP 201 Created con aula actualizada

---

### ✅ CU-11: Modificar Avatar de Usuario
**Endpoint:** `PATCH /users/profile/avatar`  
**Método del Servicio:** `updateAvatar(userId, file)`  
**Archivos Modificados:**
- `backend/src/modules/users/users.module.ts` (configurar MulterModule)
- `backend/src/modules/users/users.controller.ts` (línea ~165)
- `backend/src/modules/users/users.service.ts` (línea ~298)
- `backend/src/modules/users/dto/update-avatar-response.dto.ts` (nuevo)

**Funcionalidad:**
- ✅ Permite al usuario autenticado subir avatar
- ✅ Valida tipo de archivo (JPG, PNG, WebP)
- ✅ Valida tamaño máximo 2MB
## 🛠️ Testing Automatizado (Jest)

Los flujos descritos anteriormente se validan ahora mediante la suite Jest E2E (`test/communications/cu20-cu11.e2e-spec.ts`). Ejecuta:

```powershell
npm run test:e2e -- --runTestsByPath test/communications/cu20-cu11.e2e-spec.ts
```

La validación cubre cada escenario de la checklist y reemplaza completamente los scripts manuales que existían en herramientas como Postman.
# {
#   "statusCode": 403,
#   "message": "No tienes permisos para agregar actividades a esta aula",
#   "error": "Forbidden"
# }
```

#### ❌ Caso 4: Error - Aula no encontrada
```bash
curl -X POST \
  http://localhost:3000/api/classrooms/uuid-inexistente/activities \
  -H "Authorization: Bearer {token-docente}" \
  -H "Content-Type: application/json" \
  -d '{
    "activityId": "{activity-uuid}"
  }'

# Respuesta esperada:
# Status: 404 Not Found
# {
#   "statusCode": 404,
#   "message": "Aula no encontrada",
#   "error": "Not Found"
# }
```

#### ❌ Caso 5: Error - Actividad no encontrada
```bash
curl -X POST \
  http://localhost:3000/api/classrooms/{classroom-uuid}/activities \
  -H "Authorization: Bearer {token-docente}" \
  -H "Content-Type: application/json" \
  -d '{
    "activityId": "uuid-inexistente"
  }'

# Respuesta esperada:
# Status: 404 Not Found
# {
#   "statusCode": 404,
#   "message": "Actividad no encontrada",
#   "error": "Not Found"
# }
```

#### ❌ Caso 6: Error - Actividad ya en el aula (duplicado)
```bash
# Intentar agregar la misma actividad dos veces
curl -X POST \
  http://localhost:3000/api/classrooms/{classroom-uuid}/activities \
  -H "Authorization: Bearer {token-docente}" \
  -H "Content-Type: application/json" \
  -d '{
    "activityId": "{activity-uuid-ya-agregada}"
  }'

# Respuesta esperada:
# Status: 409 Conflict
# {
#   "statusCode": 409,
#   "message": "Esta actividad ya está en el aula",
#   "error": "Conflict"
# }
```

#### ❌ Caso 7: Error - Actividad inactiva
```bash
# Intentar agregar una actividad con isActive = false
curl -X POST \
  http://localhost:3000/api/classrooms/{classroom-uuid}/activities \
  -H "Authorization: Bearer {token-docente}" \
  -H "Content-Type: application/json" \
  -d '{
    "activityId": "{activity-inactiva-uuid}"
  }'

# Respuesta esperada:
# Status: 400 Bad Request
# {
#   "statusCode": 400,
#   "message": "No se puede agregar una actividad inactiva",
#   "error": "Bad Request"
# }
```

#### ❌ Caso 8: Error - Actividad de otro docente
```bash
# Docente A intenta agregar actividad creada por Docente B
curl -X POST \
  http://localhost:3000/api/classrooms/{classroom-docente-a-uuid}/activities \
  -H "Authorization: Bearer {token-docente-a}" \
  -H "Content-Type: application/json" \
  -d '{
    "activityId": "{activity-creada-por-docente-b-uuid}"
  }'

# Respuesta esperada:
# Status: 403 Forbidden
# {
#   "statusCode": 403,
#   "message": "Solo puedes agregar actividades que tú hayas creado, o debes ser administrador",
#   "error": "Forbidden"
# }
```

#### ❌ Caso 9: Error - Actividad ya en otra aula
```bash
# Intentar agregar una actividad que ya pertenece a otra aula
curl -X POST \
  http://localhost:3000/api/classrooms/{classroom-1-uuid}/activities \
  -H "Authorization: Bearer {token-docente}" \
  -H "Content-Type: application/json" \
  -d '{
#   "statusCode": 400,
#   "message": "Tipo de archivo no permitido. Solo se aceptan: JPG, PNG, WebP",
#   "error": "Bad Request"
# }
```

#### ❌ Caso 7: Error - Tipo de archivo no permitido (GIF)
```bash
curl -X PATCH \
  http://localhost:3000/api/users/profile/avatar \
  -H "Authorization: Bearer {token-usuario}" \
  -F "avatar=@/path/to/animacion.gif"

# Respuesta esperada:
# Status: 400 Bad Request
# {
#   "statusCode": 400,
#   "message": "Tipo de archivo no permitido. Solo se aceptan: JPG, PNG, WebP",
#   "error": "Bad Request"
# }
```

#### ❌ Caso 8: Error - Archivo muy grande (> 2MB)
```bash
curl -X PATCH \
  http://localhost:3000/api/users/profile/avatar \
  -H "Authorization: Bearer {token-usuario}" \
  -F "avatar=@/path/to/imagen-3mb.jpg"

# Respuesta esperada:
# Status: 400 Bad Request
# {
#   "statusCode": 400,
#   "message": "El archivo es demasiado grande. Tamaño máximo: 2MB. Tamaño del archivo: 3.00MB",
#   "error": "Bad Request"
# }
```

#### ❌ Caso 9: Error - Usuario no encontrado
```bash
# Token de usuario que no existe en DB (caso raro)
curl -X PATCH \
  http://localhost:3000/api/users/profile/avatar \
  -H "Authorization: Bearer {token-usuario-inexistente}" \
  -F "avatar=@/path/to/imagen.jpg"

# Respuesta esperada:
# Status: 404 Not Found
# {
#   "statusCode": 404,
#   "message": "Usuario no encontrado",
#   "error": "Not Found"
# }
```

#### ✅ Caso 10: Verificar eliminación de avatar anterior
```bash
# 1. Verificar estado inicial
curl -X GET \
  http://localhost:3000/api/users/profile \
- [ ] Usuario puede subir PNG válido
- [ ] Usuario puede subir WebP válido
- [ ] Error 400 sin archivo
- [ ] Error 400 con PDF
- [ ] Error 400 con GIF
- [ ] Error 400 con archivo > 2MB
- [ ] Avatar anterior se elimina del disco
- [ ] Directorio ./uploads/avatars se crea automáticamente
- [ ] Nombre de archivo es único (timestamp + random)
- [ ] URL se guarda correctamente en BD
- [ ] Cleanup funciona en caso de error
- [ ] Respuesta incluye URL del nuevo avatar

---

## 🛠️ Ejecución con Jest

### Suite recomendada

```powershell
cd C:\Users\santi\Downloads\acalud\backend
npm run test:e2e -- --testPathPattern=communications/cu20-cu11
```

- Usa `npm run test:e2e` para validar toda la batería end-to-end.
- Añade `--runInBand` cuando depures interacciones con la base de datos.
- Exporta el reporte con `--json --outputFile=reports/cu20-cu11.json` si necesitas adjuntar evidencia.

### Qué revisar en la ejecución

| Escenario | Ruta | Expectativa |
|-----------|------|-------------|
| CU-20 feliz | `POST /classrooms/:id/activities` | HTTP 201 y la actividad aparece en el arreglo `activities` |
| CU-20 duplicado | `POST /classrooms/:id/activities` | HTTP 409 con mensaje `La actividad ya está asociada al aula` |
| CU-20 aula inexistente | `POST /classrooms/:id/activities` | HTTP 404 con mensaje `Aula no encontrada` |
| CU-20 sin permisos | `POST /classrooms/:id/activities` | HTTP 403 y no se modifica la BD |
| CU-11 feliz | `PATCH /users/profile/avatar` | HTTP 200, nuevo archivo en disco y URL actualizada |
| CU-11 archivo gigante | `PATCH /users/profile/avatar` | HTTP 400 sin archivos residuales en `uploads/avatars` |
| CU-11 tipo inválido | `PATCH /users/profile/avatar` | HTTP 400 y mensaje `Tipo de archivo no permitido` |

Para cada fallo, Jest muestra la petición en consola. Complementa inspeccionando los archivos generados en `backend/uploads/test/` si habilitas `STORAGE_PATH` temporal.

---

## 🎯 Tests Automáticos Sugeridos (Jest)

### CU-20: tests/e2e/classrooms.e2e-spec.ts
```typescript
describe('POST /classrooms/:id/activities', () => {
  it('should add activity to classroom successfully', async () => {
    const response = await request(app.getHttpServer())
      .post(`/classrooms/${classroomId}/activities`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ activityId })
      .expect(201);

    expect(response.body.activities).toContainEqual(
      expect.objectContaining({ id: activityId })
    );
  });

  it('should return 409 if activity already in classroom', async () => {
    await request(app.getHttpServer())
      .post(`/classrooms/${classroomId}/activities`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ activityId })
      .expect(409);
  });
});
```

### CU-11: tests/e2e/users.e2e-spec.ts
```typescript
describe('PATCH /users/profile/avatar', () => {
  it('should upload avatar successfully', async () => {
    const response = await request(app.getHttpServer())
      .patch('/users/profile/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', './test-files/avatar.jpg')
      .expect(200);

    expect(response.body.avatar).toMatch(/\/uploads\/avatars\/avatar-\d+-\d+\.jpg/);
  });

  it('should return 400 for large files', async () => {
    await request(app.getHttpServer())
      .patch('/users/profile/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', './test-files/large-image.jpg')
      .expect(400);
  });
});
```

---

## ✅ Estado de Compilación

```bash
npm run build  # ✅ EXITOSO - 0 errores
```

---

**Fecha de Documentación:** 30 de septiembre de 2025  
**Desarrollador:** GitHub Copilot + Santi  
**Estado:** ✅ LISTO PARA PRUEBAS
