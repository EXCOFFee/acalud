# Base de Datos y Esquema

## Fuentes del esquema (orden de aplicación)
1. `acalud_schema.sql`
2. `acalud_schema_addendum.sql`
3. `_II`, `_III`, `_IV`, `_V` (se aplican en ese orden)

## Reglas de trazabilidad
- Ningún elemento del esquema se crea ni conserva sin una fila en la matriz de trazabilidad que lo respalde.
- Si encontrás algo sin respaldo → **NO LO BORRES**, repórtalo.
- El glosario efectivo es `docs/06-trazabilidad/`. Cita el CU que respalda cada tabla.

## Roles de base de datos (NFR-S6, migración 0020)
- **Dueño (`postgres`, `DIRECT_URL`)**: solo para correr migraciones (DDL). Nunca para la app.
- **App (`acalud_app`, `DATABASE_URL`)**: DML (SELECT/INSERT/UPDATE/DELETE), `BYPASSRLS`, sin DDL ni ownership. Sin UPDATE/DELETE en `audit_log` y `stock_movements`; sin DELETE en `outbox_emails`; sin acceso a `schema_migrations`.
- **Regla:** una tabla nueva hereda DML para `acalud_app` (default privileges). Si es append-only, su migración DEBE hacer el `REVOKE` correspondiente.
- La contraseña de `acalud_app` es un secreto: se fija por fuera (`ALTER ROLE ... PASSWORD`) y vive solo en las variables de entorno. Nunca en el repo.
- Los tests de integración ya corren la app con este rol (`helpers/app.ts`): si un endpoint necesita un permiso que no tiene, la suite falla.

## Precedencia ante conflictos
- **Código ↔ Documentación:** Gana la documentación (`docs/casos-de-uso/`).
- **Esquema ↔ Caso de Uso:** Gana el Caso de Uso. El esquema se corrige.
- La documentación v1 (`docs/_archivo-v1/`) es material HISTÓRICO, NO vinculante para el código actual.