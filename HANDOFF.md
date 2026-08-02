# HANDOFF — Estado del proyecto Acalud (para el agente que continúa)

> **Última actualización:** 2026-08-02 (sesión nocturna — verificado contra el gate)
> **Regla de oro:** la fuente de verdad son los 34 CU de `docs/casos-de-uso/*.docx`. **NADA en `docs/` se modifica** (en especial los .docx). Ante conflicto código↔CU, gana el CU. Ni más ni menos que lo que dicen los CU.
> Este archivo se reescribe en cada checkpoint. El detalle fino está en `git status` / `git log`.

---

## 1. Cómo verificar (gate — correr ANTES de dar por hecha una tarea)

```bash
pnpm typecheck && pnpm lint && pnpm contract:lint && pnpm deps:boundaries
pnpm test:unit
pnpm --filter @acalud/api test:integration   # requiere Docker corriendo (Testcontainers + PostgreSQL real)
```

- **Estado del gate ahora: TODO EN VERDE** — typecheck ✓ lint ✓ contrato ✓ boundaries ✓ unit 27/27 ✓ **integración 89/89** ✓.
- Extracción de texto de .docx: script PowerShell (docx = zip → `word/document.xml` → cortar por `</w:p>` → sacar tags). Estaba en `$env:TEMP\docx-text.ps1`; recrearlo si no existe.

## 2. Estado CU por CU (verificado contra el código y el gate)

| CU | Estado |
|---|---|
| CU-01, 02, 03, 04 | **Hechos** (API+web+tests) |
| CU-10 carrito, CU-12 checkout | **Hechos** (API+web+tests; MP con adapter **fake**) |
| **CU-23 registrar institución** | **Hecho** (API+tests; SIN frontend) |
| **CU-25 inventario institucional** | **Hecho** (API+tests; SIN frontend) — `GET /instituciones/:id/inventario` + detalle A7 |
| **CU-26 asignar licencias** | **Hecho** (API+tests; SIN frontend) — `POST /instituciones/:id/asignaciones` |
| **CU-27 revocar licencias** | **Hecho** (API+tests; SIN frontend) — `POST /instituciones/:id/revocaciones` |
| CU-06 demo anónimo | Parcial (catálogo sí, ejecución demo no) |
| CU-11 envío | Parcial (fake dentro de checkout) |
| CU-22 descuento mayorista | Parcial (dominio sí, endpoint admin no) |
| **Todo lo demás (22 CU)** | Falta: CU-05, 07, 08, 09, 13, 14–21, 24, 28, 29–33, 34 |

**Próxima tarea: CU-28 (Ver docentes asignados)** — luego CU-24 (B2B) cierra la cadena institucional; después el resto.

## 3. Decisiones de diseño VIGENTES de la cadena institucional (leer antes de tocar)

- **CU-26 crea UNA FILA NUEVA por asignación** (no merge): RN-003/A2.5 leídos como "cada asignación es un registro".
- **CU-27 revoca sobre el AGREGADO FIFO**: `cantidad actual = SUM(quantity_assigned) activas` del (docente, producto); consume de la MÁS ANTIGUA primero; fila a 0 → `status='revoked'` + `revoked_at/revoked_by/revocation_reason`. **La fila revocada CONSERVA su quantity_assigned** (el CHECK exige > 0 y CU-28 necesita el historial de cuánto tenía). Nunca DELETE.
- **Concurrencia sin índice nuevo:** toda mutación toca primero la fila de `institutional_inventories` (CU-26: UPDATE con guard; CU-27: `SELECT ... FOR UPDATE` via `bloquearInventario`). Es el mutex por (institución, producto).
- **Notificación CU-26/27: doble vía** — `notifications` (dashboard) + `outbox_emails` (templates `licencia-asignada` y `licencia-revocada` en `platform/outbox/plantillas.ts`). El email NO puede tumbar la operación (A8/A9): va encolado.
- **Auditoría:** `audit_log` append-only. Acciones: `InstitucionRegistrada`, `InventarioConsultado`, `LicenciaAsignada`, `LicenciaRevocada`.
- **Migración 0016** (`institutional_assignments.notes varchar(500)`): respaldada por CU-26 p8/p12 (`observations`). Regla del proyecto: el esquema se corrige cuando un CU lo respalda.
- **Errores institucionales:** caller no admin → 404 (`SinPermisosDeEncargado`/`InventarioNoVisible`, nunca 403); regla de negocio → 422 (`DocenteNoVinculado`, `LicenciasInsuficientes`, `NivelEducativoInvalido`); unicidad → 409.
- **API en español** (contrato v1 interino): `POST /instituciones/:id/asignaciones`, body `{producto_id, asignaciones:[{docente_id, cantidad}], observaciones}`. `docente_id` = **user_id** del docente (la traducción usuario→membresía ocurre en el repo).
- **Contrato OpenAPI se actualiza EN EL MISMO cambio** (`docs/_archivo-v1/02-arquitectura/2.4-contratos/openapi.yaml`). Ya documentados: POST /instituciones (corregido al contrato real), GET inventario + detalle, POST asignaciones.

## 4. Trabajo sin commitear

**TODO el trabajo de CU-04, CU-23, CU-25, CU-26 y CU-27 está SIN COMMITEAR** (el usuario no autorizó commits). Si los autoriza: una unidad por CU o una sola feat institucional — preguntar. `HANDOFF.md` también sin commitear.

## 5. Pendientes NO de código (decisiones del usuario/equipo)

- Producción (Supabase) tiene sólo migraciones 0001–0003; las 0004–0016 están en local.
- Matriz F6 §8: elementos conservados sin respaldo esperan decisión de retiro.
- F6 §2: almacén de invitación pendiente (CU-23 A12.8b) vive en `institutional_teachers`; un addendum debe decidir. **CU-23 A12 (invitar docente) aún no está implementado** — es precondición indirecta de CU-26 A4 ("Invitar Docente").
- Adapters **fake**: Mercado Pago (CU-12), envíos (CU-11), comprobantes. Firma real de MP = Etapa 3.

## 6. Convenciones del código (resumen operativo)

- Hexagonal estricto (ADR-002): domain no importa infrastructure; UoW por módulo; dinero/stock en UNA transacción. Boundary check: `pnpm deps:boundaries`.
- AuthGuard + autorización por propiedad; recurso ajeno → 404; RFC 9457; Zod en el borde (`ZodValidationPipe`); uuid malformado → 404.
- Estados con máquina de estados y guard `WHERE status = :origin`. Cliente nunca envía precios/totales.
- Tests de integración con PostgreSQL real (Testcontainers). Patrón de seeding: ver `inventario.integration.spec.ts` / `asignaciones.integration.spec.ts` (helpers `docente()`, `institucionDe()`, `producto()`, `compraB2b()`…).
- Comentarios en español citando el CU (`// CU-27 RN-002: …`). Nombres de dominio/BD en inglés, API en español hasta Fase 2.
