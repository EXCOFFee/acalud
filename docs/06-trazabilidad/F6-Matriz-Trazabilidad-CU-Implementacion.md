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

### Institucional — etapa 1e (cerrada)

| Tabla | Propietario | Lectores | Estado |
|---|---|---|---|
| `institutions` | CU-23 | CU-24 … CU-33 | Correcta |
| `institutional_teachers` | CU-23 | CU-26, CU-27, CU-28 | Correcta |
| `institutional_inventories` | CU-24 | CU-25 | Correcta |
| `institutional_assignments` | CU-26 | CU-25, CU-27, CU-28, CU-29 | Creada en 1e |
| `game_sessions` | CU-29 | CU-30, CU-31, CU-32, CU-33 | Correcta |

### Comunidad y transversal — etapa 1e (cerrada)

| Tabla | Propietario | Lectores | Estado |
|---|---|---|---|
| `proposals` | CU-15 | CU-21 | Correcta |
| `polls` | CU-20 | CU-14, CU-16 | Correcta |
| `poll_options` | CU-20 | CU-14, CU-16 | Correcta |
| `poll_responses` | CU-14 | CU-16 | Correcta |
| `notifications` | CU-26 | CU-15, CU-21, CU-27 | Creada en 1e |
| `outbox_emails` | CU-12 (RNF) | CU-01, CU-26, CU-27, CU-34 | Correcta |
| `audit_log` | RNF-SIS-016 | — | Correcta. **Respaldo `sin verificar`**: no localicé el CU o RNF que la exige nominalmente |

---

## 2. Requisitos de CU sin implementación

Estas son las filas de la dirección inversa: el CU lo exige, no existe nada que lo cumpla.

| Faltante | CU que lo exige | Evidencia | Estado |
|---|---|---|---|
| `institutional_assignments` | CU-26, CU-27, CU-28 | CU-26 pide *asignar licencias a docentes específicos, registrando qué docente tiene acceso a cada juego*. CU-27 pide revocar y liberar para reasignar. CU-28 pide listar las asignaciones con producto, cantidad, fecha y estado. `catalogo_institucional` es inventario de la institución, no asignación por docente | **Resuelto en 1e** (migración 0014) |
| `notifications` | CU-26, CU-27, CU-04 | CU-26 y CU-27 dicen que el docente recibe una notificación *"(email o dashboard)"*. La vía *dashboard* es in-app y `outbox_emails` no la cubre. CU-04 incluye *preferencias de notificación* en el perfil | **Resuelto en 1e** (migración 0014) |
| Estado de licencia `activa / en uso / disponible` | CU-25 | CU-25 pide ver el inventario *"incluyendo el estado de las licencias (activas, en uso, disponibles)"*. Los tres estados solo son derivables si existen las asignaciones | **Resuelto en 1e**: `assignment_status` más los contadores `quantity_purchased` / `quantity_assigned` de `institutional_inventories`, con `disponible = adquirida − asignada` (CU-25 RN-002) |
| Almacén de la invitación pendiente | CU-23 A12.8b | El docente sin cuenta recibe *"un correo de invitación con un enlace para registrarse"* cuyo *"enlace incluye un token que identifica a la institución"*, y el vínculo se crea recién al completar el registro. El esquema objetivo define `institutional_teachers` con cinco columnas y ninguna cubre la invitación pendiente | **Abierto**: 1e conservó las columnas de la v1 (`invited_email`, `invitation_token_hash`, `invited_at`, `status`) traducidas. Falta que un addendum decida si viven ahí o en una tabla propia |

**Confirmación negativa (previa a 1e):** no había ninguna aparición de `asignacion` ni
`assignment` en `infra/migrations/` ni en `apps/api/src`. Las tablas ya existen; **CU-25 a CU-28
siguen sin una sola línea de aplicación**: 1e entregó el modelo de datos, no los casos de uso.

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

**Actualización al cierre de la etapa 1e.** Todo lo anterior está hecho: los cuatro arreglos de §4,
el renombre de `descargas`, y las dos tablas de §2 más `institutional_assignments` y
`notifications`. El refactor de nomenclatura queda cerrado — no hay tablas, columnas, tipos,
valores de enumeración, restricciones ni índices en español.

Queda una salvedad importante que no es de nomenclatura: **producción tiene aplicadas sólo las
migraciones 0001-0003**. Las quince del refactor viven en la cadena local y validada, pero nunca
se corrieron contra Supabase. Hasta que se apliquen, el código desplegado y la base de producción
hablan idiomas distintos.

---

## 7. Enumeraciones: las dos ambiguas, resueltas en 1e

Ambas quedaron resueltas al leer en detalle los CU que las respaldan. **La lectura anterior de
`estado_propuesta` era incorrecta y queda rectificada.**

| Tipo | Resolución | Fundamento |
|---|---|---|
| `estado_propuesta` → `proposal_status` | Cuatro valores: `pending`, `reviewed`, `approved`, `rejected`. **`retirada` se retiró** | CU-21 RN-002 enumera taxativamente los estados posibles y ni CU-15 ni CU-21 contemplan retirar una propuesta. El documento tenía razón; el valor de más era el de la base. La tabla estaba vacía: sin pérdida |
| `nivel_educativo` → FK a `levels` | La enumeración deja de usarse: `institutions.level_id` referencia la tabla maestra (addendum IV) | CU-23 A11.1 fija el selector en *"Inicial, Primaria, Secundaria"*, que son exactamente las tres filas de `levels`. `superior` y `mixto` no tienen respaldo en ningún CU |

**Huérfanos detectados, no retirados.** Se renombraron para no dejar nada en español, pero
ningún CU los respalda. Corresponde una única decisión de retiro:

| Tipo | Huérfano desde |
|---|---|
| `demo_type`, `demo_format` | Etapa 1b: las demos pasaron a `config_json` |
| `tracking_source` | Etapa 1e (migración 0012): se retiró `envios` |
| `membership_role` | Etapa 1e: reemplazado por `is_admin` (CU-23 RN-004) |
| `question_type` | Etapa 1e: `preguntas` desapareció al pasar a `poll_options` |
| `education_level` | Etapa 1e: reemplazado por la FK a `levels` |

---

## 8. Elementos conservados sin respaldo (decisión pendiente)

La regla del proyecto prohíbe retirar por cuenta propia lo que no tiene respaldo. Estos elementos
se tradujeron al inglés y siguen en la base, esperando decisión:

| Elemento | Por qué no tiene respaldo |
|---|---|
| `institutions.status` | Ningún CU suspende ni da de baja una institución, y el esquema objetivo no define la columna |
| `uq_institutions_tax_id_active` | Unicidad del CUIT sólo entre activas; queda subsumida por el `UNIQUE` total que exige CU-23 RN-001 |
| `game_sessions.editable_until` | La ventana de 48 h venía de PI-02 (requerimiento v1, no vinculante). CU-30 sólo permite VER las sesiones. Dejó de ser obligatoria para no bloquear CU-29 |
| Cotas de `game_sessions` (1-100 alumnos, 5-240 min) | Citan PI-05, no un CU. CU-29 RN-003 sólo pide *"mayores a 0"*: las cotas lo cumplen con creces, pero son más estrictas que lo documentado |
| `proposals.number` | Ningún CU lo menciona ni define quién lo genera. Dejó de ser obligatorio para no bloquear CU-15 |
| `proposals.attachment_ref` | CU-15 no pide adjunto |
| `polls.description`, `polls.valid_from`, `polls.valid_until` | CU-20 gobierna la visibilidad con el estado (`draft`/`active`/`closed`), no con fechas |
| `audit_log.ip` | No está en el esquema objetivo, pero el registro de auditoría de RNF-SIS-016 pierde valor forense sin ella |

**Sin respaldo y además sin lugar para ir:** las *palabras clave o etiquetas* que CU-15 ofrece en
el formulario de propuesta no tienen columna en el esquema objetivo ni en la base. Es un faltante
de §2 pendiente de decisión.
