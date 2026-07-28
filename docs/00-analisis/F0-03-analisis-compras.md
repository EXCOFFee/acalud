|  | **Sistema ACALUD** |
| --- | --- |
|  | Análisis Transversal — Módulo 03: Compras y Logística |
|  | Versión: 00 | Fecha: 24/07/2026 | Página: 1 de 6 |

| Información del Documento |
| --- |
| Nombre del Proyecto | Sistema Acalud |
| Tipo de documento | Análisis transversal de especificaciones funcionales (documento de trabajo) |
| Casos de uso analizados | CU-10, CU-11, CU-12, CU-13, CU-22 |
| Propósito | Consolidar entidades, atributos, relaciones, reglas de negocio y requerimientos no funcionales como insumo para el Diagrama Entidad-Relación y el documento de requerimientos. |

---

## 1. Alcance del análisis

Se relevaron las cinco especificaciones que componen el circuito comercial: incorporación de
productos al carrito con descuento por cantidad, cálculo del costo de envío, finalización de
la compra mediante pasarela de pagos, seguimiento logístico del pedido y configuración
administrativa del descuento mayorista.

CU-22 corresponde funcionalmente al panel de administración, pero opera sobre atributos de
`products` que gobiernan el cálculo del carrito, por lo que se releva junto a este módulo.

La sección 8 (Modelo Conceptual de Datos) se encuentra sin completar en las cinco
especificaciones.

---

## 2. Catálogo de entidades

### 2.1 Entidades identificadas

| Entidad | Origen (CU / sección) | Naturaleza |
| --- | --- | --- |
| `products` | CU-10 RN-001, CU-22 §3 | Transaccional — núcleo del catálogo |
| `carts` | CU-10 §3, RN-005 | Transaccional — persistencia condicionada al tipo de usuario |
| `orders` | CU-12 §3, CU-13 RN-002 | Transaccional — núcleo del circuito |
| `order_items` | CU-12 §4 | Detalle de `orders` |
| *(registro de auditoría)* | CU-22 §3, RN-008 | **Sin denominar** — ver decisión D-27 |

### 2.2 Atributos relevados

**`products`** (atributos del circuito comercial)

| Atributo | Origen | Notas |
| --- | --- | --- |
| `wholesale_threshold` | CU-10 RN-001, CU-22 RN-002 | Entero mayor a cero (CU-22 RN-004) |
| `wholesale_discount_percent` | CU-10 RN-002, CU-22 RN-002 | Decimal entre 0 y 100 inclusive (CU-22 RN-005) |
| `stock` | CU-10 RN-004, CU-12 §4 | Se valida al incorporar al carrito y se descuenta al confirmarse el pago |
| *(precio unitario)* | CU-10 RN-002 | Base de cálculo del descuento; columna no denominada |
| *(peso y dimensiones)* | CU-11 RN-002, A5.1 | Insumo del cálculo de envío; dimensiones declaradas como opcionales |

**`orders`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `order_id` | CU-12 §4 | Identificador |
| `user_id` | CU-12 §4 | Relación con `users` |
| *(estado)* | CU-12 §3, CU-05 RN-003, CU-13 RN-008 | Dominio de valores no unificado; ver decisión D-22 |
| `payment_preference_id` | CU-12 §4 | Identificador de la preferencia generada en la pasarela |
| `payment_id_mp` | CU-12 §3 | Identificador del pago, informado por notificación |
| *(monto total)* | CU-12 §4 | |
| *(costo de envío)* | CU-11 §3, RN-005 | Se registra al confirmarse la orden; columna no denominada |
| *(dirección de envío y datos de facturación)* | CU-12 §4 | Estructura no detallada |
| `tracking_code` | CU-13 RN-002 | Se almacena al generarse el envío |
| `created_at` | CU-05 RN-002 | Base del ordenamiento por defecto |

**`order_items`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `order_id` | CU-12 §4 | Relación con `orders` |
| `product_id` | CU-12 §4 | Relación con `products` |
| *(cantidad)* | CU-05 RN-007 | |
| `unit_price` | CU-05 RN-007, CU-22 RN-007 | Debe conservar el precio vigente al momento de la compra |
| *(descuento aplicado)* | CU-05 RN-007, CU-10 §3 | |

---

## 3. Relaciones detectadas

| Relación | Cardinalidad | Origen | Notas |
| --- | --- | --- | --- |
| `users` — `orders` | 1 : 0..N | CU-12 §4, CU-05 RN-001 | |
| `orders` — `order_items` | 1 : 1..N | CU-12 §4 | |
| `order_items` — `products` | N : 1 | CU-12 §4 | |
| `users` — `carts` | 1 : 0..1 | CU-10 RN-005 | Solo para usuarios registrados |
| `carts` — `products` | N : M con cantidad | CU-10 RN-006 | Un producto figura una sola vez, acumulando cantidad |
| `orders` — `institutions` | 0..1 | CU-12 A10.2, A10.3 | Compra institucional; ver decisión D-26 |

---

## 4. Reglas de negocio consolidadas

| ID propuesto | Origen | Regla |
| --- | --- | --- |
| RN-COM-01 | CU-10 RN-001, RN-002 | El descuento mayorista se aplica al precio unitario cuando la cantidad de un producto supera su umbral configurado |
| RN-COM-02 | CU-10 RN-003, CU-22 RN-003 | El umbral y el porcentaje se configuran conjuntamente: ambos presentes o ambos ausentes |
| RN-COM-03 | CU-10 RN-004 | El stock disponible se valida antes de incorporar un producto al carrito |
| RN-COM-04 | CU-10 RN-005 | El carrito anónimo persiste localmente y se sincroniza con la base de datos al iniciar sesión |
| RN-COM-05 | CU-10 RN-006 | Al incorporar un producto ya presente en el carrito se acumula la cantidad sin duplicar el ítem |
| RN-COM-06 | CU-11 RN-001, RN-002 | El costo de envío se calcula en tiempo real contra el proveedor logístico, en función del código postal, el peso total y las dimensiones disponibles |
| RN-COM-07 | CU-11 RN-003 | La ausencia de cobertura para un código postal se informa explícitamente al usuario |
| RN-COM-08 | CU-11 RN-004, RN-005 | La selección de una opción de envío es requisito para confirmar la compra, y su costo se suma al total |
| RN-COM-09 | CU-11 RN-006 | El código postal se precarga desde la dirección guardada del usuario registrado |
| RN-COM-10 | CU-12 RN-001 | El sistema no almacena datos de tarjetas. La transacción se delega íntegramente a la pasarela mediante tokenización |
| RN-COM-11 | CU-12 RN-002 | La orden se crea en estado inicial antes de derivar a la pasarela |
| RN-COM-12 | CU-12 RN-003 | El stock se reserva al crear la orden y se descuenta definitivamente al confirmarse el pago |
| RN-COM-13 | CU-12 RN-004 | La notificación de la pasarela se autentica verificando su firma |
| RN-COM-14 | CU-12 RN-005 | Confirmado el pago, la orden pasa a estado pagado, se descuenta el stock y se emite el comprobante |
| RN-COM-15 | CU-12 RN-006 | Ante un pago rechazado o cancelado, el stock reservado se libera |
| RN-COM-16 | CU-12 RN-011 | El comprobante de compra se remite por correo electrónico |
| RN-COM-17 | CU-13 RN-001 | El seguimiento está disponible únicamente para pedidos despachados o entregados |
| RN-COM-18 | CU-13 RN-002 | El código de seguimiento se almacena en la orden al generarse el envío |
| RN-COM-19 | CU-13 RN-003 | El estado del envío se consulta al proveedor sin exceder los 5 minutos de antigüedad |
| RN-COM-20 | CU-13 RN-008 | La confirmación de entrega por parte del proveedor actualiza automáticamente el estado de la orden |
| RN-COM-21 | CU-22 RN-001 | Solo el rol administrador configura descuentos mayoristas |
| RN-COM-22 | CU-22 RN-004, RN-005 | El umbral es entero positivo y el descuento un decimal entre 0 y 100 |
| RN-COM-23 | CU-22 RN-007 | La modificación de la configuración mayorista no altera órdenes preexistentes |
| RN-COM-24 | CU-22 RN-008 | Toda modificación de configuración se registra en auditoría con los valores anterior y nuevo |
| RN-COM-25 | CU-10 RN-008, CU-11 RN-008, CU-12 RN-008 a RN-010, CU-13 RN-005, CU-22 RN-009 | Cada operación del circuito emite su evento de analítica |

---

## 5. Requerimientos no funcionales consolidados

### 5.1 Transversales al módulo

| ID propuesto | Categoría | Requerimiento | Origen |
| --- | --- | --- | --- |
| RNF-COM-01 | Compatibilidad | Las vistas del circuito son adaptables, con ancho mínimo soportado de 320 px | CU-10, CU-11, CU-12, CU-13, CU-22 |
| RNF-COM-02 | Disponibilidad | La expiración de sesión durante una operación redirige al ingreso conservando el contexto | CU-10, CU-22 |
| RNF-COM-03 | Escalabilidad | La integración con el proveedor logístico se resuelve mediante un adaptador desacoplado del núcleo | CU-11 RNF-007, CU-13 RNF-008 |
| RNF-COM-04 | Rendimiento | Las operaciones administrativas y de generación de preferencia responden en menos de 2 segundos | CU-12 RNF-004, CU-22 RNF-007 |

### 5.2 Específicos

| ID propuesto | Categoría | Requerimiento | Origen |
| --- | --- | --- | --- |
| RNF-COM-05 | Rendimiento | El recálculo del descuento responde en menos de 200 ms ante un cambio de cantidad | CU-10 RNF-001 |
| RNF-COM-06 | Usabilidad | La condición de descuento se comunica antes de incorporar el producto al carrito | CU-10 RNF-003 |
| RNF-COM-07 | Persistencia | El carrito persiste entre sesiones: localmente para anónimos, en base de datos para registrados | CU-10 RNF-006 |
| RNF-COM-08 | Rendimiento | El cálculo de envío, incluida la consulta al proveedor, resuelve en menos de 3 segundos | CU-11 RNF-001 |
| RNF-COM-09 | Disponibilidad | La falta de respuesta del proveedor logístico se informa con un mensaje comprensible y admite reintento | CU-11 RNF-006 |
| RNF-COM-10 | Seguridad | El código postal no se registra íntegro en los eventos de analítica | CU-11 RNF-008 |
| RNF-COM-11 | Seguridad | Las credenciales de la pasarela residen en variables de entorno, nunca en el código fuente | CU-12 RNF-001 |
| RNF-COM-12 | Seguridad | La verificación de la firma de la notificación se implementa de forma estricta | CU-12 RNF-002 |
| RNF-COM-13 | Rendimiento | La consulta periódica de estado desde el cliente se realiza cada 3 segundos como mínimo | CU-12 RNF-005 |
| RNF-COM-14 | Disponibilidad | El punto de recepción de notificaciones es público y accesible para la pasarela | CU-12 RNF-008 |
| RNF-COM-15 | Disponibilidad | El sistema procesa notificaciones simultáneas sin conflictos de actualización | CU-12 RNF-009 |
| RNF-COM-16 | Rendimiento | La consulta de seguimiento al proveedor resuelve en menos de 3 segundos y se almacena temporalmente por 5 minutos | CU-13 RNF-001, RNF-002 |
| RNF-COM-17 | Disponibilidad | Ante la falta de respuesta del proveedor se exhibe el último estado conocido registrado | CU-13 RNF-007 |
| RNF-COM-18 | Seguridad | El código de seguimiento no se expone en las direcciones de la aplicación | CU-13 RNF-009 |
| RNF-COM-19 | Seguridad | El panel de administración exige autenticación y autorización por rol | CU-22 RNF-001 |
| RNF-COM-20 | Seguridad | Toda operación administrativa se registra en auditoría | CU-22 RNF-002 |

---

## 6. Inconsistencias detectadas y decisiones requeridas

| ID | Situación | Origen | Definición requerida |
| --- | --- | --- | --- |
| **D-22** | El dominio de valores del estado de la orden se expresa en dos idiomas y con conjuntos distintos: pendiente, pagado, enviado, entregado y cancelado en CU-05; `pending`, `paid` y `cancelled` en CU-12; `delivered` en CU-13 | CU-05 RN-003, RN-005 vs. CU-12 §3 vs. CU-13 RN-008 | Unificar el dominio de estados y su idioma |
| **D-23** | La reserva de stock al crear la orden y su liberación ante un pago rechazado se enuncian como reglas, pero ninguna especificación describe el mecanismo ni la entidad que la sostiene. El flujo principal descuenta stock únicamente al confirmarse el pago | CU-12 RN-003, RN-006 vs. CU-12 §4 | Definir si existe reserva efectiva, y en tal caso su representación en el modelo de datos |
| **D-24** | El estado de la orden ante un pago rechazado se deja expresamente indefinido. El texto indica "permanece en pending (o cambia a cancelled)" y, en el flujo alternativo, "según decisión de diseño" | CU-12 RN-006, A3.3 | Definir el estado resultante |
| **D-25** | El seguimiento se especifica como consulta en tiempo real al proveedor, pero el requerimiento de disponibilidad exige exhibir "el último estado conocido almacenado en la base de datos", lo que supone una entidad de persistencia de eventos de seguimiento que no se define | CU-13 RN-003 vs. RNF-007 | Definir si los eventos de seguimiento se persisten y bajo qué entidad |
| **D-26** | La compra institucional se contempla en un flujo alternativo que menciona facturación y envío a nombre de la institución, sin definir cómo se vincula la orden con la institución ni qué atributos se ven afectados | CU-12 A10.2, A10.3 | Definir la relación entre `orders` e `institutions` y sus consecuencias sobre facturación y domicilio |
| **D-27** | El registro de auditoría de operaciones administrativas se describe con sus atributos (identificador del administrador, producto, valores anterior y nuevo, marca temporal) pero sin denominación de entidad | CU-22 §3, RN-008 | Denominar la entidad y definir su alcance: exclusiva del panel administrativo o transversal al sistema |
| **D-28** | El costo de envío se registra en la orden al confirmarse, sin que se declare la columna. Tampoco se define entidad alguna para las opciones de envío ofrecidas al usuario | CU-11 §3, RN-005 | Definir la representación del envío en el modelo de datos |
| **D-29** | La estructura de la dirección de envío y de los datos de facturación no se detalla en ninguna especificación, pese a integrarse en la creación de la orden | CU-12 §4 | Definir los atributos y su ubicación: incorporados a `orders` o en entidad propia |
| **D-30** | La emisión de factura se menciona como flujo opcional sin desarrollo | CU-12 A9 | Definir si integra el alcance |
| **D-31** | El requerimiento de nivel proyecto identificado como RNF03, referido a la no persistencia de datos de tarjeta, se invoca sin figurar entre los 33 casos de uso | CU-12 RN-001 | Vinculada a la decisión D-13 |

---

## 7. Trazabilidad

| Caso de uso | Entidades referidas | Reglas relevadas | RNF relevados | Flujos alternativos |
| --- | --- | --- | --- | --- |
| CU-10 Agregar Producto con Descuento | `products`, `carts` | 8 | 7 | 8 |
| CU-11 Calcular Costo de Envío | `products`, `orders` | 8 | 8 | 7 |
| CU-12 Finalizar Compra | `orders`, `order_items`, `products`, `institutional_teachers` | 11 | 11 | 10 |
| CU-13 Seguir Pedido Logístico | `orders` | 8 | 9 | 7 |
| CU-22 Configurar Descuento Mayorista | `products`, *(auditoría)* | 9 | 9 | 11 |
| **Total** | **5 entidades propias** | **44** | **44** | **43** |

---

## 8. Registro de revisiones

| Revisión | Fecha | Ítem | Descripción | Intervino |
| --- | --- | --- | --- | --- |
| 00 | 24/07/2026 | Documento total | Versión inicial |  |

## 9. Participantes y Aprobaciones

| **Confecciona** | **Revisa** | **Aprueba** |
| --- | --- | --- |
|  |  |  |
