# Arquitectura y ADRs (Vigentes)

## ADR-002: Arquitectura Hexagonal (INVIOLABLE)
- **Regla de dependencias:** `domain` NO importa nada de `infrastructure`. El linter lo verifica.
- **Comunicación entre módulos:** Por eventos (`platform/`) o llamadas explícitas a `application`.
- **Transiciones de estado:** Usar comandos de máquina de estados con `WHERE status = :origin`. PROHIBIDO UPDATE directo.
- **Facturación:** Cliente NUNCA envía precios ni totales. Cálculo 100% server-side.
- **Transacciones:** Toda operación con dinero/stock va en UNA transacción (Unit of Work). Commit total o rollback total.

## ADRs consultados previamente (docs/_archivo-v1/02-arquitectura/2.2-adrs/)
- ADR-001 a ADR-006 describen decisiones VIGENTES (hexagonal, transporte dual, outbox, hosting).
- **Regla:** NO tomes decisiones de arquitectura nuevas. Si algo no está decidido, PREGUNTA.

## Contratos OpenAPI
- Ruta interina (v1, español): `docs/_archivo-v1/02-arquitectura/2.4-contratos/openapi.yaml`
- Tras Fase 2 del refactor: `docs/06-contratos/openapi.yaml` (inglés, regenerado).
- **Regla:** Todo cambio de comportamiento de un endpoint exige actualizar el contrato EN EL MISMO COMMIT.

## Infraestructura documentada (Addendum del esquema)
- Tablas: `processed_payments`, `outbox_emails`, `stock_movements`, `sessions`.
- Implementan requisitos NO funcionales: RNF-CU12-002 (idempotencia), RF-CU12-006 (correo), RNF-SIS-016 (auditoría), CU-03 (desvinculación dispositivo).
- **Regla:** No pueden retirarse ni simplificarse sin decisión explícita.