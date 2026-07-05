# Migraciones (SQL versionado)

Migraciones de la base de datos **escritas a mano en SQL** y versionadas (5.1 §1 / 5.3 §4).
La BD **nace con las defensas puestas**: los constraints críticos de
[2.3 §6](../../docs/02-arquitectura/2.3-dominio-y-datos.md) (UNIQUE de idempotencia
`payment_id`, UNIQUE parcial de membresías, `CHECK stock_actual >= 0`, permisos append-only
en auditoría/outbox/kardex, etc.) van en la **migración inicial**.

## Reglas (5.3 §4)

- Hacia adelante, versionadas, idempotentes donde se pueda.
- **Nunca editar una migración ya aplicada** — se agrega una nueva.
- Se aplican por script versionado (`infra/scripts/`) antes de habilitar tráfico, **nunca a mano**.
- Prisma es el query builder en runtime, pero **no** genera estas migraciones: el SQL manda
  (permite expresar constraints que el ORM no modela idiomáticamente).

> Estado: la **migración inicial** se crea en la **tarea 0.2** (Etapa 0). Este directorio
> está vacío a propósito hasta entonces.
