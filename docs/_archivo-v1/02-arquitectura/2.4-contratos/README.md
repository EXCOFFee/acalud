# 2.4 · Contratos de API — Convenciones

| Campo | Valor |
|---|---|
| **Artefacto** | 2.4 Contratos OpenAPI (spec: `openapi.yaml`, validada, 64 operaciones / 31 schemas) |
| **Versión** | 0.1.0 · **Fecha:** 2026-07-04 · **Estado:** 🟡 Borrador |
| **Rol** | Fuente de verdad de los contract tests (pirámide ADR-002); el backend se valida CONTRA la spec, no al revés |

## Convenciones (obligatorias para Claude Code)

1. **Versionado:** prefijo `/api/v1`. Cambios incompatibles → `/v2` (no previsto en alcance);
   los compatibles (campos nuevos opcionales) no versionan.
2. **Nombres:** recursos en plural y `snake_case` español, idénticos al Glosario 0.2 y al
   modelo de datos 2.3 — un término, un significado, en los tres niveles (doc, API, BD).
3. **Transiciones de estado como sub-recurso POST** (`/admin/pedidos/{id}/transiciones`,
   `/admin/encuestas/{id}/estado`), nunca `PATCH` del campo estado: refleja las máquinas de
   estado de ADR-002 (comandos, no updates).
4. **Errores:** RFC 9457 `application/problem+json` con `trace_id` en todos los no-2xx.
   Semántica fija: `401` sin sesión · `403` sin permiso (se audita) · `404` no existe **o no
   es tuyo** (IDOR-safe: nunca revelar existencia de recursos ajenos) · `409` conflicto de
   estado o idempotencia · `410` token vencido/consumido · `422` regla de negocio ·
   `423` cuenta bloqueada · `429` rate limit · `503` dependencia externa caída.
5. **Paginación:** `?pagina&tamanio` (máx. 50) → envelope `{ datos, paginacion }`.
6. **Idempotencia visible en el contrato:** `PUT` para favoritos, líneas de carrito y set de
   tramos (reemplazo total); el webhook es idempotente por `payment_id` (responde 200 al
   duplicado para frenar reintentos de MP).
7. **Autenticación dual (ADR-004):** ambos esquemas declarados (`cookieAuth` + `bearerAuth`);
   el middleware acepta cualquiera de los dos; los endpoints públicos declaran `security: []`.
8. **Archivos:** nunca URLs permanentes — siempre `POST` que emite enlace firmado PD-04.
9. **No filtrar inventario:** la ficha pública expone `stock_disponible: boolean`, jamás la
   cantidad (información competitiva/operativa).
10. **Contexto de compra:** parámetro `contexto` (institucion_id) activa la Strategy
    institucional (CU-024); su ausencia = personal. Autorización verificada por membresía+rol.

## Validación y contract testing (se instrumenta en 5.1)

- Lint de la spec en CI (Spectral o equivalente) — la spec rota rompe el build.
- Contract tests generados desde la spec (Schemathesis o equivalente) contra el backend
  levantado con Testcontainers: los 4xx/5xx deben ser Problem Details válidos.
- Regla de PR: cambiar un endpoint exige cambiar la spec en el mismo commit.

## Trazabilidad

Cada operación referencia su CU en el `summary`; los tags mapean 1:1 a bounded contexts
(2.3 §7). La columna "Componente" de la matriz 1.3 queda cubierta por la dupla
tag→BC de esta spec + propiedad de tablas de 2.3 §6.

## Registro de cambios
| Versión | Fecha | Cambio |
|---|---|---|
| 0.1.0 | 2026-07-04 | Spec inicial validada (64 operaciones) + convenciones |
