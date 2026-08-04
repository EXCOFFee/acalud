# Pendientes post-frontend

Gaps encontrados durante la implementación del frontend (2026-08) que se decidió **no**
resolver ahora para no frenar el avance por los 34 CU, pero que quedan anotados para
retomar una vez que todo el frontend esté terminado. No borrar entradas al completarlas:
tacharlas y dejar el commit que las resolvió, para que quede historial.

## ~~B3 — CU-12 Checkout con redirect real a Mercado Pago~~ (resuelto, commits `a1feb71`/`08ccb00`)

~~`MercadoPagoFakeAdapter.crearPreferencia` devuelve `init_point:
https://fake.mercadopago.local/checkout/<pedido_id>` — un dominio que no existe. No hay
integración real todavía (diferido a "Etapa 3" desde antes de esta sesión, ver ADR-006).~~

~~**Falta:** adapter real de Mercado Pago — Checkout Pro (crear preferencia real) + webhook
firmado (reemplaza `POST /webhooks/mercadopago` fake). Es trabajo de backend, no una unidad
chica de frontend.~~

Resuelto: `MercadoPagoAdapter` real (Checkout Pro vía `fetch`, sin SDK) + webhook con
verificación de firma HMAC-SHA256 real (`platform/security/mp-webhook-signature.ts`). La nota
"es trabajo de backend, no una unidad chica de frontend" resultó **incorrecta** al implementarlo:
el checkout de `/checkout` y `/institucion/checkout` tenía botones fake ("Pagar
aprobado"/"Simular rechazo") que nunca usaban el `init_point` — hubo que reemplazarlos por el
redirect real + una página nueva `/checkout/resultado` con polling (RNF-005/A6). También se
persisten `orders.payment_preference_id`/`payment_id_mp` (poscondiciones del CU, nunca
migrados pese a estar documentados en `docs/02-base-datos`; migración `0018`).

## ~~D6 — CU-31 Reporte de uso institucional / CU-32 Exportar reporte~~ (resuelto, commits `47a8b44`/`423e8aa`/`fadaa8e`/`bbfae32`/`3f19b01`)

~~El backend actual (`ver-reporte-institucional.ts` / `exportar-reporte.ts`) es un `GROUP BY`
simple con export a CSV. El CU pide bastante más.~~

~~**Falta:**~~
~~- Gráficos: sesiones por juego (barras), satisfacción promedio por juego (barras/puntos),
  evolución temporal de sesiones (líneas).~~
~~- Nube de palabras de aprendizajes clave (frecuencia de términos).~~
~~- Export a PDF (con gráficos) y Excel (multi-hoja: resumen, sesiones, docentes, juegos,
  aprendizajes) — hoy solo existe CSV tabular.~~

Resuelto en 5 unidades chicas (2 backend de agregación, 2 backend de export, 1 frontend). Al
releer el CU-31 completo apareció un gap que este resumen no mencionaba: los modales de detalle
de juego/docente (A8/A9) — se incluyeron. `game_sessions.teacher_satisfaction`/`key_learnings`
ya existían desde CU-29 (migración `0014`), así que no hizo falta ninguna migración nueva, solo
agregación (`kpisReporte`, `serieTemporalReporte`, `nubeDePalabras` — tokenización propia, sin
librería de NLP) y dos endpoints de detalle nuevos. Gráficos: SVG/CSS de mano, mismo criterio
que D7 (sin librería de charts — la única opción con instalaciones serias, `antvis/chart-
visualization-skills`, llama a una API externa para renderizar, no encaja). Export: `exceljs`
(Excel real, reemplaza el CSV placeholder) y `pdfkit` (PDF con gráficos dibujados como vectores
propios, sin Puppeteer/headless-Chrome — riesgo de memoria en el free tier de Render). También
se agregó `InstitucionRepository.buscarNombre` (no existía ningún lookup de institución por id).

## D7 — CU-33 Dashboard pedagógico

El backend actual (`ver-dashboard-pedagogico.ts`) da 4 KPIs con variación % vs período
anterior, `serie_semanal`, `top_juegos` y `top_docentes` (top 5 cada uno), filtrado solo por
rango de fechas. El frontend de D7 los muestra con tarjetas + barras simples en CSS (sin
librería de gráficos). El CU pide mucho más.

**Falta:**
- Filtros adicionales: por juego, por docente, por nivel educativo (hoy `dashboardQuerySchema`
  solo acepta `desde`/`hasta`) — necesita ampliar `MetricasDashboard`/el repositorio.
- Interactividad: hover con detalle, click en una barra para filtrar en cascada, zoom en el
  gráfico de evolución temporal.
- Mapa de calor de uso por día de la semana / hora (no se registra hora de sesión hoy).
- Nube de palabras de aprendizajes clave.
- Distribución de satisfacción (1-5) y correlación duración/satisfacción.
- Export del dashboard a PDF (similar a CU-32).

## D8 — CU-24 Adquirir lote de juegos (B2B)

El backend soporta compra institucional reutilizando los mismos endpoints de carrito/checkout
personales vía `contexto` (institution_id) — sin motor de precios ni dirección propios para B2B.

**Falta:**
- Precarga de dirección de envío y datos de facturación institucionales en el checkout (RN-004/
  A10 del CU) — hoy el encargado tipea la dirección a mano cada vez, igual que en una compra
  personal. Requiere guardar una dirección institucional (no existe hoy; `RegistrarInstitucion`
  solo guarda el domicilio legal, no necesariamente el de envío) y precargarla en
  `POST /checkout`.
- Historial de compras institucionales distinguible: `GET /pedidos` (CU-05) devuelve tanto
  órdenes personales como B2B del mismo encargado sin ningún campo `order_type`/`institution_id`
  en `OrdenHistorial`/`DetalleOrdenHistorial` — no se pueden filtrar ni etiquetar visualmente en
  `/cuenta/pedidos`. RN-009 pide poder "seguir y consultar" el historial institucional
  específicamente.
- Facturación a nombre de la institución (RN-007, `billing_data` en `orders`) — no implementado;
  las órdenes B2B no llevan ningún dato de facturación distinto al de una compra personal.

## Bloque E — CU-14/16 Encuestas y CU-15 Propuestas

`nivel_educativo_id` (encuestas, `GET /polls?level_id=`) y `materia_id`/`nivel_educativo_id`
(propuestas, `POST /proposals`) son columnas uuid sin ningún endpoint público que devuelva
`{id, nombre}` de `levels`/`subjects` para armar un selector legible.

**Falta:**
- Un endpoint público de catálogo (`GET /levels`, `GET /subjects` o similar) para poder
  ofrecer el filtro por nivel en `/encuestas` y los selectores de materia/nivel opcionales en
  el formulario de `/propuestas` — hoy esos campos directamente no se piden/filtran desde el
  frontend.
- Mismo gap en `/admin/encuestas` (F5): el form de alta/edición nunca pide
  `nivel_educativo_id`, siempre manda `null`. Un solo endpoint de catálogo resolvería los tres
  casos (`/encuestas`, `/propuestas`, `/admin/encuestas`).

## F2 — CU-19 ABM Productos / CU-22 Descuento mayorista (admin)

`ProductosAdminRepositoryPg.listar()` trae un comentario que dice "el admin necesita ver los
inactivos para poder reactivarlos vía edición" — pero `actualizar()` (el `UPDATE` que corre al
guardar el form de edición) nunca toca la columna `is_active`. Es decir: el comentario describe
un comportamiento que el código no implementa. Confirmado leyendo ambos directamente antes de
construir el frontend de F2.

**Falta:**
- Forma de reactivar un producto desactivado — hoy `DELETE /admin/products/:id` (baja lógica)
  no tiene contraparte. El frontend de F2 no ofrece un botón "reactivar" porque no hay ningún
  endpoint que lo haga (ni siquiera `PUT` toca `is_active`). Requiere decidir el contrato: ¿un
  campo `activo` en el body de `PUT`, o un endpoint dedicado `POST .../reactivar`?
- Corregir o borrar el comentario desactualizado en `productos-admin.repository.pg.ts`.

## Notas generales

- Ninguno de estos ítems bloqueaba el resto del plan de frontend — se priorizó cubrir los 34
  CU con una versión honesta (sin inventar UI para datos que el backend no calcula) antes de
  invertir en gráficos avanzados/exportables.
- Antes de retomar cualquiera de estos, releer el CU original en `docs/casos-de-uso/` — esta
  lista es un resumen, no reemplaza la especificación completa.
