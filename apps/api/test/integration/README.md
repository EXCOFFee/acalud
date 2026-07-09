# Tests de integración (Testcontainers + PostgreSQL real)

Tests de integración de la API (ADR-002, ~20 % de la pirámide): **constraints**,
**idempotencia** (`payment_id`), unicidad, append-only y —a futuro— repos, IDOR y
transacciones multi-línea.

**Regla dura:** corren contra **PostgreSQL real** vía Testcontainers (`postgres:16-alpine`).
Prohibido mockear la BD (difiere en constraints, índices y locking; los tests de
unicidad/idempotencia de 1.1 lo exigen). **Requieren Docker** (local o CI).

- Se corren con `pnpm --filter @acalud/api test:integration` (config `vitest.integration.config.ts`).
- El harness (`helpers/postgres.ts`) levanta el contenedor y aplica `infra/migrations/` con el
  runner (`src/platform/db/migrator.ts`). Que la migración inicial aplique sin error ya valida
  que "la BD levanta con todos los constraints" (Gate 0).

Convención de nombres: `*.integration.spec.ts` (los excluye la corrida unitaria).
