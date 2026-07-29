# Instrucciones para Claude Code — Proyecto Acalud

## Antes de escribir código
- La documentación de tesis en docs/ es la FUENTE DE VERDAD. Ante conflicto código↔doc, gana la doc. docs/_archivo-v1/ es la documentación de la v1: material histórico, NO vinculante.
- El modelo de datos objetivo es docs/02-base-datos/acalud_schema.sql + acalud_schema_addendum.sql (se aplican en ese orden).
- Todo cambio de comportamiento de un endpoint exige actualizar el contrato OpenAPI EN EL MISMO COMMIT. Ruta interina (contrato de la v1, en español): docs/_archivo-v1/02-arquitectura/2.4-contratos/openapi.yaml. Tras la Fase 2 del refactor pasa a docs/06-contratos/openapi.yaml, regenerado en inglés.
- Consultá el ADR relevante antes de decisiones estructurales: los ADR-001..006 viven en docs/_archivo-v1/02-arquitectura/2.2-adrs/ y describen decisiones de implementación VIGENTES (hexagonal, transporte dual, outbox, hosting). NO tomes decisiones de arquitectura nuevas: si algo no está decidido, PREGUNTÁ.

## Reglas de arquitectura (ADR-002) — inviolables
- Regla de dependencias: domain no importa nada de infrastructure. El linter lo verifica; si falla, está mal el código, no el linter.
- Ningún módulo importa el domain/infrastructure de otro módulo. La comunicación entre bounded contexts es por eventos (platform/) o llamadas explícitas a application.
- Las transiciones de estado (order, assignment, poll, proposal) van por comandos de máquina de estados con guard WHERE status = :origin. PROHIBIDO UPDATE directo de la columna status.
- El cliente NUNCA envía precios ni totales. Todo cálculo es server-side.
- Toda operación con dinero/stock va en UNA transacción (Unit of Work): commit total o rollback total.

## Infraestructura documentada (addendum del esquema)
- Las tablas processed_payments, outbox_emails, stock_movements y sessions (docs/02-base-datos/acalud_schema_addendum.sql) implementan requerimientos no funcionales documentados: RNF-CU12-002 (idempotencia del pago), RF-CU12-006 (entrega del comprobante por correo), RNF-SIS-016 (auditoría de datos sensibles) y el objetivo de CU-03 (desvinculación del dispositivo). No pueden retirarse ni simplificarse sin una decisión explícita, aunque no aparezcan en las especificaciones funcionales.

## Seguridad (no negociable)
- Autorización por request y por propiedad (WHERE por sujeto). Recurso ajeno → 404. Ver tests @seguridad.
- Secretos SOLO en variables de entorno. NUNCA en el repo. El scanner de CI bloquea.
- Contraseñas con argon2id. Sesión OPACA con estado en el servidor (tabla sessions): el token se persiste hasheado, nunca en claro, y el cierre de sesión elimina el registro. Se conserva por sobre la lista de revocación del esquema base (addendum §4). Comparaciones en tiempo constante.
- Logs sin PII (identificadores opacos).

## Testing (ADR-002)
- Los tests de idempotencia/unicidad corren contra PostgreSQL REAL (Testcontainers). PROHIBIDO mockear la BD para esos tests.
- No mockear clases de dominio propias en tests unitarios.
- Un caso de uso no está "hecho" hasta que pasa su verificación: los flujos están en docs/casos-de-uso/ (34 especificaciones) y los criterios en docs/03-requisitos/ (RF-CU<nn>-<nnn> / RNF-CU<nn>-<nnn>).

## Estilo
- Nomenclatura en INGLÉS según el esquema en todo lo que aparece en docs/: tablas y columnas, rutas y contratos de la API, clases y entidades de dominio, tipos y enumeraciones. Lo interno (variables locales, métodos privados, comentarios, mensajes al usuario, nombres de archivos de test) puede quedar como está: no genera discrepancia con la documentación.
- El glosario efectivo es acalud_schema.sql + su addendum.
- Errores en formato RFC 9457 Problem Details con trace_id.
- Prohibido dangerouslySetInnerHTML. Validación de entrada con Zod en el borde.

## Flujo de trabajo
- PENDIENTE: el plan de tareas del refactor se define en la Fase 2 (mapeo español→inglés + plan por capas). Hasta entonces, trabajá por la unidad acordada con el usuario. Una tarea = una unidad revisable.
- Al terminar una tarea, ejecutá su gate (tests + lint + typecheck) ANTES de continuar.
- Si un gate falla dos veces con el mismo enfoque, PARÁ y pedí revisión humana. No entres en loop.
