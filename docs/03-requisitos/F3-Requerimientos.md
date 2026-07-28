|  | **Sistema ACALUD** |
| --- | --- |
|  | Especificación de Requerimientos — Funcionales y No Funcionales |
|  | Versión: 00 | Fecha: 24/07/2026 | Página: 1 de 24 |

| Información del Documento |
| --- |
| Nombre del Proyecto | Sistema Acalud |
| Tipo de documento | Especificación de Requerimientos de Software |
| Alcance | 34 especificaciones funcionales, plataformas web y aplicación móvil |
| Documento antecedente | Análisis Transversal — Consolidado General, versión 01 |
| Propósito | Consolidar los requerimientos funcionales y no funcionales del sistema, deduplicados y organizados por módulo, con identificación de su aplicabilidad a las plataformas web y móvil. |

---

## 1. Introducción

### 1.1 Propósito

Este documento especifica los requerimientos funcionales y no funcionales del sistema Acalud.
Los requerimientos se derivan de las 34 especificaciones funcionales y de las decisiones
ratificadas por el equipo de proyecto.

El análisis transversal relevó 267 reglas de negocio y 253 requerimientos no funcionales
distribuidos en las especificaciones, con un grado considerable de repetición. Este documento
los consolida en un conjunto sin duplicados: 141 requerimientos funcionales y 116 no
funcionales.

### 1.2 Alcance y plataformas

El sistema se despliega en dos plataformas a partir de una base de código común: una
aplicación web y una aplicación móvil empaquetada. Ambas consumen los mismos servicios. En
consecuencia, la mayoría de los requerimientos aplica a ambas plataformas.

Ciertos requerimientos, sin embargo, son propios de una plataforma. Los mecanismos de
almacenamiento local del navegador, las cookies y la sincronización entre pestañas
corresponden a la plataforma web. El almacenamiento seguro del dispositivo y el empaquetado
corresponden a la aplicación móvil. Cada requerimiento indica su aplicabilidad mediante la
siguiente notación:

| Notación | Significado |
| --- | --- |
| **A** | Aplica a ambas plataformas |
| **W** | Aplica exclusivamente a la plataforma web |
| **M** | Aplica exclusivamente a la aplicación móvil |

### 1.3 Convención de identificación

Conforme a la decisión D-01, los requerimientos se identifican con referencia al caso de uso
de origen, según el formato:

- Requerimientos funcionales: **RF-CU\<nn\>-\<nnn\>**
- Requerimientos no funcionales: **RNF-CU\<nn\>-\<nnn\>**

Los requerimientos no funcionales de alcance transversal, que no derivan de un caso de uso
particular sino del sistema en su conjunto, se identifican como **RNF-SIS-\<nnn\>**.

---

## 2. Requerimientos no funcionales de sistema

Los siguientes requerimientos aplican a la totalidad del sistema. Resultan de la
consolidación de enunciados que se repiten en la mayoría de las especificaciones, y de la
reconstrucción de los requerimientos de nivel proyecto (decisión D-13).

### 2.1 Seguridad

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RNF-SIS-001 | A | Toda comunicación que transporte credenciales o datos personales se realiza sobre HTTPS, con TLS en versión 1.2 o superior |
| RNF-SIS-002 | A | Las contraseñas se almacenan exclusivamente como resumen criptográfico mediante bcrypt con factor de costo 12. Nunca se almacenan ni registran en texto plano |
| RNF-SIS-003 | A | El sistema no almacena datos de medios de pago. La captura y el procesamiento del pago se delegan íntegramente a la pasarela |
| RNF-SIS-004 | A | Los servicios que operan sobre datos propios de un usuario verifican la titularidad del recurso y rechazan el acceso de terceros |
| RNF-SIS-005 | A | Las credenciales de servicios externos residen en variables de entorno, nunca en el código fuente |
| RNF-SIS-006 | W | El testigo de sesión se almacena en una cookie con las marcas HttpOnly y Secure |
| RNF-SIS-007 | M | El testigo de sesión se almacena en el almacenamiento seguro del dispositivo |

### 2.2 Rendimiento

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RNF-SIS-008 | A | Las operaciones interactivas del sistema resuelven en menos de 2 segundos bajo condiciones normales de operación |
| RNF-SIS-009 | A | Las operaciones que involucran agregación de datos o generación de reportes resuelven en menos de 3 segundos |

### 2.3 Compatibilidad

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RNF-SIS-010 | A | La interfaz es adaptable y opera correctamente en distintos tamaños de pantalla, con un ancho mínimo soportado de 320 píxeles |
| RNF-SIS-011 | W | La aplicación web opera correctamente en las versiones vigentes de los navegadores de uso corriente |
| RNF-SIS-012 | M | La aplicación móvil se distribuye como paquete instalable y opera sin conexión permanente para las funciones que no requieren servidor |

### 2.4 Arquitectura y mantenibilidad

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RNF-SIS-013 | A | Las integraciones con servicios externos se resuelven mediante adaptadores desacoplados del núcleo, que permiten su sustitución sin afectar la lógica de negocio |
| RNF-SIS-014 | A | El sistema persiste sus datos sobre PostgreSQL, por integridad transaccional y trazabilidad |
| RNF-SIS-015 | A | Los componentes funcionales son independientes y admiten la incorporación de nuevos elementos sin reestructurar los existentes |

### 2.5 Trazabilidad y auditoría

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RNF-SIS-016 | A | Las operaciones administrativas y las que modifican datos sensibles se asientan en un registro de auditoría con el usuario, la acción, la entidad afectada y el instante |
| RNF-SIS-017 | A | Las operaciones relevantes emiten un evento de analítica con datos anonimizados |

---

## 3. Módulo 1 · Identidad y Acceso

Comprende los casos de uso CU-01 (Registrar Docente), CU-02 (Iniciar Sesión), CU-03 (Cerrar
Sesión), CU-04 (Actualizar Perfil) y CU-34 (Cambiar Correo Electrónico). El historial de
compras (CU-05) se especifica en el módulo de Compras por operar sobre sus entidades.

### 3.1 Requerimientos funcionales

**CU-01 · Registrar Docente**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU01-001 | A | El sistema permite registrar una cuenta de docente con nombre completo, correo electrónico y contraseña |
| RF-CU01-002 | A | El correo electrónico es único en el sistema; no se admiten dos cuentas con el mismo correo |
| RF-CU01-003 | A | El rol asignado por defecto a una cuenta nueva es docente |
| RF-CU01-004 | A | La contraseña debe cumplir una longitud mínima de ocho caracteres, con al menos un número y una mayúscula |
| RF-CU01-005 | A | El perfil docente es opcional en el registro y puede completarse posteriormente |
| RF-CU01-006 | A | Al registrarse desde un carrito con productos, estos se incorporan automáticamente a la cuenta |

**CU-02 · Iniciar Sesión**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU02-001 | A | El sistema permite iniciar sesión con correo electrónico y contraseña |
| RF-CU02-002 | A | La contraseña se verifica contra su resumen criptográfico almacenado |
| RF-CU02-003 | A | El inicio de sesión exitoso registra el instante del acceso |
| RF-CU02-004 | A | El sistema ofrece una opción de sesión persistente que extiende su vigencia |
| RF-CU02-005 | A | Tras tres intentos fallidos consecutivos, la cuenta se bloquea por quince minutos |
| RF-CU02-006 | A | El sistema registra los intentos de acceso fallidos por cuenta |
| RF-CU02-007 | W | El carrito anónimo almacenado localmente se sincroniza con la cuenta al iniciar sesión |

**CU-03 · Cerrar Sesión**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU03-001 | A | El cierre de sesión está disponible desde cualquier vista en que el usuario haya iniciado sesión |
| RF-CU03-002 | A | El cierre de sesión invalida el testigo de sesión en el servidor |
| RF-CU03-003 | A | El cierre de sesión limpia el estado de autenticación local |
| RF-CU03-004 | A | Al cerrar sesión, el carrito conserva sus productos en modo anónimo |
| RF-CU03-005 | A | El cierre de sesión redirige a la página de inicio |
| RF-CU03-006 | W | El cierre de sesión se propaga a las demás pestañas abiertas del mismo dominio |

**CU-04 · Actualizar Perfil**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU04-001 | A | El sistema permite modificar el nombre completo, el nivel educativo, la materia y la institución del perfil |
| RF-CU04-002 | A | El nombre completo es obligatorio |
| RF-CU04-003 | A | El nivel y la materia son opcionales; de informarse, deben corresponder a valores existentes |
| RF-CU04-004 | A | El correo electrónico no se modifica desde este caso de uso |
| RF-CU04-005 | A | Si el usuario no posee perfil docente, se crea al guardar por primera vez |
| RF-CU04-006 | A | El formulario precarga los datos vigentes del usuario |
| RF-CU04-007 | A | El usuario puede cancelar la edición descartando los cambios |

**CU-34 · Cambiar Correo Electrónico**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU34-001 | A | El sistema permite solicitar el cambio de correo electrónico, requiriendo el nuevo correo y la contraseña vigente |
| RF-CU34-002 | A | El nuevo correo no se hace efectivo hasta que se confirma su titularidad mediante un enlace de verificación |
| RF-CU34-003 | A | El correo anterior permanece vigente hasta la confirmación del nuevo |
| RF-CU34-004 | A | El nuevo correo debe ser único en el sistema |
| RF-CU34-005 | A | El cambio efectivo se notifica al correo anterior a título informativo |

### 3.2 Requerimientos no funcionales

| ID | Plat. | Cat. | Requerimiento |
| --- | --- | --- | --- |
| RNF-CU01-001 | A | Usabilidad | El formulario de registro no expone más de cinco campos simultáneos |
| RNF-CU01-002 | A | Disponibilidad | El registro admite un máximo de cinco intentos por origen cada quince minutos |
| RNF-CU02-001 | A | Disponibilidad | El inicio de sesión admite un máximo de cinco intentos por origen por minuto |
| RNF-CU02-002 | A | Usabilidad | El formulario de inicio de sesión expone enlaces visibles a la recuperación de contraseña y al registro |
| RNF-CU02-003 | W | Disponibilidad | La sesión persiste al cerrar el navegador cuando se seleccionó la opción de sesión persistente |
| RNF-CU03-001 | A | Usabilidad | El cierre de sesión no requiere más de dos acciones y solicita confirmación |
| RNF-CU03-002 | A | Rendimiento | El cierre de sesión local se completa en menos de 500 milisegundos |
| RNF-CU04-001 | A | Usabilidad | El formulario distingue con claridad los campos modificables de los de solo lectura |
| RNF-CU04-002 | A | Usabilidad | El sistema exhibe mensajes de éxito o error claros tras la operación |
| RNF-CU04-003 | A | Disponibilidad | La expiración de sesión durante la edición redirige al ingreso conservando el contexto |
| RNF-CU34-001 | A | Seguridad | El enlace de verificación se transmite exclusivamente al nuevo correo y es de un solo uso |

---

## 4. Módulo 2 · Catálogo y Contenido

Comprende los casos de uso CU-06, CU-07 (demos), CU-08, CU-09 (recursos), CU-17 (editoriales)
y CU-18 (favoritos).

### 4.1 Requerimientos funcionales

**CU-06 · Probar Demo (usuario anónimo)**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU06-001 | A | El sistema permite a un usuario no autenticado probar la demo de un juego con límites de tiempo o turnos |
| RF-CU06-002 | A | Al finalizar la demo, el sistema presenta una invitación al registro |
| RF-CU06-003 | A | La demo anónima no persiste progreso; cada sesión comienza desde cero |
| RF-CU06-004 | A | Al registrarse desde la invitación, la demo se recarga sin límites |

**CU-07 · Probar Demo (usuario registrado)**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU07-001 | A | El usuario registrado accede a la demo sin límites de tiempo ni turnos |
| RF-CU07-002 | A | El progreso de la demo se guarda automáticamente al finalizar cada partida |
| RF-CU07-003 | A | El progreso incluye la mejor puntuación, la cantidad de partidas y la fecha de la última |
| RF-CU07-004 | A | El progreso está disponible desde cualquier dispositivo mientras la sesión esté iniciada |
| RF-CU07-005 | A | Al finalizar, el sistema ofrece los recursos asociados al juego |

**CU-08 · Descargar Recurso Libre**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU08-001 | A | El sistema permite descargar recursos gratuitos sin requerir autenticación |
| RF-CU08-002 | A | El centro de descargas exhibe únicamente los recursos gratuitos |
| RF-CU08-003 | A | El tipo de recurso determina la acción: descarga directa o redirección externa |
| RF-CU08-004 | A | El contador de descargas del recurso se incrementa con cada descarga exitosa |
| RF-CU08-005 | A | El usuario registrado puede guardar recursos gratuitos como favoritos |

**CU-09 · Descargar Recurso Licenciado**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU09-001 | A | El acceso a un recurso licenciado requiere autenticación y verificación de derecho |
| RF-CU09-002 | A | El derecho se concede por compra individual del producto o por tenencia institucional |
| RF-CU09-003 | A | Ante la ausencia de derecho, el sistema informa las opciones para adquirir el producto |
| RF-CU09-004 | A | El acceso a un recurso licenciado se concede mediante una dirección de descarga de vigencia acotada |
| RF-CU09-005 | A | El administrador de plataforma accede a cualquier recurso sin restricción |

**CU-17 · Explorar Editoriales Aliadas**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU17-001 | A | El directorio exhibe únicamente las editoriales activas |
| RF-CU17-002 | A | La dirección externa de una editorial se abre en una vista nueva |
| RF-CU17-003 | A | Un usuario anónimo que solicita salir al sitio externo recibe una invitación al registro |
| RF-CU17-004 | A | El usuario registrado puede guardar editoriales como favoritas |

**CU-18 · Guardar Favorito**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU18-001 | A | El sistema permite guardar como favorito un producto, un recurso o una editorial |
| RF-CU18-002 | A | Cada elemento puede guardarse una sola vez por usuario |
| RF-CU18-003 | A | El guardado opera por alternancia: una segunda acción elimina el favorito |
| RF-CU18-004 | A | El guardado de favoritos requiere autenticación |

### 4.2 Requerimientos no funcionales

| ID | Plat. | Cat. | Requerimiento |
| --- | --- | --- | --- |
| RNF-CU06-001 | A | Seguridad | La demo se ejecuta en un entorno aislado que previene la inyección de secuencias de comandos |
| RNF-CU06-002 | A | Rendimiento | La demo carga en menos de 3 segundos |
| RNF-CU07-001 | A | Rendimiento | El guardado de progreso es asíncrono y no interrumpe la partida |
| RNF-CU08-001 | A | Rendimiento | El inicio de la descarga responde en menos de 1 segundo |
| RNF-CU09-001 | A | Seguridad | La verificación de derecho se resuelve en el servidor, nunca en el cliente |
| RNF-CU09-002 | A | Seguridad | Las direcciones de descarga de recursos licenciados expiran a los cinco minutos |
| RNF-CU09-003 | A | Usabilidad | Los recursos licenciados se distinguen visualmente de los gratuitos |
| RNF-CU17-001 | W | Usabilidad | La dirección externa se abre en una pestaña nueva |
| RNF-CU18-001 | A | Usabilidad | El control de favorito refleja su estado actual y mide al menos 44 píxeles |

---

## 5. Módulo 3 · Compras y Logística

Comprende los casos de uso CU-10 (carrito), CU-11 (envío), CU-12 (checkout), CU-13
(seguimiento), CU-05 (historial) y CU-22 (configuración de descuentos).

### 5.1 Requerimientos funcionales

**CU-10 · Agregar Producto con Descuento Mayorista**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU10-001 | A | El descuento mayorista se aplica cuando la cantidad de un producto supera su umbral configurado |
| RF-CU10-002 | A | El stock disponible se valida antes de incorporar un producto al carrito |
| RF-CU10-003 | A | Al incorporar un producto ya presente en el carrito, se acumula la cantidad sin duplicar el ítem |
| RF-CU10-004 | A | El precio y el descuento se recalculan al modificar la cantidad |
| RF-CU10-005 | W | El carrito anónimo persiste localmente y se sincroniza con la cuenta al iniciar sesión |

**CU-11 · Calcular Costo de Envío**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU11-001 | A | El costo de envío se calcula en tiempo real en función del código postal, el peso y las dimensiones |
| RF-CU11-002 | A | La ausencia de cobertura para un código postal se informa explícitamente |
| RF-CU11-003 | A | La selección de una opción de envío es requisito para confirmar la compra |
| RF-CU11-004 | A | El costo de envío se suma al total del pedido |
| RF-CU11-005 | A | El código postal se precarga desde la dirección guardada del usuario registrado |

**CU-12 · Finalizar Compra**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU12-001 | A | La captura y el procesamiento de los datos de pago se realizan en la pasarela, no en el sistema |
| RF-CU12-002 | A | La orden se crea en estado inicial antes de derivar a la pasarela |
| RF-CU12-003 | A | La notificación de la pasarela se autentica verificando su firma |
| RF-CU12-004 | A | Confirmado el pago, la orden pasa a estado pagado, se descuenta el stock y se emite el comprobante |
| RF-CU12-005 | A | Ante un pago rechazado o cancelado, la orden permanece en estado pendiente |
| RF-CU12-006 | A | El comprobante de compra se remite por correo electrónico |

**CU-13 · Seguir Pedido Logístico**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU13-001 | A | El seguimiento está disponible únicamente para pedidos despachados o entregados |
| RF-CU13-002 | A | El código de seguimiento se almacena en la orden al generarse el envío |
| RF-CU13-003 | A | El estado del envío se consulta al proveedor, y se conserva el último estado conocido |
| RF-CU13-004 | A | La confirmación de entrega por el proveedor actualiza el estado de la orden |

**CU-05 · Ver Historial de Compras**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU05-001 | A | El historial muestra únicamente las órdenes del usuario autenticado |
| RF-CU05-002 | A | Las órdenes se ordenan por defecto de más reciente a más antigua |
| RF-CU05-003 | A | El código de seguimiento se muestra solo en estado despachado o entregado |
| RF-CU05-004 | A | El usuario puede filtrar por estado y ordenar por fecha o monto |
| RF-CU05-005 | A | El detalle de una orden incluye productos, cantidades, precios y descuentos |

**CU-22 · Configurar Descuento Mayorista**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU22-001 | A | Solo el administrador de plataforma configura descuentos mayoristas |
| RF-CU22-002 | A | El umbral y el porcentaje se completan conjuntamente o quedan ambos vacíos |
| RF-CU22-003 | A | El umbral es un entero positivo y el descuento un valor entre cero y cien |
| RF-CU22-004 | A | La modificación de la configuración no altera las órdenes existentes |

### 5.2 Requerimientos no funcionales

| ID | Plat. | Cat. | Requerimiento |
| --- | --- | --- | --- |
| RNF-CU10-001 | A | Rendimiento | El recálculo del descuento responde en menos de 200 milisegundos |
| RNF-CU10-002 | A | Usabilidad | La condición de descuento se comunica antes de incorporar el producto |
| RNF-CU11-001 | A | Rendimiento | El cálculo de envío resuelve en menos de 3 segundos |
| RNF-CU11-002 | A | Disponibilidad | La falta de respuesta del proveedor se informa y admite reintento |
| RNF-CU12-001 | A | Seguridad | La verificación de la firma de la notificación se implementa de forma estricta |
| RNF-CU12-002 | A | Disponibilidad | El sistema procesa notificaciones simultáneas sin conflictos de actualización |
| RNF-CU12-003 | A | Disponibilidad | El punto de recepción de notificaciones es accesible para la pasarela |
| RNF-CU13-001 | A | Rendimiento | La consulta de seguimiento resuelve en menos de 3 segundos y se conserva por cinco minutos |
| RNF-CU13-002 | A | Disponibilidad | Ante la falta de respuesta del proveedor se exhibe el último estado conocido |
| RNF-CU05-001 | A | Seguridad | La consulta de una orden verifica su pertenencia al usuario y rechaza el acceso de terceros |
| RNF-CU05-002 | A | Rendimiento | El listado de órdenes se pagina |
| RNF-CU22-001 | A | Trazabilidad | Toda modificación de la configuración se asienta en auditoría con los valores anterior y nuevo |

---

## 6. Módulo 4 · Institucional

Comprende los casos de uso CU-23 (registro), CU-24 (adquisición de lotes), CU-25 (inventario),
CU-26 (asignación), CU-27 (revocación), CU-28 (listado de docentes), CU-29 (registro de
sesiones), CU-30 (sesiones propias), CU-31 (reporte), CU-32 (exportación) y CU-33 (tablero).

### 6.1 Requerimientos funcionales

**CU-23 · Registrar Institución**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU23-001 | A | El sistema permite registrar una institución con nombre legal, identificador tributario, dirección y correo |
| RF-CU23-002 | A | El identificador tributario y el correo institucional son únicos en el sistema |
| RF-CU23-003 | A | Un usuario es encargado de una sola institución |
| RF-CU23-004 | A | El usuario que registra la institución queda como encargado principal |

**CU-24 · Adquirir Lote de Juegos Físicos**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU24-001 | A | Solo el encargado institucional realiza compras en nombre de la institución |
| RF-CU24-002 | A | La compra institucional genera una orden de tipo institucional asociada a la institución |
| RF-CU24-003 | A | El descuento por lote se aplica según la cantidad total de unidades del mismo producto |
| RF-CU24-004 | A | Confirmado el pago, el inventario institucional se incrementa con las cantidades adquiridas |
| RF-CU24-005 | A | Confirmado el pago, el stock general del producto se decrementa en la cantidad adquirida |
| RF-CU24-006 | A | La facturación se emite a nombre de la institución |

**CU-25 · Ver Tenencia de Licencias**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU25-001 | A | El inventario institucional muestra los productos adquiridos por la institución |
| RF-CU25-002 | A | La cantidad disponible resulta de restar la asignada a la adquirida |
| RF-CU25-003 | A | Solo el encargado accede al inventario completo |
| RF-CU25-004 | A | El docente accede únicamente a los juegos que tiene asignados |
| RF-CU25-005 | A | El inventario muestra el historial de órdenes asociadas a cada producto |

**CU-26 · Asignar Licencia a un Docente**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU26-001 | A | Solo el encargado asigna licencias a docentes |
| RF-CU26-002 | A | La asignación verifica disponibilidad y no puede exceder la cantidad disponible |
| RF-CU26-003 | A | Un docente admite múltiples asignaciones del mismo producto |
| RF-CU26-004 | A | La cantidad asignada es mayor a cero |
| RF-CU26-005 | A | El inventario se actualiza automáticamente al asignar |
| RF-CU26-006 | A | El docente recibe una notificación con los detalles de la asignación |

**CU-27 · Revocar Licencia a un Docente**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU27-001 | A | Solo el encargado revoca licencias |
| RF-CU27-002 | A | La revocación puede ser parcial o total |
| RF-CU27-003 | A | La cantidad a revocar es mayor a cero y no supera la asignada |
| RF-CU27-004 | A | El inventario se actualiza automáticamente al revocar |
| RF-CU27-005 | A | El docente recibe una notificación con los detalles de la revocación |
| RF-CU27-006 | A | Las asignaciones revocadas se conservan en el historial con su fecha y responsable |

**CU-28 · Ver Listado de Docentes Asignados**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU28-001 | A | Solo el encargado ve el listado de docentes de la institución |
| RF-CU28-002 | A | El listado incluye a todos los docentes vinculados, aun sin asignaciones |
| RF-CU28-003 | A | El encargado puede filtrar por producto y estado, y buscar por nombre |
| RF-CU28-004 | A | El detalle de un docente muestra sus asignaciones, incluidas las revocadas |

**CU-29 · Cargar Estadísticas de Uso**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU29-001 | A | Solo el docente con el juego asignado registra sesiones de uso |
| RF-CU29-002 | A | La fecha de la sesión no admite valores futuros |
| RF-CU29-003 | A | La cantidad de estudiantes y la duración son mayores a cero |
| RF-CU29-004 | A | Los aprendizajes clave requieren al menos veinte caracteres |
| RF-CU29-005 | A | La satisfacción se registra en una escala de uno a cinco |

**CU-30 · Ver Mis Sesiones**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU30-001 | A | El docente accede únicamente a sus propias sesiones |
| RF-CU30-002 | A | Las sesiones se ordenan por defecto de más reciente a más antigua |
| RF-CU30-003 | A | El docente puede filtrar por juego, rango de fechas y satisfacción |
| RF-CU30-004 | A | El resumen muestra el total de sesiones, estudiantes alcanzados y satisfacción promedio |

**CU-31 · Ver Reporte de Uso Institucional**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU31-001 | A | Solo el encargado accede a los reportes institucionales |
| RF-CU31-002 | A | El reporte agrega las sesiones de todos los docentes de la institución |
| RF-CU31-003 | A | El reporte admite filtro por rango de fechas, juego y docente |
| RF-CU31-004 | A | El reporte expone total de sesiones, estudiantes, satisfacción promedio, juegos más usados y docentes más activos |
| RF-CU31-005 | A | El encargado puede exportar el reporte |

**CU-32 · Exportar Reporte**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU32-001 | A | Solo el encargado exporta reportes |
| RF-CU32-002 | A | Los formatos de exportación son documento portátil y planilla de cálculo |
| RF-CU32-003 | A | El archivo exportado consigna la institución, la fecha de generación y los filtros aplicados |
| RF-CU32-004 | A | La ausencia de datos para exportar se informa y permite ajustar los filtros |

**CU-33 · Ver Dashboard de Métricas Pedagógicas**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU33-001 | A | Solo el encargado accede al tablero pedagógico |
| RF-CU33-002 | A | El tablero expone indicadores generales, métricas por juego y por docente, y análisis temporal |
| RF-CU33-003 | A | Los filtros se aplican en cascada sobre todas las visualizaciones |
| RF-CU33-004 | A | La nube de aprendizajes se construye por frecuencia de mención |
| RF-CU33-005 | A | El análisis de satisfacción muestra la distribución y los promedios por juego y docente |

### 6.2 Requerimientos no funcionales

| ID | Plat. | Cat. | Requerimiento |
| --- | --- | --- | --- |
| RNF-CU23-001 | A | Privacidad | Los datos sensibles de la institución no se exponen en registros de acceso público |
| RNF-CU25-001 | A | Usabilidad | El inventario se presenta con totales de adquiridos, asignados y disponibles |
| RNF-CU26-001 | A | Usabilidad | La asignación valida en tiempo real que la cantidad no exceda la disponibilidad |
| RNF-CU27-001 | A | Usabilidad | La revocación es reversible mediante una nueva asignación |
| RNF-CU29-001 | A | Usabilidad | El formulario de sesión expone un contador de caracteres y un selector de satisfacción |
| RNF-CU29-002 | A | Seguridad | El registro de sesión valida que el docente tenga el producto asignado |
| RNF-CU31-001 | A | Rendimiento | El reporte con métricas agregadas resuelve en menos de 3 segundos |
| RNF-CU32-001 | A | Rendimiento | La exportación resuelve en menos de 5 segundos para documento portátil y 10 para planilla |
| RNF-CU32-002 | A | Compatibilidad | Las planillas exportadas son compatibles con las suites de oficina de uso corriente |
| RNF-CU33-001 | A | Usabilidad | Los gráficos son interactivos, con detalle al posarse y filtrado al seleccionar |
| RNF-CU33-002 | A | Escalabilidad | El tablero opera eficientemente sobre volúmenes de miles de sesiones |

---

## 7. Módulo 5 · Comunidad

Comprende los casos de uso CU-14 (participar en encuesta), CU-15 (enviar propuesta), CU-16
(resultados), CU-20 (parametrizar encuesta) y CU-21 (revisar propuestas).

### 7.1 Requerimientos funcionales

**CU-14 · Participar en Encuesta**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU14-001 | A | Un usuario participa una sola vez por encuesta |
| RF-CU14-002 | A | Solo las encuestas activas resultan visibles y votables |
| RF-CU14-003 | A | Las encuestas admiten segmentación opcional por nivel educativo |
| RF-CU14-004 | A | Los resultados se muestran de forma agregada, sin identificación de participantes |
| RF-CU14-005 | A | La participación requiere autenticación; la consulta de resultados no |

**CU-15 · Enviar Propuesta de Juego**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU15-001 | A | El título y la descripción son obligatorios; la descripción requiere al menos cincuenta caracteres |
| RF-CU15-002 | A | La propuesta se crea en estado pendiente de revisión |
| RF-CU15-003 | A | El usuario consulta el estado de sus propuestas en cualquier momento |
| RF-CU15-004 | A | La materia y el nivel educativo son opcionales |
| RF-CU15-005 | A | No se admiten propuestas con título idéntico del mismo usuario dentro de un período acotado |

**CU-16 · Ver Resultados de Encuestas**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU16-001 | A | La consulta de resultados es pública |
| RF-CU16-002 | A | Los resultados se muestran como porcentajes y total de votos, sin detalle por usuario |
| RF-CU16-003 | A | Al usuario que ya participó se le destaca su opción |
| RF-CU16-004 | A | Las encuestas finalizadas se muestran con un indicador propio |
| RF-CU16-005 | A | Sin votos registrados, los porcentajes son cero y se informa la ausencia de participación |

**CU-20 · Parametrizar Encuesta**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU20-001 | A | Solo el administrador de plataforma gestiona encuestas |
| RF-CU20-002 | A | Una encuesta tiene entre dos y diez opciones de respuesta |
| RF-CU20-003 | A | Las opciones no pueden estar vacías ni duplicadas |
| RF-CU20-004 | A | La encuesta se crea inactiva y se activa mediante una acción explícita |
| RF-CU20-005 | A | Una encuesta activa no admite edición; debe desactivarse previamente |

**CU-21 · Revisar Propuestas de Juegos**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU21-001 | A | Solo el administrador de plataforma revisa propuestas |
| RF-CU21-002 | A | El estado de la propuesta evoluciona a revisada, aprobada o rechazada |
| RF-CU21-003 | A | El comentario del administrador es opcional y puede registrarse sin cambiar el estado |
| RF-CU21-004 | A | El autor recibe una notificación al cambiar el estado de su propuesta |
| RF-CU21-005 | A | Una propuesta revisada no retorna al estado pendiente |

### 7.2 Requerimientos no funcionales

| ID | Plat. | Cat. | Requerimiento |
| --- | --- | --- | --- |
| RNF-CU14-001 | A | Privacidad | La participación se almacena con identificación para validar unicidad y se expone de forma anónima |
| RNF-CU14-002 | A | Usabilidad | Los resultados se presentan mediante gráficos de lectura sencilla |
| RNF-CU15-001 | A | Usabilidad | El formulario de propuesta expone un contador de caracteres |
| RNF-CU16-001 | A | Escalabilidad | La consulta de resultados se apoya en índices sobre participación y opciones |
| RNF-CU20-001 | A | Usabilidad | La composición de opciones admite agregar y quitar dinámicamente |
| RNF-CU21-001 | A | Usabilidad | El listado de propuestas distingue los estados y admite filtro, búsqueda y ordenamiento |

---

## 8. Módulo 6 · Administración de Catálogo

Comprende el caso de uso CU-19 (gestión de catálogo).

### 8.1 Requerimientos funcionales

**CU-19 · Gestionar Catálogo**

| ID | Plat. | Requerimiento |
| --- | --- | --- |
| RF-CU19-001 | A | Solo el administrador de plataforma gestiona el catálogo |
| RF-CU19-002 | A | Los productos de terceros requieren dirección externa; los de marca propia no la llevan |
| RF-CU19-003 | A | El precio y el stock son mayores o iguales a cero |
| RF-CU19-004 | A | La configuración de la demo constituye una estructura válida |
| RF-CU19-005 | A | Los recursos son de tipo documento o enlace; los del primer tipo apuntan a un archivo |
| RF-CU19-006 | A | La eliminación de un producto con órdenes asociadas se resuelve por desactivación lógica |

### 8.2 Requerimientos no funcionales

| ID | Plat. | Cat. | Requerimiento |
| --- | --- | --- | --- |
| RNF-CU19-001 | A | Usabilidad | Los formularios validan en tiempo real |
| RNF-CU19-002 | A | Usabilidad | El listado de productos admite búsqueda, filtros y paginación |
| RNF-CU19-003 | A | Integridad | La eliminación de productos es lógica, para preservar las órdenes históricas |

---

## 9. Resumen de requerimientos

| Módulo | Req. funcionales | Req. no funcionales |
| --- | --- | --- |
| Sistema (transversales) | — | 17 |
| 1 · Identidad y Acceso | 31 | 11 |
| 2 · Catálogo y Contenido | 27 | 9 |
| 3 · Compras y Logística | 29 | 12 |
| 4 · Institucional | 54 | 11 |
| 5 · Comunidad | 25 | 6 |
| 6 · Administración | 6 | 3 |
| **Total** | **172** | **69** |

La distribución por plataforma muestra que la amplia mayoría de los requerimientos aplica a
ambas. Los requerimientos exclusivos de la plataforma web corresponden a los mecanismos de
almacenamiento local, cookies y sincronización entre pestañas. Los exclusivos de la
aplicación móvil corresponden al almacenamiento seguro del dispositivo y al empaquetado.

---

## 10. Registro de revisiones

| Revisión | Fecha | Ítem | Descripción | Intervino |
| --- | --- | --- | --- | --- |
| 00 | 24/07/2026 | Documento total | Versión inicial |  |

## 11. Participantes y Aprobaciones

| **Confecciona** | **Revisa** | **Aprueba** |
| --- | --- | --- |
|  |  |  |
