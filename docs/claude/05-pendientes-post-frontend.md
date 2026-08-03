# Pendientes post-frontend

Gaps encontrados durante la implementación del frontend (2026-08) que se decidió **no**
resolver ahora para no frenar el avance por los 34 CU, pero que quedan anotados para
retomar una vez que todo el frontend esté terminado. No borrar entradas al completarlas:
tacharlas y dejar el commit que las resolvió, para que quede historial.

## B3 — CU-12 Checkout con redirect real a Mercado Pago

`MercadoPagoFakeAdapter.crearPreferencia` devuelve `init_point:
https://fake.mercadopago.local/checkout/<pedido_id>` — un dominio que no existe. No hay
integración real todavía (diferido a "Etapa 3" desde antes de esta sesión, ver ADR-006).

**Falta:** adapter real de Mercado Pago — Checkout Pro (crear preferencia real) + webhook
firmado (reemplaza `POST /webhooks/mercadopago` fake). Es trabajo de backend, no una unidad
chica de frontend.

## D6 — CU-31 Reporte de uso institucional / CU-32 Exportar reporte

El backend actual (`ver-reporte-institucional.ts` / `exportar-reporte.ts`) es un `GROUP BY`
simple con export a CSV. El CU pide bastante más.

**Falta:**
- Gráficos: sesiones por juego (barras), satisfacción promedio por juego (barras/puntos),
  evolución temporal de sesiones (líneas).
- Nube de palabras de aprendizajes clave (frecuencia de términos).
- Export a PDF (con gráficos) y Excel (multi-hoja: resumen, sesiones, docentes, juegos,
  aprendizajes) — hoy solo existe CSV tabular.

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

## Notas generales

- Ninguno de estos ítems bloqueaba el resto del plan de frontend — se priorizó cubrir los 34
  CU con una versión honesta (sin inventar UI para datos que el backend no calcula) antes de
  invertir en gráficos avanzados/exportables.
- Antes de retomar cualquiera de estos, releer el CU original en `docs/casos-de-uso/` — esta
  lista es un resumen, no reemplaza la especificación completa.
