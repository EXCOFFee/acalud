# Tests de integración (Testcontainers + PostgreSQL real)

Acá viven los tests de integración de la API (ADR-002, ~20 % de la pirámide): repositorios,
**constraints**, **idempotencia** (`payment_id`), **IDOR** (recurso ajeno → 404) y
transacciones multi-línea.

**Regla dura:** corren contra **PostgreSQL real** vía Testcontainers. Prohibido mockear la BD
para estos tests (difiere en constraints, índices y locking; los tests de unicidad/idempotencia
de 1.1 lo exigen).

> Estado: se agregan a partir de la **tarea 0.2** (migración inicial con constraints). Hasta
> entonces el job `test:integration` corre con `--passWithNoTests` porque todavía no hay
> features ni esquema que verificar. En cuanto exista la primera suite, se quita ese flag.
