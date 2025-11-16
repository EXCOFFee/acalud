# 🧪 Guía de Testing Automatizado con Jest - CU-20 y CU-11

## 📋 Resumen

Esta guía documenta cómo validar automáticamente los casos de uso:
- **CU-20:** Agregar Actividad a Aula
- **CU-11:** Modificar Avatar de Usuario

La verificación se ejecuta con **Jest + Supertest** mediante pruebas end-to-end que consumen la API real. El objetivo es reemplazar completamente los flujos manuales basados en Postman.

**Duración estimada:** 6-8 minutos  
**Backend URL en tests:** se levanta automáticamente sobre `http://localhost:0` dentro del runner  
**Scripts principales:**
- `npm run test:e2e -- --testPathPattern=communications/cu20-cu11.e2e-spec.ts`
- `npm run test:e2e` (para ejecutar toda la suite)

---

## 🚀 Paso 1: Preparar Entorno de Tests

1. **Instalar dependencias** (solo la primera vez):

   ```powershell
   cd C:\Users\santi\Downloads\acalud\backend
   npm install
   ```

2. **Definir variables de entorno para Jest** (opcional si ya existen):

   ```powershell
   copy .env.example .env.test
   # Ajusta valores mínimos: DB_TEST_URL, JWT_SECRET, STORAGE_PATH, etc.
   ```

3. **Ejecutar semillas si las pruebas las necesitan**:

   ```powershell
   # Base de datos de desarrollo (no es obligatorio para la suite e2e si usa fixtures propios)
   npm run seed
   ```

---

## 🧱 Paso 2: Estructura de las Pruebas Jest

Las pruebas viven en `backend/test/communications/cu20-cu11.e2e-spec.ts` y siguen este patrón:

- Se crea una instancia de Nest con `AppModule`.
- Se orquesta el login de usuario docente/estudiante mediante helpers.
- Se levantan fixtures para aulas, actividades y archivos de avatar dentro de la prueba.
- Cada escenario usa `supertest` para ejercer la API y validar respuestas HTTP y efectos secundarios (BD y archivos).

Directorio sugerido:

```
backend/test/communications/
  ├─ fixtures/
  │   ├─ avatar.factory.ts
  │   ├─ classroom.factory.ts
  │   └─ message.factory.ts
  ├─ helpers/
  │   ├─ auth.helper.ts
  │   └─ storage.helper.ts
  └─ cu20-cu11.e2e-spec.ts
```

> Si aún no existen los helpers/fixtures, créalos siguiendo la convención anterior para mantener las pruebas aisladas y repetibles.

---

## 🧪 Paso 3: Ejecutar la Suite

| Comando | Uso |
|---------|-----|
| `npm run test:e2e -- --testPathPattern=communications/cu20-cu11` | Ejecutar únicamente los casos CU-20 y CU-11 |
| `npm run test:e2e` | Ejecutar todos los tests end-to-end |
| `npm run test -- --runTestsByPath test/communications/cu20-cu11.e2e-spec.ts` | Ejecutar desde la suite general con configuración unificada |

Los tests levantan la aplicación una sola vez (`beforeAll`) y la cierran al finalizar (`afterAll`). Se recomienda correrlos en una base exclusiva (por ejemplo `acalud_testing`) para evitar efectos en datos reales.

---

## ✅ Cobertura Automatizada

### CU-20 – Classroom Activities

| Escenario | Nivel | Test Jest | Expectativa |
|-----------|-------|-----------|-------------|
| Agregar actividad como docente propietario (E2E) | E2E | `agrega una actividad al aula cuando el docente es propietario y la actividad es valida` | HTTP 201, actividad queda asociada en BD |
| Agregar actividad como docente propietario (Unit) | Unit | `permite al docente propietario agregar una actividad activa que creó` | Actividad asignada en memoria y persistencia simulada |
| Agregar actividad como administrador | Unit | `permite a un administrador agregar una actividad que no creó` | Acepta admin y retorna aula con actividad |
| Usuario sin permisos | E2E | `rechaza la solicitud si el docente no es propietario ni administrador` | HTTP 403 con mensaje de permiso |
| Aula inexistente | E2E | `retorna 404 cuando el aula no existe` | HTTP 404 con mensaje `Aula no encontrada` |
| Actividad duplicada / inactiva / ajena | Unit | Casos `ConflictException`, `BadRequestException`, `ForbiddenException` | Se rechaza cada escenario con el error correspondiente |

> Próximo paso: incorporar un camino E2E feliz para CU-20 creando actividades reutilizables desde fixtures o librería una vez definido su flujo en base de datos.

### CU-11 – Avatar Upload

| Escenario | Nivel | Test Jest | Expectativa |
|-----------|-------|-----------|-------------|
| Subida y reemplazo de avatar | E2E | `permite subir y reemplazar un avatar válido` | HTTP 200, almacena nuevo archivo y limpia el anterior |
| Tipo MIME inválido | E2E | `rechaza archivos con tipos MIME no permitidos` | HTTP 400 sin archivos en disco |
| Solicitud sin archivo | E2E | `requiere enviar un archivo de imagen` | HTTP 400 con mensaje claro |
| Usuario inexistente / tamaño excedido | Unit | `lanza NotFoundException si el usuario no existe`, `lanza BadRequestException si el archivo excede el limite de 2MB` | Errores controlados y limpieza de archivos |
| Limpieza de avatar anterior | Unit | `elimina avatar previo cuando existe` | Elimina archivo previo en disco simulado |

Cada prueba valida también los efectos secundarios en disco mediante helpers que inspeccionan `uploads/avatars` dentro de un directorio temporal.

---

## 🧩 Paso 4: Desarrollo de Pruebas

1. **Crear fixtures reutilizables:** usa factories para usuarios, aulas y actividades. Evita depender de seeds globales.
2. **Encapsular autenticación:** helper que invoque `/auth/register` o use `AuthService` para obtener `accessToken` sin repetir código.
3. **Simular archivos:** genera buffers en memoria (`faker.image`) o utiliza archivos pequeños dentro de `test/fixtures/files`.
4. **Verificar almacenamiento:** helpers para listar archivos generados y borrarlos al terminar (`afterEach`).
5. **Asegurar idempotencia:** cada test debe restaurar el estado inicial (rollback manual o reinicio de DB entre suites).

---

## 📊 Reportes y Debug

- Usa `npm run test:e2e -- --runInBand --detectOpenHandles` para depurar fugas.
- Para ver logs completos, habilita `process.env.LOG_LEVEL=debug` en `beforeAll`.
- Habilita cobertura: `npm run test:e2e -- --coverage --collectCoverageFrom="src/modules/**/!(*.module).ts"`.

Cuando una prueba falla, Jest muestra la petición/respuesta completa; complementa revisando los logs del backend en consola.

---

## 📚 Documentos Relacionados

- `backend/test/jest-e2e.json` – Configuración de Jest para tests end-to-end.
- `backend/test/README.md` (si existe) – Reglas de contribución a la suite.
- `PRUEBAS_CU20_CU11.md` – Qué validar funcionalmente; úsalo para saber qué asserts esperar en Jest.

---

## ✅ Buenas Prácticas

- Mantén la suite rápida (<10 min) ejecutando en paralelo donde sea seguro.
- No compartas estado entre escenarios; usa `beforeEach` con factories.
- Documenta cualquier helper nuevo dentro de `backend/test/communications/README.md`.
- Integra la suite a CI (GitHub Actions) ejecutando `npm run test:e2e` en cada pull request.

---

**Fecha:** 29 de octubre de 2025  
**Responsable:** GitHub Copilot + Santi  
**Estado:** ✅ Lista para pruebas automatizadas

---

**Ejecuta las pruebas y deja que Jest haga el trabajo repetitivo. 🚀**
