# Base de Datos y Esquema

## Fuentes del esquema (orden de aplicación)
1. `acalud_schema.sql`
2. `acalud_schema_addendum.sql`
3. `_II`, `_III`, `_IV`, `_V` (se aplican en ese orden)

## Reglas de trazabilidad
- Ningún elemento del esquema se crea ni conserva sin una fila en la matriz de trazabilidad que lo respalde.
- Si encontrás algo sin respaldo → **NO LO BORRES**, repórtalo.
- El glosario efectivo es `docs/06-trazabilidad/`. Cita el CU que respalda cada tabla.

## Precedencia ante conflictos
- **Código ↔ Documentación:** Gana la documentación (`docs/casos-de-uso/`).
- **Esquema ↔ Caso de Uso:** Gana el Caso de Uso. El esquema se corrige.
- La documentación v1 (`docs/_archivo-v1/`) es material HISTÓRICO, NO vinculante para el código actual.