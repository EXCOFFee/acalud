# ADR-006 · Puertos de integración: contratos, fallbacks y política de fallo

| Campo | Valor |
|---|---|
| **Estado** | ✅ Aceptada (2026-07-04) |
| **Decide** | Cómo el dominio habla con Mercado Pago, MiCorreo, ARCA y el email — y qué pasa cuando fallan |
| **Trazabilidad** | Visión §9, CU-011/012/013/024, CU-E05, NFR-O2, artefacto 4.1 |

## Decisión

Cuatro **puertos** definidos en el dominio; cada proveedor externo es un **adapter**
intercambiable por configuración de entorno. Regla absoluta heredada de ADR-002: el dominio
importa el puerto, jamás el SDK del proveedor.

| Puerto | Adaptadores | Selección | Fallback | Criticidad / modelo (5.2) |
|---|---|---|---|---|
| `PaymentProvider` | `MercadoPagoSandbox` | fija | **Sin fallback** (decisión de Visión §9: sin MP no hay demo de pago; el checkout informa indisponibilidad) | ★ Alta → Opus/Fable |
| `ShippingProvider` | `MiCorreoAdapter` · `TarifaLocalAdapter` | `SHIPPING_ADAPTER=micorreo\|tabla` + conmutación automática | Tabla local (peso×zona), conmutación por timeout PC-01, 5xx o circuit breaker abierto | Media → Sonnet, revisión humana |
| `ReceiptProvider` | `PdfInterno` · `ArcaHomologacion` (compuesto: PDF siempre; ARCA además, si está activo) | `RECEIPT_ARCA_ENABLED=true\|false` | PDF interno; reintentos ARCA PC-06 en outbox | ★ Alta (ARCA) → Opus/Fable |
| `EmailProvider` | `GmailApiAdapter` (HTTP/OAuth2, prod) · `SmtpAdapter` (Gmail/SMTP, solo local) · `ResendAdapter` (HTTP) · `EmailFakeAdapter` | `EMAIL_PROVIDER=gmail-api\|gmail\|smtp\|resend\|fake` | Cola outbox con reintentos PG-03 + panel de fallidos | Media → Sonnet |

## Contratos y detalles por adapter

**MercadoPagoSandbox (Checkout Pro):** crea preferencia con `external_reference =
pedido_id`; recibe **webhook** cuyo origen se verifica (firma/secreto) antes de procesar;
idempotencia por `payment_id` UNIQUE (ADR-002); los montos notificados se validan contra el
snapshot del pedido (CU-012, regla de monto). El sandbox usa credenciales de prueba y
usuarios/tarjetas ficticias.

**MiCorreoAdapter (REST, ambiente test):** autenticación por token (trámite P-02);
operaciones: cotizar (CU-011), consultar tracking (CU-013). **Circuit breaker**: 3 fallos
consecutivos → abierto 60 s → half-open; cada conmutación a `TarifaLocalAdapter` emite la
métrica NFR-O2. La `TarifaLocal` es una tabla versionada en el repo (peso×zona→precio) con
procedencia documentada (valores plausibles, ficticios, fechados).

**ArcaHomologacion (SOAP):** dos servicios — **WSAA** (login con certificado X.509: se firma
un TRA, se obtiene un Ticket de Acceso con vigencia ~12 h que se **cachea y renueva por
adelantado**) y **WSFEv1** (solicitud de CAE por comprobante, contra el endpoint de
homologación). Directivas: aislar TODO el XML/SOAP dentro del adapter; tests unitarios
contra fixtures XML grabados + una prueba de integración manual documentada contra
homologación real; los errores de ARCA se clasifican transient/permanent (ADR-002) — un
rechazo de esquema no se reintenta, un timeout sí. El certificado y la clave privada entran
por secretos de Render (ADR-005), jamás al repo.

**EmailProvider:** consumido solo por el worker del outbox (CU-E05). Elección resuelta:
**API HTTP de Gmail (OAuth2 con refresh token)** como proveedor de producción — envía desde la
propia casilla del usuario por HTTPS, gratis y a cualquier destinatario sin dominio propio, y
sin depender de dar de alta un tercero. Es HTTP, así que funciona desde Render, que **bloquea
el SMTP saliente** (25/465/587) en todos sus planes: por eso el `SmtpAdapter` (Gmail con App
Password) sirve en local pero da `Connection timeout` desde Render y queda como opción de
desarrollo. `ResendAdapter` (HTTP) también disponible, pero sin dominio verificado solo entrega
al dueño. Cambiar de proveedor = `EMAIL_PROVIDER` + credenciales, sin tocar el resto. Credenciales
(`GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN`, o `EMAIL_SMTP_*`) por secretos de
entorno, jamás al repo. En dev/tests, `EmailFakeAdapter` (no manda nada real).

## Política transversal de fallo (insumo directo de 4.1)

1. Toda llamada externa tiene **timeout explícito** (PC-01 para MiCorreo; 10 s MP; 15 s
   ARCA) — prohibido el timeout por defecto de la librería.
2. Retry **solo** en errores transient, con backoff exponencial + full jitter, máx. 3
   intentos síncronos; lo demás va a outbox (comprobantes, emails) o a fallback (cotización).
3. Cada conmutación/fallo emite métrica etiquetada por adapter (NFR-O2) — el análisis 4.1
   define umbrales de alerta sobre esas series.
4. **La demo no puede morir por un tercero:** invariante verificado en el checklist de modo
   demo (NFR-D5) apagando MiCorreo y ARCA por flag y comprobando que el flujo E2E completo
   sigue vivo.

## Alternativas consideradas y descartadas

| Alternativa | Razón |
|---|---|
| SDKs de proveedor usados directo desde los casos de uso | Acopla el dominio a terceros, imposibilita los fallbacks testeables y el recorte limpio de ARCA (válvula de Visión §9). |
| Un "IntegrationService" genérico único | God Object en formación: cuatro contratos con semánticas distintas (pago ≠ cotización ≠ comprobante ≠ email) no comparten interfaz honesta. |
| Agregador de envíos multi-correo | Innecesario para v1 (un correo + tabla); la evolución "agregar Andreani/OCA" ya está resuelta por el puerto. |

## Consecuencias

- ✅ El requisito de tesis (≥2 APIs) queda estructuralmente protegido: cualquier
  subconjunto de {MP, MiCorreo, ARCA} ≥ 2 mantiene la demo y la consigna.
- ✅ 4.1 (análisis de fallo) tiene acá su inventario exacto de dependencias y modos de falla.
- ⚠️ El adapter ARCA es el de mayor riesgo técnico del proyecto (SOAP + certificados +
  trámite): por eso está pre-asignado a modelo alto y tiene fallback total. Si P-02 no
  avanza, se recorta sin tocar nada más.

## Registro de cambios
| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 2026-07-04 | Decisión aceptada |
| 1.1.0 | 2026-07-12 | EmailProvider resuelto (5.1): SMTP/Gmail por defecto (gratis, entrega a cualquiera sin dominio) + ResendAdapter disponible + fake en dev/tests; selección por `EMAIL_PROVIDER` |
| 1.2.0 | 2026-07-12 | Render bloquea SMTP saliente (verificado en prod: `Connection timeout`) → API HTTP de Gmail (OAuth2) pasa a ser el proveedor de producción; SmtpAdapter/Gmail queda solo para local |
