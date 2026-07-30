# F6 — Matriz de trazabilidad CU ↔ implementación

**Proyecto:** Sistema Acalud
**Alcance:** los 34 casos de uso de `docs/casos-de-uso/` contra el esquema real de la base
**Estado del refactor:** cerrado el refactor de nomenclatura (migraciones 0004 a 0013). Ninguna
tabla, columna, tipo ni valor de enumeración queda en español, salvo dos enumeraciones que
quedaron pendientes por ambigüedad (§7).
**Regla que gobierna:** los CU son la fuente de verdad. Todo lo que existe debe estar respaldado
por un CU; todo lo que un CU exige debe existir. El esquema y los addenda son artefactos derivados.

---

## 0. Método

El esquema real no se leyó del documento de esquema, que está desalineado. Se **reconstruyó**
aplicando las siete migraciones de `infra/migrations/` en orden, procesando `CREATE TABLE`,
`DROP TABLE`, `RENAME TO`, `RENAME COLUMN`, `ADD COLUMN` y `DROP COLUMN`, incluyendo los
`ALTER TABLE` con varias operaciones separadas por coma.

Los 34 CU se extrajeron del OOXML real (`word/document.xml`) de cada `.docx`.

Cada fila cita el CU que la respalda. Donde no pude verificar, la fila dice **`sin verificar`**
en vez de completarse por inferencia.

**Inventario al cierre del refactor:** 32 tablas · 21 tipos enumerados.
(La auditoría original relevó 34 tablas y 25 tipos; las migraciones 0008 y 0012 retiraron
`comprobantes`, `tabla_tarifas` y `envios`, agregaron `order_tracking_events`, y retiraron
cuatro tipos huérfanos.)

---

## 1. Matriz tabla → CU

`Propietario` es el CU cuyo flujo crea el registro. `Lectores` son los CU que lo consultan o
modifican. `Destino` es el nombre en inglés cuando el renombre está pendiente.

### Identidad — etapa 1a (cerrada)

| Tabla | Propietario | Lectores | Estado |
|---|---|---|---|
| `users` | CU-01 | CU-02, CU-04, CU-34 | Correcta |
| `sessions` | CU-02 | CU-03 | Correcta |
| `user_tokens` | CU-01, CU-34 | CU-02 (RNF-005) | Correcta |
| `login_attempts` | CU-02 | — | Correcta |
| `teacher_profiles` | CU-01 | CU-04 | Correcta |
| `levels` | CU-19 | CU-04, CU-20, CU-23 | Correcta |
| `subjects` | CU-19 | CU-04 | Correcta |

### Catálogo — etapa 1b (cerrada)

| Tabla | Propietario | Lectores | Estado |
|---|---|---|---|
| `products` | CU-19 | CU-06 … CU-12, CU-24 | Correcta |
| `resources` | CU-19 | CU-08, CU-09 | Correcta |
| `categories` | CU-19 | CU-17 | Correcta |
| `editorial_partners` | CU-19 | CU-17, CU-18 | Correcta |
| `favorites` | CU-18 | CU-18 A9 | Correcta — los tres destinos presentes con CHECK de exclusividad |
| `demos` | CU-19 | CU-06, CU-07 | Correcta |
| `game_progress` | CU-07 | CU-07 | Correcta |
| `downloads` | CU-08 | CU-09 | Correcta (migración 0009) |

### Compras — etapa 1c (cerrada)

| Tabla | Propietario | Lectores | Estado |
|---|---|---|---|
| `carts` | CU-10 | CU-11, CU-12 | Correcta — conserva `institution_context_id`: CU-24 exige carrito institucional separado del personal |
| `cart_items` | CU-10 | CU-11, CU-12 | Correcta |
| `orders` | CU-12 | CU-05, CU-13 | Correcta — `order_number` por renombre; domicilio en cinco columnas; `status` con seis valores |
| `order_items` | CU-12 | CU-05 | Correcta |
| `processed_payments` | CU-12 (RNF-002/003) | — | Correcta — conserva `notified_amount` |
| `stock_movements` | CU-12 | CU-19, CU-24 | Correcta — conserva `movement_type` y `adjustment_reason` por separado |
| `order_tracking_events` | CU-13 | CU-13 | Creada con la forma del esquema (una fila por evento); `envios` retirada |
| `comprobantes` | — | — | Retirada (migración 0008) |
| `tabla_tarifas` | — | — | Retirada (migración 0008) |

### Institucional — etapa 1e (pendiente)

| Tabla | Propietario | Lectores | Estado |
|---|---|---|---|
| `instituciones` → `institutions` | CU-23 | CU-24 … CU-33 | Renombre pendiente |
| `membresias` → `institutional_teachers` | CU-23 | CU-26, CU-27, CU-28 | Renombre pendiente |
| `catalogo_institucional` → `institutional_inventories` | CU-24 | CU-25 | Renombre pendiente |
| `sesiones_uso` → `game_sessions` | CU-29 | CU-30, CU-31, CU-32, CU-33 | Renombre pendiente |

### Comunidad y transversal — etapas 1d y 1e (pendientes)

| Tabla | Propietario | Lectores | Estado |
|---|---|---|---|
| `propuestas` → `proposals` | CU-15 | CU-21 | Renombre pendiente |
| `encuestas` → `polls` | CU-20 | CU-14, CU-16 | Renombre pendiente |
| `preguntas` → `poll_options` | CU-20 | CU-14 | Renombre pendiente |
| `respuestas` → `poll_responses` | CU-14 | CU-16 | Renombre pendiente |
| `outbox_emails` | CU-12 (RNF) | CU-01, CU-26, CU-27, CU-34 | Correcta |
| `eventos_auditoria` → `audit_log` | RNF-SIS-016 | — | Renombre pendiente. **Respaldo `sin verificar`**: no localicé el CU o RNF que la exige nominalmente |

---

## 2. Requisitos de CU sin implementación

Estas son las filas de la dirección inversa: el CU lo exige, no existe nada que lo cumpla.

| Faltante | CU que lo exige | Evidencia | Etapa |
|---|---|---|---|
| `institutional_assignments` | CU-26, CU-27, CU-28 | CU-26 pide *asignar licencias a docentes específicos, registrando qué docente tiene acceso a cada juego*. CU-27 pide revocar y liberar para reasignar. CU-28 pide listar las asignaciones con producto, cantidad, fecha y estado. `catalogo_institucional` es inventario de la institución, no asignación por docente | 1e |
| `notifications` | CU-26, CU-27, CU-04 | CU-26 y CU-27 dicen que el docente recibe una notificación *"(email o dashboard)"*. La vía *dashboard* es in-app y `outbox_emails` no la cubre. CU-04 incluye *preferencias de notificación* en el perfil | 1e |
| Estado de licencia `activa / en uso / disponible` | CU-25 | CU-25 pide ver el inventario *"incluyendo el estado de las licencias (activas, en uso, disponibles)"*. Los tres estados solo son derivables si existen las asignaciones | 1e |

**Confirmación negativa:** no hay ninguna aparición de `asignacion` ni `assignment` en
`infra/migrations/` ni en `apps/api/src`. CU-26, CU-27 y CU-28 no tienen implementación alguna.

---

## 3. Elementos sin respaldo en ningún CU

| Elemento | Por qué se retira |
|---|---|
| Tabla `comprobantes` | La factura la emite Mercado Pago. CU-12 solo tiene la factura como flujo alternativo opcional (A9) y entrega el comprobante por correo, que ya cubre `outbox_emails`. `cae`, `arca` y `AFIP` no aparecen en ningún CU |
| Tipo `tipo_comprobante ('pdf','arca')` | Acompaña a la tabla anterior |
| Tabla `tabla_tarifas` | CU-11 delega el cálculo a un proveedor logístico externo, y su flujo A2 resuelve la falla del proveedor con HTTP 503, botón "Reintentar" y opción de seguir sin calcular envío. No define respaldo local. Verificado además que **ningún archivo de `apps/` ni `packages/` la consulta**: está muerta |
| `estado_pedido`: `rechazado` | CU-12 A3 manda el pedido a `cancelled`; aparte establece que si el pago se rechaza el pedido queda en `pending` para reintentar. No crea un estado propio |
| `estado_pedido`: `expirado` | CU-12 A4 es *sesión* expirada, no pedido expirado |
| `estado_pedido`: `en_preparacion` | CU-13 solo contempla "Enviado" y "Entregado" |
| Tipos `estado_cuenta`, `tipo_token`, `tipo_recurso` | **Huérfanos**: las columnas que los usaban fueron reemplazadas en 1a y 1b (`email_verified`, `purpose`, `type`) y los tipos quedaron sin borrar |

Ya retiradas correctamente en etapas anteriores: `productos_exhibidos` (CU-17 opera a nivel
editorial con URL externa, sin entidad de vidriera propia) y `tramos_descuento` (CU-22 define
*el* umbral y *el* porcentaje, en singular).

---

## 4. Bloqueos para la etapa 1c

**a. RESUELTO · `order_number` es un `RENAME`, no un `ADD`.**
`pedidos` ya tiene `numero text NOT NULL UNIQUE` (`0001_esquema_inicial.sql:239`). El addendum II
indica `ALTER TABLE orders ADD COLUMN order_number VARCHAR(20) UNIQUE`. Aplicado literal, la tabla
queda con dos identificadores legibles y el nuevo aceptando nulos. Corresponde
`RENAME COLUMN numero TO order_number`, que además preserva el `NOT NULL`.

**b. RESUELTO · `estado_pedido` → `order_status` (migración 0011).** Seis valores. La
contradicción de CU-12 A3 se resolvió así: un pago rechazado deja el pedido en `pending`,
reintentable; `cancelled` queda para la cancelación explícita.

| Real | Doc | Respaldo |
|---|---|---|
| `pendiente_pago` | `pending` | CU-12 |
| `pagado` | `paid` | CU-12 |
| `despachado` | `shipped` | CU-13 |
| `entregado` | `delivered` | CU-13 |
| `cancelado` | `cancelled` | CU-12 A3 |
| `en_revision` | `under_review` | addendum V |
| `rechazado`, `expirado`, `en_preparacion` | — | Sin respaldo, se retiran |

PostgreSQL no permite quitar valores de un `ENUM`: hay que crear el tipo nuevo y migrar la columna
con `USING`. Y toca las guardas de máquina de estados que ya están en verde, así que no es mecánico.

**c. RESUELTO · pase de enumeraciones (migración 0013).** Quedan dos sin resolver por ambigüedad,
en §7.
Las etapas 1a y 1b renombraron tablas y columnas pero crearon tipos nuevos en inglés en paralelo
(`user_role`, `token_purpose`, `resource_type`) en vez de renombrar los existentes. De ahí los tres
huérfanos de §3. Para 1c y 1d conviene decidir el criterio una sola vez: renombrar el tipo, o crear
el nuevo y migrar. No mezclar.

**d. RESUELTO · `origen_envio` → `shipping_quote_source`,** con `tabla_local` → `local_fallback`.
Se nombra por lo que es: qué adaptador cotizó. `shipping_carrier` es un campo distinto, que entra
con CU-13.
Retirar `tabla_tarifas` deja el valor `tabla_local` nombrando una tabla inexistente. El valor sí está
en uso, pero como marcador del adaptador falso, en cuatro lugares: `shipping-provider.port.ts`,
`tarifa-local-fake.adapter.ts`, el `INSERT` de `unidad-de-trabajo.pg.ts:34` y un test unitario.
Retirar la tabla no arrastra el valor, pero el nombre queda mintiendo.

---

## 5. Cuestionamientos a los CU

No son errores del esquema. Son puntos donde el CU mismo conviene revisar.

1. **CU-12 A3 tiene dos resoluciones distintas para el mismo evento.** El cuerpo dice que si el pago
   es rechazado el pedido queda en `pending` y el usuario puede reintentar. El flujo A3 dice que el
   estado pasa a `cancelled`. Son incompatibles: o el pedido queda reintentable, o queda cancelado.
   Esto define si `rechazado` hacía falta después de todo.

2. **CU-11 no define qué pasa con el envío ya cotizado si el carrito cambia.** El costo se calcula
   antes de finalizar; si el usuario agrega un producto después, el peso cambia y la cotización queda
   vieja. Ningún flujo alternativo lo cubre.

3. **CU-25 pide el estado "en uso" de una licencia** pero ningún CU define qué lo produce. "Asignada"
   sale de CU-26; "en uso" sugiere una sesión de juego activa, que es CU-29. Falta la regla que los une.

4. **El JWT.** Diecisiete CU lo nombran, incluido CU-03, cuyo objetivo dice literalmente *invalidando
   el token JWT*, y CU-12 A4 habla de *el token JWT enviado en la solicitud*. La implementación usa
   sesión opaca con estado en el servidor, que es mejor y está documentada como apartamiento fundado.
   Queda registrado que los CU dicen otra cosa, por si en la defensa lo preguntan.

5. **CU-04 incluye "preferencias de notificación"** en el perfil. `teacher_profiles.email_notifications`
   es un booleano. Si las notificaciones van a tener vía *dashboard* además de correo (CU-26, CU-27),
   un booleano de correo no alcanza para expresar la preferencia.

---

## 6. Qué significa esto en la práctica

El refactor de nombres venía guiándose por el documento de esquema, y ese documento no coincide con
la base en ninguna de las dos direcciones. Por eso dos tablas quedaron sin renombrar en una etapa
cerrada en verde, y por eso hay tres casos de uso institucionales sin una sola línea que los
implemente.

La matriz invierte la dependencia: la guía pasan a ser los CU, y el esquema se valida contra ella.
Con eso, la pregunta "¿falta algo o hay algo de más?" tiene respuesta verificable fila por fila, que
es lo que hace falta para defenderla.

Lo que queda por hacer, en orden: los cuatro arreglos de §4 antes de cerrar 1c; reabrir el renombre
de `descargas` que quedó fuera de 1b; y crear en 1e las dos tablas de §2, que no son renombres sino
funcionalidad ausente.

Una sola fila de esta matriz quedó `sin verificar`: el respaldo nominal de `eventos_auditoria`.

---

## 7. Enumeraciones sin resolver (cierre del refactor)

Las dos únicas que siguen en español, porque el mapeo es ambiguo y no corresponde decidirlo sin
el equipo:

| Tipo | Valores reales | Documentado | Por qué no se resolvió |
|---|---|---|---|
| `estado_propuesta` | `recibida`, `en_revision`, `aceptada`, `rechazada`, `retirada` | `proposal_status`: `pending`, `reviewed`, `approved`, `rejected` | Cinco valores contra cuatro: `retirada` no tiene destino. CU-15 permite retirar una propuesta, así que el valor tiene respaldo y el que falta es el del documento |
| `nivel_educativo` | `inicial`, `primario`, `secundario`, `superior`, `mixto` | tabla maestra `levels` con tres filas | El documento no lo modela como enumeración sino como referencia a `levels`, y dos valores reales (`superior`, `mixto`) no existen allí |

**Huérfanos detectados, no retirados** (se renombraron para no dejar nada en español, pero
ningún CU los respalda desde que las demos pasaron a `config_json` y `envios` se retiró):
`demo_type`, `demo_format` y `tracking_source`. Corresponde decidir su retiro.
