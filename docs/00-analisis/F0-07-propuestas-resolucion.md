|  | **Sistema ACALUD** |
| --- | --- |
|  | Propuestas de Resolución — Definiciones Pendientes del Análisis Transversal |
|  | Versión: 01 | Fecha: 24/07/2026 | Página: 1 de 15 |

| Información del Documento |
| --- |
| Nombre del Proyecto | Sistema Acalud |
| Tipo de documento | Propuesta técnica y registro de resolución |
| Alcance | 58 definiciones pendientes identificadas en el análisis transversal |
| Propósito | Proponer una resolución fundamentada para cada definición y registrar la decisión ratificada por el equipo. |

> **Nota de la versión 01.** El equipo ratificó las propuestas de este documento, apartándose de ellas en cinco definiciones: D-01, D-03, D-10, D-18 y D-30. El detalle de cada apartamiento se consigna en la sección 12, y la especificación del CU-34 resultante de D-10 en la sección 13.

---

## 1. Criterio general adoptado

Las propuestas se elaboraron aplicando, en este orden, los siguientes criterios:

**Primero.** Cuando dos enunciados de la documentación se contradicen, prevalece el más
específico sobre el más general, y la regla de negocio sobre el flujo. Una regla de la
sección 6 es normativa; un paso del flujo describe una implementación posible.

**Segundo.** Cuando una especificación deja abierta una alternativa mediante expresiones
como "o similar", "ej:" u "opcional", se propone la opción que sostiene el resto de la
documentación sin requerir modificaciones adicionales.

**Tercero.** No se incorporan entidades ni atributos que la documentación no requiera. Los
casos en que resultó indispensable agregar algo se señalan expresamente como tales.

**Cuarto.** Ninguna propuesta modifica el alcance funcional. Las funcionalidades descriptas
en las 33 especificaciones se conservan íntegramente.

Cada propuesta indica la especificación que la fundamenta. Cuando existe una alternativa
razonable, se consigna.

---

## 2. Definiciones de alcance transversal

Se resuelven primero porque condicionan la redacción de las restantes.

### D-01 · Numeración de reglas y requerimientos

**Situación.** La numeración se reinicia en cada especificación. El identificador RN-001
designa 33 reglas distintas en el proyecto.

**Propuesta.** Adoptar numeración correlativa con prefijo de módulo, según el esquema
`RN-<MÓD>-<NN>` y `RNF-<MÓD>-<NN>`, donde el módulo se identifica con las siglas ID
(Identidad), CAT (Catálogo), COM (Compras), INS (Institucional), COMU (Comunidad) y ADM
(Administración). Cada regla conserva en su documento consolidado la referencia a la
especificación de origen.

**Fundamento.** El esquema evita la colisión, mantiene la trazabilidad hacia la
especificación original y resulta legible en la defensa. La numeración puramente correlativa
—de RN-001 a RN-141— también resuelve la colisión, pero pierde la referencia al módulo.

**Alternativa.** Numeración correlativa simple, si el equipo prefiere un esquema plano.

### D-04 y D-34 · Representación del rol y diferenciación de administradores

**Situación.** El rol del usuario se representa como atributo `role` en el token de sesión y
como indicador booleano `is_admin` en otras especificaciones. Adicionalmente, el término
"administrador" designa dos figuras distintas: el administrador de la plataforma y el
encargado institucional.

**Propuesta.** Se trata de dos conceptos independientes que deben modelarse por separado:

| Concepto | Representación | Alcance |
| --- | --- | --- |
| Rol de plataforma | `users.role` con dominio `docente`, `admin`, `estudiante` | Global. Gobierna el acceso al panel de administración |
| Encargado institucional | `institutional_teachers.is_admin` | Acotado a una institución. Gobierna la gestión de su inventario y docentes |

Se incorpora al glosario la distinción, empleando "administrador de plataforma" y "encargado
institucional" como denominaciones excluyentes.

**Fundamento.** CU-02 §4 paso 13 incorpora `role` al token de sesión, y CU-01 RN-002 razona
en términos de roles. Las 27 apariciones de `is_admin` en el corpus corresponden en su
totalidad al ámbito institucional (CU-23 RN-004, CU-25 RN-004, CU-26 RN-001, CU-27 RN-001,
CU-28 RN-001, CU-31 RN-001, CU-32 RN-001, CU-33 RN-001). No hay superposición real: hay
homonimia.

### D-22 y D-52 · Dominio e idioma de los estados

**Situación.** Los estados de la orden se expresan en español en CU-05 y en inglés en CU-12 y
CU-13. Los estados de la propuesta se expresan en inglés.

**Propuesta.** Unificar en inglés, en concordancia con la nomenclatura de las entidades y
atributos ya adoptada en toda la documentación. Dominios resultantes:

| Entidad | Dominio | Origen |
| --- | --- | --- |
| `orders.status` | `pending`, `paid`, `shipped`, `delivered`, `cancelled` | Unión de CU-05 RN-003, CU-12 §3 y CU-13 RN-008 |
| `proposals.status` | `pending`, `reviewed`, `approved`, `rejected` | CU-15 RN-003, CU-21 RN-002 |

Las etiquetas visibles al usuario se presentan en español, conforme lo describen las
especificaciones. La traducción es responsabilidad de la capa de presentación.

**Fundamento.** Los nombres de tablas y columnas de todo el corpus están en inglés. Mantener
los estados en el mismo idioma preserva la coherencia del modelo. CU-05 RN-003 enumera cinco
estados que, traducidos, coinciden exactamente con la unión de los mencionados en CU-12 y
CU-13.

### D-13 y D-31 · Requerimientos no funcionales de nivel proyecto

**Situación.** Seis especificaciones invocan requerimientos identificados como RNF01 a RNF05
"del proyecto", que no forman parte de las 33 especificaciones relevadas.

**Propuesta.** Reconstruirlos a partir del contexto de cada invocación e incorporarlos como
requerimientos de nivel sistema en el documento de requerimientos:

| Identificador | Requerimiento reconstruido | Invocado en |
| --- | --- | --- |
| RNF01 | El sistema es adaptable y operable en tabletas y teléfonos | CU-06 RNF-003, CU-07 RNF-004 |
| RNF02 | Los componentes funcionales son independientes y admiten incorporación de nuevos elementos sin reestructurar el sistema | CU-06 RNF-005, CU-07 RNF-006 |
| RNF03 | El sistema no almacena datos de medios de pago | CU-12 RN-001 |
| RNF04 | La carga de contenidos accesorios no penaliza el tiempo de carga del circuito comercial | CU-06 RNF-002 |
| RNF05 | La persistencia se resuelve sobre PostgreSQL, por integridad y trazabilidad | CU-07 RNF-008 |

**Fundamento.** Cada invocación explicita el contenido del requerimiento que referencia, lo
que permite reconstruirlos con precisión razonable. Corresponde que el equipo confirme si
existe un documento de requerimientos de proyecto previo del que provengan.

---

## 3. Contenido faltante

Las dos definiciones de esta sección no consisten en elegir entre alternativas, sino en
producir documentación ausente.

### D-32 · Especificación funcional de la adquisición de lotes institucionales

**Situación.** CU-24 reproduce el contenido de CU-23. La funcionalidad que da origen al
inventario institucional carece de especificación.

**Propuesta.** Redactar la especificación conforme al siguiente esquema, derivado de lo que
las restantes especificaciones presuponen. Se ofrece como borrador para que el equipo lo
complete y ratifique:

| Sección | Contenido propuesto |
| --- | --- |
| Objetivo | Permitir al encargado institucional adquirir lotes de juegos físicos para su institución, incorporándolos al inventario institucional para su posterior asignación a docentes |
| Actor principal | Encargado institucional |
| Precondiciones | El usuario posee una institución registrada (CU-23) y figura en ella con `is_admin = true` |
| Poscondiciones | Se crea una orden con `institution_id` informado. Confirmado el pago, se crea o actualiza el registro correspondiente en `institutional_inventories`, incrementando `quantity_purchased` |
| Flujo principal | Reutiliza el circuito de CU-10, CU-11 y CU-12 en contexto institucional. El descuento mayorista de CU-22 resulta aplicable |
| Reglas de negocio | Solo el encargado adquiere en nombre de la institución. El incremento del inventario se produce con la confirmación del pago, no con la creación de la orden. La orden institucional se factura a nombre de la institución |

**Fundamento.** CU-25 RN-007 establece que el inventario debe exhibir el historial de órdenes
asociadas a cada producto, lo que confirma que el inventario se origina en órdenes. CU-12 A10
contempla el contexto institucional dentro del circuito de compra. La propuesta no introduce
un circuito nuevo: reutiliza el existente incorporando la institución como contexto.

**Nota.** Esta es la única definición cuya resolución no puede sustituirse por una decisión
de modelado. Requiere que el equipo redacte la especificación.

### D-45 · Reglas de negocio de la parametrización de encuestas

**Situación.** La sección 6 de CU-20 reproduce la de CU-19. La entidad `polls` carece de
reglas de negocio propias.

**Propuesta.** Redactar las siguientes reglas, derivadas de las restantes secciones de CU-20
y de las especificaciones que consumen encuestas:

| Regla propuesta | Fundamento |
| --- | --- |
| Solo el administrador de plataforma gestiona encuestas | CU-20 RNF-001 |
| La encuesta se crea en estado no publicado y se publica mediante una acción explícita | CU-20 §4 (`is_active` falso por defecto) |
| Una encuesta requiere un mínimo de dos opciones de respuesta para ser publicada | CU-14 §4 (la votación presupone opciones alternativas) |
| Una encuesta publicada no admite modificación de su pregunta ni de sus opciones | CU-20 RNF-005 |
| Una encuesta con respuestas registradas no admite eliminación física | CU-16 RN-001 (los resultados son públicos y persistentes) |
| El nivel educativo destinatario es opcional | CU-14 RN-003 |
| Cada operación se asienta en auditoría | CU-20 §3 |

---

## 4. Definiciones del módulo de Identidad y Acceso

### D-02 · Invalidación de la sesión en el servidor

**Situación.** El objetivo de CU-03 declara que el cierre de sesión invalida el token, la
regla RN-005 establece que el registro en el servidor es opcional, y el flujo A2.6 admite que
el token permanezca válido hasta su expiración natural, que alcanza los 30 días.

**Propuesta.** Implementar la invalidación en el servidor de manera obligatoria, mediante una
entidad `revoked_tokens` con los atributos identificador del token, fecha de revocación y
fecha de expiración natural. La verificación de sesión consulta esta entidad. Los registros
se depuran una vez superada la expiración natural.

**Fundamento.** El objetivo de CU-03 es el enunciado de mayor jerarquía dentro del documento
y declara expresamente la finalidad de "garantizar que el dispositivo quede desvinculado de
la cuenta". CU-03 RNF-002 ya especifica el mecanismo. La opción de mantenerlo opcional
supone que, con la vigencia extendida de 30 días prevista en CU-02 RN-004, un token
comprometido permanece operativo un mes después de que el usuario cierra sesión.

**Alternativa.** Conservar el carácter opcional y reducir la vigencia extendida de 30 días a
un valor menor, lo que acota la ventana sin incorporar la entidad.

### D-03 · Rol de estudiante

**Propuesta.** Incorporar `estudiante` al dominio de `users.role` como valor reservado, no
asignable desde el registro. El flujo A4 de CU-02 permanece operativo.

**Fundamento.** CU-02 RN-006 y su flujo A4 describen el comportamiento del sistema ante ese
rol. Retirarlo del dominio dejaría sin efecto una regla y un flujo completos. CU-01 RN-002
establece que el rol por defecto es `docente`, de modo que la exclusión del registro ya está
prevista.

### D-06 · Preferencias de notificación

**Propuesta.** Representarlas como atributo booleano `email_notifications` en
`teacher_profiles`, sin crear entidad propia.

**Fundamento.** CU-04 §4 paso 3 describe un único control de selección con la leyenda
"Recibir ofertas por email". Una entidad independiente para un solo valor booleano no está
justificada por la documentación.

**Alternativa.** Si el equipo prevé ampliar las preferencias, corresponde la entidad
`user_preferences` mencionada en CU-04 §4 paso 12.

### D-07 · Algoritmo de resumen criptográfico

**Propuesta.** Adoptar bcrypt con factor de costo 12.

**Fundamento.** CU-01 RNF-002 lo establece expresamente con factor 10 o superior. El flujo de
CU-01 paso 10 admite bcrypt o argon2, de modo que la elección de argon2 tampoco contradiría
la documentación; únicamente requeriría ajustar RNF-002. Se propone bcrypt por ser el
enunciado más específico.

**Alternativa.** argon2id, admitido por CU-01 §4 y CU-02 §4, con ajuste de CU-01 RNF-002.

### D-08 · Mecanismos de contención de accesos fallidos

**Propuesta.** Conservar ambos mecanismos, que operan en planos distintos, e incorporar la
entidad `login_attempts` con los atributos correo electrónico, dirección de origen, resultado
y marca temporal:

| Mecanismo | Parámetros | Origen |
| --- | --- | --- |
| Bloqueo por cuenta | 3 intentos fallidos, bloqueo de 15 minutos | CU-02 RN-007 |
| Limitación por origen en el ingreso | 5 solicitudes por minuto | CU-02 RNF-003 |
| Limitación por origen en el registro | 5 solicitudes cada 15 minutos | CU-01 RNF-005 |

**Fundamento.** CU-02 A2.2 indica que el conteo puede llevarse "en sesión o en DB". La
persistencia es la única opción compatible con un bloqueo de 15 minutos que sobreviva al
cierre del navegador.

### D-09 · Denominación de la columna de resumen criptográfico

**Propuesta.** `password_hash`.

**Fundamento.** Ninguna especificación la denomina. La designación propuesta es la de uso
corriente y explicita que el valor almacenado no es la contraseña.

### D-10 · Modificación del correo electrónico

**Propuesta.** Registrar como funcionalidad diferida, sin incorporarla al alcance.

**Fundamento.** CU-04 RN-003 y su flujo A8 la declaran expresamente fuera del alcance de esa
especificación y la remiten a un flujo separado que no integra las 33 especificaciones. El
alcance del proyecto queda definido por dichas 33.

### D-11 · Verificación del correo electrónico

**Propuesta.** Registrar como funcionalidad diferida. Incorporar a `users` el atributo
`email_verified` con valor por defecto verdadero, reservado para una implementación futura.

**Fundamento.** CU-01 RN-007 la enuncia con la salvedad "opcional, si se implementa
verificación por email". Ninguna especificación describe el circuito. El atributo reservado
permite incorporarla más adelante sin modificar el modelo.

### D-12 · Sincronización entre pestañas

**Propuesta.** Consignar el requerimiento como exclusivo de la plataforma web en el documento
de requerimientos, dentro de la separación entre web y aplicación móvil.

**Fundamento.** CU-03 A5 y RNF-007 describen un mecanismo propio de los navegadores, sin
equivalente en una aplicación empaquetada.

---

## 5. Definiciones del módulo de Catálogo, Demos y Contenido

### D-14 · Modelado de favoritos

**Propuesta.** Tres referencias que admiten nulo —`product_id`, `resource_id` y
`editorial_partner_id`— con una restricción de integridad que exija exactamente una no nula,
y tres índices únicos parciales sobre el par usuario-referencia.

**Fundamento.** CU-18 RN-002 y RN-003 enumeran las tres referencias y establecen que al menos
una debe ser no nula. La restricción de unicidad de CU-18 RN-001, enunciada como
"UNIQUE(user_id, product_id) o similar", se extiende a las tres referencias mediante índices
parciales. La denominación "tabla polimórfica" empleada en CU-17 A10.5 describe el
comportamiento, no un modelado alternativo.

### D-15 · Contador de descargas

**Propuesta.** Atributo `download_count` de tipo entero, valor inicial cero, de actualización
obligatoria.

**Fundamento.** CU-08 RN-006 establece que debe incrementarse con cada descarga exitosa. Una
regla de negocio prevalece sobre la salvedad "(opcional)" consignada en las poscondiciones y
en el flujo.

### D-16 · Promociones temporales de recursos

**Propuesta.** Incorporar a `resources` los atributos `promotion_starts_at` y
`promotion_ends_at`, ambos con admisión de nulo. Un recurso se encuentra en promoción cuando
la fecha corriente está comprendida entre ambos valores.

**Fundamento.** CU-09 RN-002 y su flujo A10.1 describen un período de promoción configurable.
Dos atributos de fecha satisfacen el requisito sin incorporar una entidad.

**Alternativa.** Entidad `promotions` si el equipo prevé promociones con histórico o con
alcance sobre conjuntos de recursos.

### D-17 · Denominación de la entidad de progreso

**Propuesta.** `game_progress`.

**Fundamento.** Es la denominación empleada en los flujos de CU-07 y en CU-19. La expresión
"o similar" de las poscondiciones no propone una alternativa concreta.

### D-18 · Almacenamiento y firma de archivos

**Propuesta.** Especificar en el documento de requerimientos un servicio de almacenamiento de
objetos que emita direcciones prefirmadas con vigencia de cinco minutos, sin designar
proveedor. La designación del proveedor constituye una decisión de implementación.

**Fundamento.** CU-09 RN-004 y RNF-002 mencionan un servicio determinado a título de ejemplo.
El requisito funcional es la vigencia acotada de la dirección, no el proveedor.

### D-19 · Relación entre recursos y productos

**Propuesta.** `resources.product_id` con admisión de nulo. Cardinalidad: un producto se
asocia a cero o más recursos; un recurso se asocia a cero o un producto.

**Fundamento.** CU-19 A9.4 declara el producto relacionado como campo opcional del formulario
de alta de recursos. CU-08 exhibe recursos gratuitos de manera autónoma en el Centro de
Descargas, lo que confirma la existencia de recursos sin producto asociado.

### D-20 · Criterio de derecho de acceso institucional

**Propuesta.** El derecho se concede cuando la institución posee el producto en su inventario
y el usuario figura vinculado a esa institución, sin requerir asignación individual.

**Fundamento.** CU-09 A8.1 verifica la pertenencia del usuario a la institución y A8.2
verifica que la institución haya adquirido el producto. No se menciona la consulta a
`institutional_assignments`. La distinción resulta coherente: la asignación de CU-26
administra ejemplares físicos, cuya cantidad es limitada, en tanto los recursos digitales no
admiten agotamiento.

### D-21 · Acceso irrestricto del administrador de plataforma

**Propuesta.** Conservar. La verificación de derecho de acceso a recursos se omite cuando
`users.role` es `admin`.

**Fundamento.** CU-09 RN-007 lo establece expresamente. Se vincula con la resolución de D-04.

---

## 6. Definiciones del módulo de Compras y Logística

### D-05 · Destino del carrito

**Propuesta.** Entidades `carts`, con referencia al usuario, y `cart_items`, con referencia
al carrito, al producto y la cantidad.

**Fundamento.** CU-02 §4 paso 16 admite "tabla `carts` o directamente en `orders`
pendientes". La segunda opción supondría que una orden represente un carrito, lo que
contradice CU-12 RN-002, que establece que la orden se crea al iniciarse el pago. CU-10
RN-005 y RNF-006 requieren persistencia del carrito en la base de datos para usuarios
registrados. La entidad `cart_items` no figura denominada en la documentación pero resulta
indispensable para representar la relación descripta en CU-10 RN-006.

### D-23 · Reserva de existencias

**Propuesta.** No incorporar atributo de reserva. La disponibilidad se calcula como la
existencia registrada menos la suma de las cantidades comprometidas en órdenes en estado
`pending`. El descuento efectivo sobre `products.stock` se produce con la confirmación del
pago.

**Fundamento.** CU-12 RN-003 establece que el descuento definitivo se aplica con la
confirmación del pago, y el flujo principal descuenta únicamente en ese momento. La
liberación de la reserva ante un rechazo, prevista en RN-006, se produce de manera natural al
transicionar la orden fuera del estado `pending`. La alternativa de un atributo
`stock_reserved` requeriría mantenimiento transaccional adicional sin beneficio funcional a
la escala prevista.

### D-24 · Estado de la orden ante un pago rechazado

**Propuesta.** La orden permanece en estado `pending`.

**Fundamento.** Las poscondiciones de CU-12 establecen que ante un pago rechazado "la orden
permanece en estado pending y el usuario puede reintentar". Es el enunciado más específico
frente a la formulación alternativa de RN-006. La transición a `cancelled` queda reservada a
la cancelación explícita.

### D-25 · Persistencia de eventos de seguimiento

**Propuesta.** Entidad `order_tracking_events` con referencia a la orden, estado, ubicación,
descripción, fecha del evento y fecha de consulta. Cumple simultáneamente la función de
almacenamiento temporal y de historial.

**Fundamento.** CU-13 RN-003 admite información de hasta cinco minutos de antigüedad, lo que
presupone almacenamiento. CU-13 RNF-007 exige exhibir el último estado conocido registrado
ante la falta de respuesta del proveedor. CU-13 §3 requiere el historial completo del envío.
Los tres requisitos se satisfacen con la misma entidad.

### D-26 · Vinculación entre la orden y la institución

**Propuesta.** `orders.institution_id` con admisión de nulo. Cuando el atributo está
informado, la facturación y el domicilio corresponden a la institución, y la confirmación del
pago incrementa el inventario institucional.

**Fundamento.** CU-12 A10.2 y A10.3 describen el reconocimiento del contexto institucional y
sus consecuencias sobre facturación y domicilio. La propuesta constituye, además, el
mecanismo que resuelve la definición D-32.

### D-27 · Registro de auditoría

**Propuesta.** Entidad `audit_log` de alcance transversal, con los atributos usuario que
ejecuta la operación, acción, tipo de entidad afectada, identificador de la entidad, valores
anterior y nuevo en formato estructurado, y marca temporal.

**Fundamento.** Siete especificaciones requieren asiento en auditoría con estructuras
equivalentes (CU-19 RN-002, CU-21 RN-004, CU-22 RN-008, CU-23 RN-008, CU-26 RNF-007, CU-27
RN-006, CU-29 RNF-008). Una entidad única con tipo de entidad genérico las satisface a todas.

### D-28 · Representación del envío

**Propuesta.** Incorporar a `orders` los atributos `shipping_cost`, `shipping_method` y
`shipping_carrier`. No se incorpora entidad para las cotizaciones.

**Fundamento.** CU-11 RN-001 establece que la cotización se calcula en tiempo real contra el
proveedor, y CU-11 §3 que el costo se registra en la orden al confirmarse. Las cotizaciones
son efímeras y no requieren persistencia.

### D-29 y D-44 · Estructura de domicilios

**Propuesta.** Adoptar una estructura uniforme de cinco componentes: calle, número, localidad,
provincia y código postal. Se aplica en tres ubicaciones:

| Ubicación | Función |
| --- | --- |
| `users` | Domicilio predeterminado, empleado para precargar el código postal |
| `orders` | Copia del domicilio al momento de la compra, con prefijo `shipping_` |
| `institutions` | Domicilio institucional |

**Fundamento.** CU-11 RN-006 requiere un domicilio guardado del usuario. CU-12 §4 incorpora el
domicilio a la creación de la orden y CU-22 RN-007 establece que las modificaciones
posteriores no alteran órdenes existentes, lo que exige que la orden conserve una copia.
CU-23 RN-006 declara obligatorio el domicilio institucional.

### D-30 · Emisión de factura

**Propuesta.** Registrar como funcionalidad diferida.

**Fundamento.** CU-12 A9 la enuncia como flujo opcional sin desarrollo. Ninguna otra
especificación la describe.

---

## 7. Definiciones del módulo Institucional

### D-33 y D-37 · Conservación de asignaciones revocadas

**Propuesta.** La revocación no elimina el registro. Se incorporan a
`institutional_assignments` los atributos `status`, con dominio `active` y `revoked`,
`revoked_at`, `revoked_by` y `revocation_reason`. La revocación parcial reduce la cantidad
asignada conservando el estado activo; la revocación total lleva el estado a `revoked`.

**Fundamento.** CU-28 RN-007 requiere exhibir todas las asignaciones "incluyendo las
revocadas (para trazabilidad histórica)", RN-008 requiere la fecha de revocación y el
responsable, y RNF-007 reitera la conservación en el historial. Tres enunciados de CU-28
frente a la eliminación descripta en el flujo de CU-27. El atributo de estado requerido por
CU-28 RN-003 se incorpora en la misma resolución.

### D-35 · Alcance de la restricción de pertenencia institucional

**Propuesta.** La restricción alcanza únicamente al rol de encargado. Un usuario puede figurar
como docente en más de una institución, pero como encargado en una sola. Se instrumenta
mediante un índice único parcial sobre el usuario, condicionado a `is_admin = true`.

**Fundamento.** CU-23 RN-003 enuncia la restricción con el alcance expreso "como encargado" y
la reitera: "No puede ser encargado de múltiples instituciones". El flujo A1 verifica la
existencia de cualquier vínculo, lo que excede el alcance de la regla. Prevalece la regla de
negocio; corresponde ajustar el flujo A1.

### D-36 · Cantidad asignada en el inventario

**Propuesta.** Conservar `quantity_assigned` en `institutional_inventories` como valor
agregado, actualizado dentro de la misma transacción que registra la asignación o la
revocación.

**Fundamento.** CU-26 RN-007 establece que el inventario "debe actualizarse automáticamente"
al asignar y CU-27 RN-004 al revocar. Ambas reglas describen un valor almacenado. La
actualización transaccional conjunta garantiza la consistencia.

### D-38 y D-53 · Notificaciones

**Propuesta.** Entidad `notifications` con referencia al usuario destinatario, tipo, título,
mensaje, tipo e identificador de la entidad relacionada, indicador de lectura y marca
temporal. El envío por correo electrónico se resuelve como acción adicional sobre el mismo
registro.

**Fundamento.** Cuatro especificaciones requieren notificar al usuario mediante "email o
dashboard" (CU-15 RN-005, CU-21 RN-005, CU-26 RN-008, CU-27 RN-005). La conjunción disyuntiva
admite ambos canales; una entidad de notificaciones sostiene el segundo y registra el
primero.

### D-39 · Estadísticas agregadas institucionales

**Propuesta.** Calcularlas en tiempo de consulta sobre `game_sessions`, con índices sobre
institución, docente, producto y fecha de sesión. No se incorporan entidades de agregación.

**Fundamento.** CU-33 RNF-006 prevé volúmenes de miles de sesiones, magnitud que no justifica
materialización. CU-31 RNF-001 admite tres segundos de respuesta, holgura suficiente para
agregaciones indexadas.

### D-40 · Delimitación entre reporte y tablero

**Propuesta.** Delimitar el alcance de cada especificación:

| Especificación | Alcance propuesto |
| --- | --- |
| CU-31 Reporte de uso | Presentación tabular de sesiones agregadas por juego y por docente, con filtros y detalle por elemento. Constituye el origen de la exportación de CU-32 |
| CU-33 Tablero pedagógico | Presentación analítica con indicadores, gráficos interactivos, evolución temporal y nube de aprendizajes. No admite exportación |

**Fundamento.** CU-31 RN-007 vincula el reporte con la exportación y sus flujos A8 y A9
describen detalle por juego y por docente. CU-33 RN-003 y RN-005 describen interactividad y
filtrado en cascada, y RN-002 incorpora el análisis temporal, ausente en CU-31. La distinción
propuesta preserva ambas especificaciones sin superposición.

### D-41 · Nivel educativo como criterio de filtro

**Propuesta.** Obtenerlo del perfil del docente que registró la sesión, mediante la relación
entre la sesión, el vínculo institucional, el usuario y su perfil.

**Fundamento.** CU-33 RN-004 lo incorpora como filtro sin definir su origen. CU-04 §3 lo
sitúa en el perfil docente. CU-29 no registra el nivel del grupo, de modo que el perfil es el
único origen disponible sin ampliar el formulario de registro.

**Alternativa.** Incorporar el nivel del grupo a `game_sessions`, lo que requiere modificar
CU-29.

### D-42 · Identificador del docente institucional

**Propuesta.** Denominar `institutional_teacher_id` en `institutional_assignments` y en
`game_sessions`, con referencia a `institutional_teachers`.

**Fundamento.** CU-29 RN-006 emplea esa denominación. Semánticamente, la asignación y la
sesión pertenecen al vínculo institucional y no al usuario global: al desvincularse el
docente de la institución, sus asignaciones y sesiones permanecen asociadas a esa
institución. CU-30 RNF-006 verifica la correspondencia con el usuario autenticado, lo que se
resuelve mediante la relación entre ambas entidades.

### D-43 · Registro de la hora en las sesiones

**Propuesta.** No incorporar la hora. Retirar la visualización de mapa de calor por hora,
conservando la agrupación por día de la semana, derivable de la fecha.

**Fundamento.** CU-33 §4 condiciona la visualización a que la hora se registre, y CU-29 no la
contempla en el formulario. La agrupación por día de la semana no requiere información
adicional.

---

## 8. Definiciones del módulo de Comunidad

### D-46 · Selección múltiple en encuestas

**Propuesta.** Una respuesta por usuario y encuesta. La restricción de unicidad se mantiene
sobre el par encuesta-usuario.

**Fundamento.** CU-14 RN-001 establece la restricción de manera expresa, y las poscondiciones
registran una respuesta con una única opción. CU-16 RN-006 calcula porcentajes sobre el total
de votos, cálculo que presupone una respuesta por participante. La expresión "múltiples
opciones de respuesta" de RN-008 admite leerse como la disponibilidad de varias opciones
entre las cuales elegir, lectura compatible con el resto de la documentación.

**Alternativa.** Si el equipo requiere selección múltiple, corresponde trasladar la
restricción de unicidad al trío encuesta-usuario-opción y revisar el cálculo de porcentajes
de CU-16 RN-006.

### D-47 · Recuento de votos

**Propuesta.** Calcularlo en tiempo de consulta sobre `poll_responses`. No se incorpora el
atributo `vote_count`.

**Fundamento.** CU-14 §4 declara la actualización del contador como opcional y admite el
cálculo en tiempo real. CU-16 RNF-008 requiere índices sobre `poll_responses`, lo que
respalda el cálculo. Un valor almacenado introduciría riesgo de divergencia sin beneficio a
la escala prevista.

### D-48 · Estados de la encuesta

**Propuesta.** Sustituir el indicador booleano por el atributo `status`, con dominio `draft`,
`active` y `closed`.

**Fundamento.** CU-20 §4 establece que la encuesta se crea sin publicar, lo que corresponde a
`draft`. CU-14 RN-002 requiere que solo las publicadas sean votables, lo que corresponde a
`active`. CU-16 RN-004 requiere distinguir las finalizadas con indicador propio, lo que
corresponde a `closed`. Un indicador booleano no distingue el primer estado del tercero.

### D-49 · Eliminación de encuestas

**Propuesta.** Una encuesta con respuestas registradas no admite eliminación. La operación
disponible es la transición a estado `closed`. La eliminación física queda reservada a
encuestas en estado `draft`.

**Fundamento.** CU-16 RN-001 establece que los resultados son públicos y accesibles, lo que
presupone su permanencia. La eliminación en cascada descripta en CU-20 A3.6 suprimiría el
historial de participación de la comunidad, contrario a la finalidad declarada en CU-14 §1.

### D-50 · Nivel educativo en las propuestas

**Propuesta.** Incorporar `target_level_id` a `proposals`, con admisión de nulo y referencia
a `levels`.

**Fundamento.** CU-15 §4 lo incluye en el formulario y RN-007 lo menciona junto a la materia
como campo opcional recomendado. Su ausencia en la enumeración de poscondiciones constituye
una omisión.

### D-51 · Detección de propuestas duplicadas

**Propuesta.** Rechazar el envío cuando el mismo usuario haya remitido una propuesta con
título idéntico dentro de los 30 días previos.

**Fundamento.** CU-15 RN-006 enuncia el requisito sin precisar el criterio de similitud ni la
ventana temporal. La propuesta adopta un criterio verificable. La comparación por similitud
aproximada de la descripción excedería lo que la especificación requiere.

### D-54 · Edición de encuestas según su estado

**Propuesta.** Solo las encuestas en estado `draft` admiten modificación de pregunta y
opciones. Las publicadas admiten únicamente la transición a `closed`.

**Fundamento.** CU-20 RNF-005 establece que las encuestas activas no pueden editarse desde la
interfaz. Los flujos A2.8 y A2.9 describen la edición sin condicionarla al estado; la
restricción del requerimiento delimita su aplicación. Se vincula con la resolución de D-48.

---

## 9. Definiciones del módulo de Administración

### D-55 · Eliminación de productos

**Propuesta.** Incorporar el atributo `is_active` a `products`, con valor inicial verdadero.
La operación de eliminación establece el valor en falso. No se contempla eliminación física.

**Fundamento.** CU-19 RNF-008 lo establece de manera categórica: "La eliminación de productos
debe ser lógica (marcar como inactivo) en lugar de física, para preservar la integridad de
órdenes históricas". Es el enunciado más específico frente a la formulación condicional de
RN-010 y a la alternativa del flujo A2.5. El atributo requerido no figuraba enumerado.

### D-56 · Entidad de categorías

**Propuesta.** Incorporar la entidad `categories`, con identificador, nombre y descripción, y
el atributo `products.category_id` con admisión de nulo.

**Fundamento.** El objetivo de CU-19 incluye expresamente la gestión de categorías entre las
operaciones del administrador. La ausencia de reglas y atributos constituye una omisión de la
especificación, no una indicación de que la entidad no integre el modelo.

### D-57 · Dirección del motor de juego

**Propuesta.** Incorporarla dentro de `config_json`, sin atributo propio.

**Fundamento.** CU-19 RN-008 define `config_json` como la configuración de la demo. CU-06 §4
y CU-07 §4 enumeran los parámetros que contiene. La dirección del motor constituye un
parámetro adicional de la misma naturaleza.

### D-58 · Productos de terceros y editoriales aliadas

**Propuesta.** Los productos de terceros integran el catálogo con fines de exhibición y no
admiten incorporación al carrito. Se incorpora `products.editorial_partner_id` con admisión
de nulo, que vincula el producto con la editorial que lo provee.

**Fundamento.** CU-19 RN-003 establece que los productos de terceros requieren dirección
externa, cuya finalidad es derivar al sitio del proveedor. CU-17 §1 describe el directorio de
editoriales como un espacio de exhibición del ecosistema. Ninguna especificación describe la
compra de un producto de terceros dentro de la plataforma.

---

## 10. Resumen de incorporaciones al modelo

Las propuestas precedentes incorporan al modelo las siguientes entidades y atributos no
enumerados en la documentación original. Cada una responde a un requisito expreso de alguna
especificación.

| Incorporación | Requisito que la origina |
| --- | --- |
| Entidad `cart_items` | CU-10 RN-006 |
| Entidad `categories` | CU-19 §1 |
| Entidad `audit_log` | Siete especificaciones |
| Entidad `notifications` | CU-15, CU-21, CU-26, CU-27 |
| Entidad `login_attempts` | CU-02 RN-007 |
| Entidad `revoked_tokens` | CU-03 objetivo y RNF-002 |
| Entidad `order_tracking_events` | CU-13 RNF-007 |
| `users.password_hash` | CU-01 RN-003 |
| `users.email_verified` | CU-01 RN-007 |
| Domicilio en `users`, `orders` e `institutions` | CU-11 RN-006, CU-12 §4, CU-23 RN-006 |
| `orders.institution_id` | CU-12 A10 |
| `orders.shipping_cost`, `shipping_method`, `shipping_carrier` | CU-11 §3 |
| `products.is_active` | CU-19 RNF-008 |
| `products.category_id` | CU-19 §1 |
| `products.editorial_partner_id` | CU-19 RN-003, CU-17 §1 |
| `resources.promotion_starts_at`, `promotion_ends_at` | CU-09 RN-002 |
| `resources.download_count` | CU-08 RN-006 |
| `institutional_assignments.status`, `revoked_at`, `revoked_by`, `revocation_reason` | CU-28 RN-007, RN-008 |
| `proposals.target_level_id` | CU-15 §4, RN-007 |
| `polls.status` en reemplazo de `is_active` | CU-16 RN-004 |
| `teacher_profiles.email_notifications` | CU-04 §4 |

---

## 12. Apartamientos del equipo respecto de las propuestas

El equipo ratificó la mayoría de las propuestas y se apartó de ellas en cinco definiciones.
Se consigna cada una con su fundamento.

**D-01 — Numeración.** La propuesta ofrecía numeración por módulo. El equipo adoptó
numeración por caso de uso, con el formato `RN-CU<nn>-<nnn>`. La referencia directa al caso de
uso de origen resulta más inmediata para el seguimiento durante la implementación.

**D-03 — Rol de estudiante.** La propuesta lo conservaba como valor reservado no asignable. El
equipo lo descartó por completo del sistema. El dominio de `users.role` queda reducido a
`docente` y `admin`. Como consecuencia, la especificación CU-02 debe corregirse para retirar
la mención al rol y su flujo alternativo A4. Esta corrección se registra como pendiente en el
consolidado.

**D-10 — Cambio de correo electrónico.** La propuesta recomendaba diferirlo. El equipo optó
por especificarlo en una especificación funcional nueva, CU-34, en lugar de incorporarlo a
CU-04. La separación es adecuada: el cambio de correo constituye un flujo con verificación
propia, de naturaleza distinta a la edición de perfil. El alcance del proyecto pasa a 34
especificaciones. La especificación se desarrolla en la sección 13.

**D-18 — Almacenamiento de archivos.** La propuesta indicaba un servicio de almacenamiento de
objetos con direcciones prefirmadas. El equipo resolvió, con carácter provisional, almacenar
los archivos en la propia base de datos y controlar el acceso mediante validación de token,
sin dirección firmada. La decisión se registró como revisable antes de la entrega final. Se
deja constancia de dos consideraciones: el almacenamiento de contenido binario en la base de
datos es adecuado a la escala del proyecto pero no a un crecimiento sostenido, y el control de
acceso queda supeditado a la verificación del token en cada descarga. Ambas consideraciones
son compatibles con el alcance actual.

**D-30 — Formulario de pago.** La propuesta lo registraba como funcionalidad diferida. El
equipo precisó que la captura de datos de pago corresponde a la pasarela y no al sistema, en
concordancia con el requerimiento de nivel sistema que establece que no se almacenan datos de
medios de pago. Corresponde ajustar la redacción de CU-12 para reflejarlo. No requiere
desarrollo adicional.

---

## 13. Especificación funcional incorporada — CU-34

La resolución de la definición D-10 da lugar a la siguiente especificación. Se presenta
conforme a la estructura de las restantes, para su ratificación e integración al corpus.

| Campo | Contenido |
| --- | --- |
| Identificador | CU-34 |
| Nombre | Cambiar Correo Electrónico |
| Actor principal | Docente (usuario registrado y con sesión iniciada) |
| Objetivo | Permitir al docente modificar el correo electrónico asociado a su cuenta, mediante un procedimiento de verificación que confirme la titularidad del nuevo correo antes de hacer efectivo el cambio |

**Precondiciones.** El usuario posee una cuenta y una sesión iniciada. Conoce su contraseña
vigente.

**Poscondiciones.** El correo de la cuenta se actualiza únicamente tras la confirmación del
nuevo correo. Hasta esa confirmación, el correo anterior permanece vigente y operativo. Se
asienta la operación en auditoría.

**Flujo principal.**

1. El usuario accede a la opción de cambio de correo desde su perfil.
2. El sistema solicita el nuevo correo y la contraseña vigente.
3. El usuario los proporciona.
4. El sistema verifica la contraseña vigente.
5. El sistema verifica que el nuevo correo no se encuentre registrado en otra cuenta.
6. El sistema genera un testigo de verificación y lo remite al nuevo correo.
7. El usuario accede al enlace de verificación recibido en el nuevo correo.
8. El sistema valida el testigo y hace efectivo el cambio.
9. El sistema notifica el cambio al correo anterior, a título informativo.

**Flujos alternativos.**

- La contraseña vigente es incorrecta: el sistema rechaza la operación y no remite el testigo.
- El nuevo correo ya está registrado: el sistema informa la imposibilidad sin revelar la
  existencia de la otra cuenta.
- El testigo de verificación se encuentra vencido: el sistema informa el vencimiento y permite
  reiniciar el procedimiento.

**Reglas de negocio.**

| Regla | Enunciado |
| --- | --- |
| El cambio requiere verificación de la titularidad del nuevo correo | El correo no se actualiza hasta que el nuevo se confirma |
| El correo anterior permanece vigente hasta la confirmación | La cuenta no queda inaccesible durante el procedimiento |
| El nuevo correo debe ser único en el sistema | No puede coincidir con el de otra cuenta |
| La operación exige la contraseña vigente | Constituye una verificación de identidad |
| El testigo de verificación es de un solo uso y expira | Conforme a la política de testigos vigente |
| La operación se asienta en auditoría | Con usuario, correo anterior, correo nuevo y marca temporal |

**Requerimientos no funcionales.** Aplican los requerimientos de nivel sistema en materia de
transmisión cifrada, tiempo de respuesta y diseño adaptable. El testigo de verificación se
transmite exclusivamente al nuevo correo.

**Entidades afectadas.** `users`. La incorporación del atributo `email_verified`, prevista en
la definición D-11, resulta compatible con esta especificación.

---

## 11. Registro de revisiones

| Revisión | Fecha | Ítem | Descripción | Intervino |
| --- | --- | --- | --- | --- |
| 00 | 24/07/2026 | Documento total | Versión inicial |  |
| 01 | 24/07/2026 | Secciones 12 y 13 | Registro de apartamientos del equipo e incorporación de CU-34 |  |

## 14. Participantes y Aprobaciones

| **Confecciona** | **Revisa** | **Aprueba** |
| --- | --- | --- |
|  |  |  |
