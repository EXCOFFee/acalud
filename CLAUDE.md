# Instrucciones para Claude Code — Proyecto Acalud

## Antes de escribir código
- La documentación en docs/ es la FUENTE DE VERDAD. Ante conflicto código↔doc, gana la doc.
- Todo cambio de comportamiento de un endpoint exige actualizar docs/02-arquitectura/2.4-contratos/openapi.yaml EN EL MISMO COMMIT.
- Consultá el ADR relevante antes de decisiones estructurales. NO tomes decisiones de arquitectura nuevas: si algo no está decidido, PREGUNTÁ.

## Reglas de arquitectura (ADR-002) — inviolables
- Regla de dependencias: domain no importa nada de infrastructure. El linter lo verifica; si falla, está mal el código, no el linter.
- Ningún módulo importa el domain/infrastructure de otro módulo. La comunicación entre bounded contexts es por eventos (platform/) o llamadas explícitas a application.
- Las transiciones de estado (pedido, membresía, encuesta, propuesta) van por comandos de máquina de estados con guard WHERE estado=:origen. PROHIBIDO UPDATE directo de la columna estado.
- El cliente NUNCA envía precios ni totales. Todo cálculo es server-side.
- Toda operación con dinero/stock va en UNA transacción (Unit of Work): commit total o rollback total.

## Seguridad (no negociable)
- Autorización por request y por propiedad (WHERE por sujeto). Recurso ajeno → 404. Ver tests @seguridad.
- Secretos SOLO en variables de entorno. NUNCA en el repo. El scanner de CI bloquea.
- Contraseñas con argon2id. Tokens opacos hasheados. Comparaciones en tiempo constante.
- Logs sin PII (identificadores opacos).

## Testing (ADR-002)
- Los tests de idempotencia/unicidad corren contra PostgreSQL REAL (Testcontainers). PROHIBIDO mockear la BD para esos tests.
- No mockear clases de dominio propias en tests unitarios.
- Un caso de uso no está "hecho" hasta que sus escenarios Gherkin de docs/01-requisitos pasan.

## Estilo
- Español en nombres de dominio (snake_case en BD, coincide con Glosario 0.2 y 2.3).
- Errores en formato RFC 9457 Problem Details con trace_id.
- Prohibido dangerouslySetInnerHTML. Validación de entrada con Zod en el borde.

## Flujo de trabajo
- Trabajá por tarea del plan (docs/05-implementacion/5.2). Una tarea = una unidad revisable.
- Al terminar una tarea, ejecutá su gate (tests + lint + typecheck) ANTES de continuar.
- Si un gate falla dos veces con el mismo enfoque, PARÁ y pedí revisión humana. No entres en loop.
