# ADR-002 · Estilo arquitectónico: monolito modular hexagonal (Ports & Adapters)

| Campo | Valor |
|---|---|
| **Estado** | ✅ Aceptada (2026-07-04) |
| **Decide** | Estructura del backend, regla de dependencias, patrones de implementación, concurrencia y testing |
| **Trazabilidad** | R-01, R-05, NFR-C, checklist de lote de 1.1-B, artefactos 15/16/17 del catálogo |

## Contexto

Un solo desarrollador + agente, un solo servicio always-on disponible en el free tier
(ADR-005), tres integraciones externas con fallback obligatorio, y un flujo transaccional
crítico (CU-012/024) con exigencias explícitas de atomicidad e idempotencia.

## Decisión

**Monolito modular en NestJS (Node/TypeScript)** con arquitectura **Hexagonal / Ports &
Adapters (Cockburn)** y módulos alineados a los bounded contexts (2.3).

**Regla de dependencias (explícita y verificable por linter):**
`domain` no importa nada externo → `application` (casos de uso/commands) importa solo
`domain` → `infrastructure` (adapters) importa `application`/`domain`. Los **puertos**
(interfaces) viven en `domain`/`application`; los **adapters** los implementan:
*primarios/driving* (controllers REST, scheduler de jobs) y *secundarios/driven*
(repositorios PostgreSQL, MP, MiCorreo, ARCA, email, storage).

**Patrones de implementación adoptados (con su porqué):**

| Patrón | Dónde | Por qué |
|---|---|---|
| Repository | Interfaces en dominio, implementación PG en infra | El dominio nunca importa el ORM |
| Unit of Work | Un comando = una transacción | Sin esto, el checklist de fallo parcial de CU-012 es imposible de garantizar |
| Saga State Machine | Pedido, Membresía, Propuesta, Encuesta | Transiciones válidas como tabla + comandos; nunca `UPDATE estado` directo (regla de 1.1-B) |
| Strategy | Contexto de compra personal / institucional | CU-024 reusa CU-012 sin duplicar el flujo |
| Outbox | Emails (CU-E05) y eventos de dominio | El evento/email se escribe en la MISMA transacción que el cambio de estado |
| Idempotency Handler | Webhook MP | `payment_id` con UNIQUE en la tabla de pagos procesados (CU-012 E1) |
| Decorator | Retry con backoff+jitter y circuit breaker sobre adapters externos | Resiliencia sin ensuciar los adapters (CU-011 A1) |
| Factory | Pedido (no existe sin líneas), Sesión de uso | Invariantes de construcción del Aggregate |

**Control de concurrencia por Aggregate (declarado, no implícito):**

| Aggregate | Mecanismo | Anomalía que previene |
|---|---|---|
| Stock | Decremento condicional atómico: `UPDATE ... SET cantidad = cantidad - :n WHERE id = :id AND cantidad >= :n`, verificando filas afectadas; rollback total si alguna línea afecta 0 | **Lost Update** entre ventas concurrentes; la transacción multi-línea previene el descuento parcial |
| Pedido | Guard de máquina de estados: `UPDATE ... WHERE estado = :origen` | Transiciones dobles/concurrentes (cancelar dos veces, webhook duplicado) |
| Membresía / Encuesta / Propuesta | Ídem guard de estado + UNIQUE de negocio (docente+encuesta; email+institución vigente) | Duplicación por reintento |
| Resto | Optimistic implícito del ORM; contención esperada ≈ nula (NFR-C2) | — |

Aislamiento: `READ COMMITTED` por defecto; las invariantes críticas se protegen con los
guards condicionales de arriba, no subiendo el aislamiento global (Serializable tiene costo
de throughput que NFR-C no justifica). Si en 3.2 la interrogación de fallo detecta un Write
Skew real, se sube a Serializable **solo ese comando**, con la evidencia.

**Modelo de errores:** jerarquía de Domain Exceptions (`VALIDATION` / `BUSINESS_RULE` /
`INVARIANT`, retryable sí/no) + respuestas HTTP en formato **RFC 9457 Problem Details** con
`traceId`. Infra transient (timeout, 5xx externo) → retry exponencial con full jitter;
permanent → propagación directa.

**Pirámide de testing (L2, proporciones objetivo):** 70 % unit (dominio puro, prohibido
mockear clases de dominio propias) · 20 % integración con **Testcontainers y PostgreSQL
real** (prohibida BD in-memory: difiere en constraints, índices y locking — y los tests de
idempotencia/UNIQUE de 1.1 lo exigen) · 5 % contract (OpenAPI 2.4 como fuente) · 5 % E2E
(≤ 15 flujos, los de CE-01) + performance k6 (NFR-C2) con thresholds como criterio de fallo.

## Alternativas consideradas y descartadas (≥3)

| Alternativa | Razón de descarte cuantificada |
|---|---|
| **Microservicios** | Render free = 750 h/mes ≈ **un** servicio always-on; N servicios exigen N instancias con N cold starts y horas que no existen. Complejidad operativa (red, contratos, observabilidad distribuida) sin beneficio: NFR-C2 es 5 RPS. Riesgo de *Distributed Monolith* con un solo dev. |
| **Serverless functions puro** | El outbox worker, los jobs (expiración PC-03, keep-alive) y el cliente SOAP con certificados (ARCA) requieren proceso persistente o cron pago; timeouts free (~10 s) rozan NFR-L7; cold starts se multiplican por función. |
| **Monolito en capas sin puertos** | Las integraciones quedarían como `if` dispersos: los fallbacks testeables de CU-011/PC-06 y el análisis 4.1 dependen de que MiCorreo/ARCA/tabla/PDF sean adapters intercambiables. |

## Consecuencias

- ✅ Un deploy, una transacción de BD por comando, fallbacks testeables, y el camino de
  evolución que pediste ("esto irá escalando"): extraer un módulo a servicio = mover un
  bounded context detrás de sus puertos, no reescribir.
- ⚠️ Disciplina de fronteras entre módulos depende del linter de dependencias (se configura
  en 5.1); en un monolito la tentación de importar "de costado" existe — se bloquea por CI.

## Registro de cambios
| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 2026-07-04 | Decisión aceptada |
