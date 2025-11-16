# 📋 Cheat Sheet - Testing Automatizado (Jest)

## 🎯 Objetivo
Validar rápidamente los endpoints de **CU-20 (Agregar Actividad)** y **CU-11 (Modificar Avatar)** usando la suite automatizada con **Jest + Supertest**.

---

## ⚡ Quick Start (3 pasos)

### 1️⃣ Preparar entorno (3 min)
```powershell
cd C:\Users\santi\Downloads\acalud\backend
npm install           # solo la primera vez
copy .env.example .env.test -ErrorAction SilentlyContinue
```

### 2️⃣ Ejecutar suite focalizada (2 min)
```powershell
npm run test:e2e -- --testPathPattern=communications/cu20-cu11
```

### 3️⃣ Revisar resultados (5 min)
- Confirmar 15 tests en verde.
- Revisar logs clave en consola.
- Verificar archivos temporales en `uploads/test` si corresponde.

---

## 🔐 Setup controlado

| Paso | Acción | Resultado |
|------|--------|-----------|
| 1 | `npm run db:reset:test` (opcional) | BD limpia para e2e |
| 2 | `npm run seed:test` (si aplica) | Fixtures base listas |
| 3 | Exportar `STORAGE_PATH=uploads/test` | Almacena avatares en carpeta aislada |

> Consejo: agrega las variables anteriores en `.env.test` para no redefinirlas en cada ejecución.

---

## 📝 Cobertura CU-20 - `POST /classrooms/:id/activities`

| Escenario | Expectativa | Assert clave |
|-----------|-------------|--------------|
| Éxito docente propietario | 201 + actividad presente en respuesta | `expect(body.activities).toContainEqual(...)` |
| Duplicado | 409 + mensaje "La actividad ya está asociada" | `expect(status).toBe(409)` |
| Aula inexistente | 404 + mensaje `Aula no encontrada` | `expect(body.message).toMatch(/Aula no encontrada/)` |
| Sin permisos | 403 + sin cambios en base | Revisar que el aula conserve actividades originales |

Logs esperados:
```
[ClassroomsService] Verificando aula existe...
[ClassroomsService] Actividad agregada exitosamente
```

---

## 🖼️ Cobertura CU-11 - `PATCH /users/profile/avatar`

| Escenario | Expectativa | Assert clave |
|-----------|-------------|--------------|
| Subida válida JPG/PNG | 200 + URL nueva | `expect(body.avatar).toMatch(/\/uploads\//)` |
| Archivo grande (>2MB) | 400 sin archivo persistido | `expect(fs.existsSync(...)).toBe(false)` |
| Tipo inválido (PDF/GIF) | 400 con mensaje "Tipo de archivo" | `expect(body.message).toContain('Tipo de archivo')` |
| Reemplazo avatar | 200 + archivo anterior eliminado | Helper `storage.expectRemoved(previousPath)` |

Logs esperados:
```
🖼️ [UPDATE_AVATAR] Iniciando actualización...
✅ [SUCCESS] Avatar actualizado exitosamente
```

Revisión de archivos temporales:
```powershell
Get-ChildItem "C:\Users\santi\Downloads\acalud\backend\uploads\test\avatars"
```

---

## 🎯 Comandos útiles

- `npm run test:e2e -- --runInBand` → depurar sin paralelismo.
- `npm run test:e2e -- --detectOpenHandles` → localizar handles no liberados.
- `npm run test:e2e -- --json --outputFile=reports/cu20-cu11.json` → generar evidencia.
- `npm run test -- --runTestsByPath test/communications/cu20-cu11.e2e-spec.ts` → ejecutar dentro de configuración compartida.

---

## ✅ Checklist Rápido

### Antes de ejecutar
- [ ] Dependencias instaladas (`npm install`).
- [ ] `.env.test` con credenciales de BD.
- [ ] Servicio de base de datos accesible.

### Durante la prueba
- [ ] Suite e2e completó sin errores.
- [ ] Logs en consola confirman escenarios clave.
- [ ] Almacenamiento temporal limpio tras finalizar.

### Después
- [ ] Evidencia exportada si se requiere.
- [ ] Cambios revertidos (reset BD) si afectó datos locales.
- [ ] Archivos en `uploads/test` eliminados (`Remove-Item -Recurse`).

---

## 🆘 Troubleshooting

| Síntoma | Acción |
|---------|--------|
| `ECONNREFUSED :0` | Revisar si otra suite dejó el servidor abierto; reinicia tests con `--runInBand` |
| Timeout al obtener token | Verificar seeds y credenciales en fixture | 
| Directorio de uploads sucio | Ejecutar `Remove-Item .\uploads\test -Recurse` antes de rerun |
| Test de permisos falla | Asegura que helper asigne `teacherNoOwner` y que la BD esté limpia |

---

## 📚 Referencias

- `test/communications/cu20-cu11.e2e-spec.ts` – Casos end-to-end principales.
- `test/communications/helpers` – Helpers de autenticación y almacenamiento.
- `GUIA_TESTING_JEST.md` – Guía extendida (orientada a Jest).

---

**Backend:** http://localhost:3000  
**Swagger:** http://localhost:3000/api/docs  
**Suite oficial:** `npm run test:e2e -- --testPathPattern=communications/cu20-cu11`

---

**¡Ejecuciones repetibles y sin clicks manuales! 🚀**
