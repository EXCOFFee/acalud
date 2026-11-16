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

## ~~D7 — CU-33 Dashboard pedagógico~~ (resuelto, commits `d619e50`/`b361390`/`545e0c5`)

~~El backend actual (`ver-dashboard-pedagogico.ts`) da 4 KPIs con variación % vs período
anterior, `serie_semanal`, `top_juegos` y `top_docentes` (top 5 cada uno), filtrado solo por
rango de fechas. El frontend de D7 los muestra con tarjetas + barras simples en CSS (sin
librería de gráficos). El CU pide mucho más.~~

~~**Falta:**~~
~~- Filtros adicionales: por juego, por docente, por nivel educativo (hoy `dashboardQuerySchema`
  solo acepta `desde`/`hasta`) — necesita ampliar `MetricasDashboard`/el repositorio.~~
~~- Interactividad: hover con detalle, click en una barra para filtrar en cascada, zoom en el
  gráfico de evolución temporal.~~
~~- Mapa de calor de uso por día de la semana / hora (no se registra hora de sesión hoy).~~
~~- Nube de palabras de aprendizajes clave.~~
~~- Distribución de satisfacción (1-5) y correlación duración/satisfacción.~~
~~- Export del dashboard a PDF (similar a CU-32).~~

Resuelto reutilizando gran parte de D6 (CU-31/32): `topJuegos`/`topDocentes` pasan a ser
`FilaReporteJuego[]`/`FilaReporteDocente[]` completos (con `tasaReutilizacion`, nueva, que
también benefició a CU-31) en vez de mantener dos queries paralelas casi iguales; nube de
palabras, evolución mensual y distribución de satisfacción reusan directo los métodos de D6.
Filtro por juego/docente agregado (nivel educativo queda afuera, no existe esa columna — mismo
gap que Bloque E). Recortes de alcance ya confirmados con el usuario: sin zoom por arrastre (JS
a mano sin librería de charts, poco valor); mapa de calor por hora reemplazado por "sesiones por
día de la semana" (`EXTRACT(ISODOW)` — la hora no se registra, `session_date` es `DATE`, no se
puede sin migrar CU-29); correlación duración/satisfacción afuera (ni aparece en las 9 secciones
visibles A-I del CU). Click-para-filtrar (A6) sí se implementó: tocar una barra de juego/docente
aplica ese filtro en cascada. Export Excel/PDF reutiliza los generadores de D6 (helpers de
dibujo extraídos a `pdf-primitivas.ts`) — mismo modal de exportación en ambas páginas
(`components/modal-exportar.tsx`, extraído para no duplicarlo).

## ~~D8 — CU-24 Adquirir lote de juegos (B2B)~~ (resuelto, commits `4b7c1d4`/`cec37d2`/`add7858`/`44c23db`/`9fa4f28`)

~~El backend soporta compra institucional reutilizando los mismos endpoints de carrito/checkout
personales vía `contexto` (institution_id) — sin motor de precios ni dirección propios para B2B.~~

~~**Falta:**~~
~~- Precarga de dirección de envío y datos de facturación institucionales en el checkout (RN-004/
  A10 del CU) — hoy el encargado tipea la dirección a mano cada vez, igual que en una compra
  personal. Requiere guardar una dirección institucional (no existe hoy; `RegistrarInstitucion`
  solo guarda el domicilio legal, no necesariamente el de envío) y precargarla en
  `POST /checkout`.~~
~~- Historial de compras institucionales distinguible: `GET /pedidos` (CU-05) devuelve tanto
  órdenes personales como B2B del mismo encargado sin ningún campo `order_type`/`institution_id`
  en `OrdenHistorial`/`DetalleOrdenHistorial` — no se pueden filtrar ni etiquetar visualmente en
  `/cuenta/pedidos`. RN-009 pide poder "seguir y consultar" el historial institucional
  específicamente.~~
~~- Facturación a nombre de la institución (RN-007, `billing_data` en `orders`) — no implementado;
  las órdenes B2B no llevan ningún dato de facturación distinto al de una compra personal.~~

Resuelto en 5 unidades chicas (3 backend, 2 frontend). Al leer el CU-24 completo (`.docx`) y
cruzarlo contra el código real (no el schema aspiracional) aparecieron dos correcciones al
resumen original: `orders.institution_id`/`order_type` ya existían y ya se llenaban desde el
checkout — el gap 2 era solo de lectura (`GET /pedidos` no los seleccionaba), no de escritura; y
`institutions.street/number/city/province/postal_code` son NULLABLE en la migración real (a
diferencia del esquema aspiracional), así que A10 (institución sin dirección configurada) es
alcanzable de verdad — resuelto sin construir una pantalla "Editar Institución": el checkout ya
tenía los 5 campos como inputs libres y `required`, así que si no hay domicilio cargado
simplemente no se precarga nada y el usuario completa a mano, igual que antes (patrón "redundant
entry", WCAG 3.3.7). Se agregó `InstitucionRepository.buscarDatosFacturacionEnvio` (expuesto en
`GET /instituciones/mine`), migración `0019` (`orders.billing_data jsonb`, RN-007, construido
server-side desde `institutions.legal_name`/`tax_id` — el cliente nunca lo manda), y
`order_type`/`institution_id`/`billing_data` sumados al read model de `GET /pedidos` (que no
tenía ningún test de integración; se creó uno nuevo). Frontend: precarga editable en
`/institucion/checkout` + aviso de a nombre de quién se factura, e insignia/filtro/detalle de
facturación en `/cuenta/pedidos`.

## ~~Bloque E — CU-14/16 Encuestas y CU-15 Propuestas~~ (resuelto, commits `9730b51`/`ad3792c`/`4eb3a34`/`d90c58f`)

~~`nivel_educativo_id` (encuestas, `GET /polls?level_id=`) y `materia_id`/`nivel_educativo_id`
(propuestas, `POST /proposals`) son columnas uuid sin ningún endpoint público que devuelva
`{id, nombre}` de `levels`/`subjects` para armar un selector legible.~~

~~**Falta:**~~
~~- Un endpoint público de catálogo (`GET /levels`, `GET /subjects` o similar) para poder
  ofrecer el filtro por nivel en `/encuestas` y los selectores de materia/nivel opcionales en
  el formulario de `/propuestas` — hoy esos campos directamente no se piden/filtran desde el
  frontend.~~
~~- Mismo gap en `/admin/encuestas` (F5): el form de alta/edición nunca pide
  `nivel_educativo_id`, siempre manda `null`. Un solo endpoint de catálogo resolvería los tres
  casos (`/encuestas`, `/propuestas`, `/admin/encuestas`).~~

Al investigar antes de implementar apareció una corrección importante al resumen original: el
backend de encuestas y propuestas ya estaba 100% listo (`GET /polls?level_id=` ya filtraba en SQL
y ya tenía test; `POST/PUT /admin/polls` y `POST /proposals` ya aceptaban y validaban
`nivel_educativo_id`/`materia_id` contra `levels`/`subjects`) — el gap real era únicamente el
endpoint de catálogo en sí, que no existía en ningún lado. Resuelto en 4 unidades: `GET /levels`/
`GET /subjects` (público, sin sesión, nuevo dentro del módulo `comunidad` — no `modules/catalogo`,
que es de e-commerce), filtro por nivel + insignia en `/encuestas`, selector de nivel en
`/admin/encuestas` (sin agregar columna "Nivel" a la tabla admin: el `GET /admin/polls` de listado
no expone ese campo hoy, y agregarlo era ampliar el alcance más allá del gap pedido), y
selectores opcionales de materia/nivel en `/propuestas`. El selector de nivel de
`/institucion/registrar` (`NIVELES_EDUCATIVOS`, texto hardcodeado) no sirvió de referencia: manda
nombre, no uuid.

## ~~F2 — CU-19 ABM Productos / CU-22 Descuento mayorista (admin)~~ (resuelto, commit `5d64dbe`)

~~`ProductosAdminRepositoryPg.listar()` trae un comentario que dice "el admin necesita ver los
inactivos para poder reactivarlos vía edición" — pero `actualizar()` (el `UPDATE` que corre al
guardar el form de edición) nunca toca la columna `is_active`. Es decir: el comentario describe
un comportamiento que el código no implementa. Confirmado leyendo ambos directamente antes de
construir el frontend de F2.~~

~~**Falta:**~~
~~- Forma de reactivar un producto desactivado — hoy `DELETE /admin/products/:id` (baja lógica)
  no tiene contraparte. El frontend de F2 no ofrece un botón "reactivar" porque no hay ningún
  endpoint que lo haga (ni siquiera `PUT` toca `is_active`). Requiere decidir el contrato: ¿un
  campo `activo` en el body de `PUT`, o un endpoint dedicado `POST .../reactivar`?~~
~~- Corregir o borrar el comentario desactualizado en `productos-admin.repository.pg.ts`.~~

Resuelto con un endpoint dedicado `POST /admin/products/:id/reactivar` (mismo patrón simétrico
que el `DELETE` ya existente, `ProductosAdminRepository.desactivar` ⇄ nuevo `.reactivar`) en vez
de un campo `activo` en el body de `PUT`: `PUT` reutiliza `productoAdminSchema` completo (CU-19
A1.5, "mismo que pasos 10-14"), así que forzar a reenviar el formulario entero solo para cambiar
un estado hubiera sido un contrato más pesado que la operación. Se corrigió el comentario
desactualizado en `listar()`. Frontend: botón "Reactivar" (variante `primario`, acción directa
sin modal de confirmación — a diferencia de "Desactivar", reactivar no es destructivo).

## Hallazgos al reescribir el contrato OpenAPI (2026-11, `docs/06-contratos/`)

Detectados leyendo el código para documentarlo; no se corrigieron porque esas unidades solo
documentan. El contrato los describe tal como se comportan HOY.

- **U1 · `PUT /me` (CU-04):** `nivel_educativo`/`materia` se resuelven por nombre contra
  `levels`/`subjects` con una subconsulta; si el texto no coincide se guarda `NULL` **sin
  error**. Debería responder 422 (o recibir el uuid de `GET /levels`/`GET /subjects`).
- **U1 · `GET /me`/`PUT /me`:** devuelven `membresias: []` fijo, con un comentario
  desactualizado ("BC7 Institucional aún no implementado"). La membresía real está en
  `GET /instituciones/mine`. Quitar el campo o llenarlo.
- **U1 · `POST /auth/cambio-correo/confirmar` (CU-34):** el mapeo de errores del controller
  no contempla que el correo nuevo haya sido tomado por otra cuenta entre la solicitud y la
  confirmación (violación de unicidad → probable 500). **Sin verificar con un test**:
  confirmar antes de corregir.
- ~~**U2 · ⚠️ PRIORITARIO · CU-09 inutilizable desde la UI**~~ — **resuelto**: la ficha usa
  `OpcionalAuthGuard` y `VerJuego` reutiliza `RecursosAutorizacionPort` (una consulta por
  ficha); tests unitarios + integración (anónimo, sin compra, pedido pendiente, pagado
  cookie/Bearer, coherencia con la descarga, sesión inválida). Sin cambios de frontend.
  Detalle original: `GET /catalogo/juegos/:id` calcula
  `recursos[].desbloqueado = !is_licensed` (`catalogo.repository.pg.ts`, comentario "el derecho
  real llega en la Etapa 2", nunca hecho) y el endpoint es público, sin mirar al usuario. La
  ficha (`app/catalogo/juego/page.tsx`) solo muestra "Descargar" si `desbloqueado` → un docente
  que COMPRÓ el juego (o tiene licencia asignada) nunca ve el botón de sus recursos
  licenciados, aunque `POST /catalogo/recursos/:id/descarga` sí lo autorizaría
  (`recursos-autorizacion.pg.ts`: orden paid/shipped/delivered o asignación activa).
  Arreglo probable: `OpcionalAuthGuard` en la ficha + reutilizar ese mismo chequeo. Visto por
  lectura de código, no probado en navegador.
- ~~**U4 · ⚠️ PRIORITARIO · el envío que se muestra NO es el que se cobra (CU-11 ↔ CU-12)**~~
  — **resuelto**: `IniciarCheckout` usa `CalcularEnvio` (misma cotización que la pantalla),
  cotizando FUERA de la transacción y releyendo el carrito adentro (huella juego:cantidad; si
  cambió → 422). Cotizador caído → 503. Se eliminó `ENVIO_FAKE`. Tests: unitario
  `iniciar-checkout.spec` (5) + integración (cobrado = cotizado, ambas modalidades). Sin
  cambios de frontend. Detalle original:
  `/checkout` (`iniciar-checkout.ts`) cobra `ENVIO_FAKE` fijo (home_delivery 3000,
  branch_pickup 1500), mientras la pantalla muestra la cotización de `POST /shipping/calculate`
  (en prod `SHIPPING_ADAPTER=tabla` → 700 + 300/kg, igual para ambas modalidades). Un juego de
  800 g se muestra a $1000 y se cobra a $3000. La decisión de "no tocar el checkout" (CU-11,
  2026-08) era razonable mientras la cotización no se mostraba; dejó de serlo al conectarla
  al checkout del frontend (B1). Visto por lectura de código.
- **U4 · `GET /pedidos/:id` y `/pedidos/:id/tracking`** no validan formato uuid (a diferencia
  del resto de controllers): un id malformado probablemente llega a PostgreSQL y termina en
  500 en vez de 404. Sin verificar con test.
- **U4 · Seguimiento con `SHIPPING_ADAPTER=tabla` (prod):** la tabla local no tiene tracking;
  un pedido despachado sin caché previa siempre responde 503.
- **U6 · ⚠️ DECISIÓN PENDIENTE (hueco de especificación, no bug de código) · las encuestas
  nunca se cierran:** `polls.status` admite `closed` y CU-16 habla de ver resultados de
  encuestas finalizadas, pero ninguna operación escribe `closed` (el toggle de CU-20 solo hace
  draft ↔ active, y no hay fecha de cierre ni job). El filtro "Cerradas" de `/encuestas`
  siempre está vacío. Definir con el CU cómo se cierra una encuesta (botón "Cerrar" del admin,
  fecha de fin, ambos) antes de implementar. Análisis con las citas de CU-16 (*"closed_at (si
  está finalizada)"*) y CU-20, y las tres opciones: matriz F6 §5.6.
- **U6 · Nombres de query params mezclados:** comunidad usa inglés (`status`, `search`,
  `order`, `level_id`) y compras/institucional español (`estado`, `orden`). Fase 2.
- ~~**U5 · `GET /docentes/me/sesiones-juego` sin validación de query**~~ — **resuelto
  (2026-11-16)**: `listadoSesionesQuerySchema` (Zod: `producto_id` uuid, `pagina` ≥ 1, `limite`
  1-100) + uuid del detalle → 404. Tests escritos ANTES del arreglo, vistos fallar: el
  comportamiento real era `producto_id` inválido → **500**, `limite=1000000` → 200 sin tope, y
  detalle con id inválido → **500**. Corrección a lo anotado acá: `pagina=abc` NO rompía (el
  repositorio caía en silencio a la página 1), ahora responde 422. Detalle original: era el
  único listado sin Zod — `pagina`/`limite` con `parseInt`, `limite` sin tope y `producto_id`
  sin validar uuid; tampoco se validaba el uuid de `GET /docentes/me/sesiones-juego/:id`.
- ~~**U5 · `POST /docentes/me/sesiones-juego` con juego no asignado** responde **403** con
  `title: "No encontrado"`~~ — **resuelto (2026-11-16)**: CU-29 A7.3 pide explícitamente **403**
  (el CU le gana a la convención "ajeno = 404": el juego existe, falta la asignación), así que
  el código se mantuvo y solo se corrigió el `title` → "No tenés asignado este producto" (A7.3);
  `detail` ya era el mensaje de A7.4. El test que congelaba el título equivocado se corrigió.
- ~~**U5 · `GET /instituciones/mine`** devuelve `datos_facturacion_envio` a cualquier docente
  vinculado~~ — **resuelto (2026-11-16)**: `VerMiInstitucion` solo lo consulta y devuelve si
  `esEncargado`; para un docente común es null. Test escrito antes del arreglo (falló mostrando
  el dato expuesto). Sin cambios de frontend: el checkout B2B ya cortaba antes si no es encargado.
- **U5 · Deuda técnica:** `ver-historial-sesiones.ts` conserva ~25 líneas de comentarios de
  "pensar en voz alta" (dudas ya resueltas sobre membresías) — limpiar. `docentes.controller`
  sigue en camelCase (sesiones) vs snake_case (asignaciones) en el mismo controller.
- **U3 · Inconsistencias de códigos HTTP (para unificar en Fase 2, todas rompen clientes):**
  `DELETE /admin/products/:id` responde 200 con cuerpo (baja lógica) mientras categorías y
  recursos responden 204; varios `POST` sin `@HttpCode` responden 201 sin crear nada
  (`/admin/products/:id/reactivar`, `/catalogo/recursos/:id/descarga`). Elegir una convención.
- **U3 · Recurso licenciado sin producto (D-19):** el ABM lo permite, pero nunca será
  descargable. El formulario de `/admin/recursos` podría advertirlo al marcar "requiere
  licencia" sin producto. El límite de tamaño de subida (413) no tiene test de integración.
- **U2 · `ContenidoDemo` (demo pública/completa)** responde en camelCase (`urlEmbebido`,
  `juegoId`) a diferencia del resto de la API. Unificar en Fase 2 (rompe el frontend: cambiar
  los dos lados juntos).

## Notas generales

- Ninguno de estos ítems bloqueaba el resto del plan de frontend — se priorizó cubrir los 34
  CU con una versión honesta (sin inventar UI para datos que el backend no calcula) antes de
  invertir en gráficos avanzados/exportables.
- Antes de retomar cualquiera de estos, releer el CU original en `docs/casos-de-uso/` — esta
  lista es un resumen, no reemplaza la especificación completa.
