|  | **Sistema ACALUD** |
| --- | --- |
|  | Análisis Transversal — Consolidado General |
|  | Versión: 02 | Fecha: 28/07/2026 | Página: 1 de 9 |

| Información del Documento |
| --- |
| Nombre del Proyecto | Sistema Acalud |
| Tipo de documento | Consolidado del análisis transversal (documento de trabajo) |
| Alcance | 34 especificaciones funcionales — CU-01 a CU-33, más CU-34 |
| Documentos que consolida | Análisis de los módulos 01 a 06 y las decisiones ratificadas por el equipo |
| Propósito | Reunir el catálogo unificado de entidades y el estado final de las definiciones, como base para la elaboración del Diagrama Entidad-Relación. |

---

## 1. Estado de esta versión

Esta versión incorpora las decisiones ratificadas por el equipo de proyecto sobre las 58
definiciones identificadas en el análisis transversal. Respecto de la versión anterior:

- Las 58 definiciones se encuentran **resueltas**, con excepción de las que el equipo
  reservó para una instancia posterior, señaladas en la sección 5.
- Se corrigieron dos especificaciones que reproducían contenido ajeno: CU-24 y CU-20.
- Se incorpora una especificación nueva, CU-34, para el cambio de correo electrónico.
- El alcance del proyecto pasa de 33 a **34 especificaciones funcionales**.

---

## 2. Resumen del relevamiento

| Concepto | Cantidad |
| --- | --- |
| Especificaciones al inicio del análisis | 33 |
| Especificaciones tras las correcciones | 34 |
| Entidades confirmadas para el modelo | 34 |
| Reglas de negocio tras consolidación | 141 |
| Requerimientos no funcionales tras consolidación | 116 |
| Requerimientos de nivel sistema reconstruidos | 5 |
| Definiciones resueltas | 55 |
| Definiciones reservadas para instancia posterior | 3 |

---

## 3. Catálogo definitivo de entidades

El modelo de datos se compone de las siguientes 34 entidades. Las señaladas como incorporadas
resultan de la resolución de definiciones pendientes y responden a un requisito expreso de
alguna especificación; su origen se detalla en el documento de propuestas.

### 3.1 Entidades del corpus original

| # | Entidad | Módulo |
| --- | --- | --- |
| 1 | `users` | Identidad |
| 2 | `teacher_profiles` | Identidad |
| 3 | `levels` | Identidad |
| 4 | `subjects` | Identidad |
| 5 | `products` | Administración |
| 6 | `demos` | Catálogo |
| 7 | `game_progress` | Catálogo |
| 8 | `resources` | Catálogo |
| 9 | `favorites` | Catálogo |
| 10 | `editorial_partners` | Catálogo |
| 11 | `carts` | Compras |
| 12 | `orders` | Compras |
| 13 | `order_items` | Compras |
| 14 | `institutions` | Institucional |
| 15 | `institutional_teachers` | Institucional |
| 16 | `institutional_inventories` | Institucional |
| 17 | `institutional_assignments` | Institucional |
| 18 | `game_sessions` | Institucional |
| 19 | `polls` | Comunidad |
| 20 | `poll_options` | Comunidad |
| 21 | `poll_responses` | Comunidad |
| 22 | `proposals` | Comunidad |

### 3.2 Entidades incorporadas por resolución de definiciones

| # | Entidad | Definición | Requisito de origen |
| --- | --- | --- | --- |
| 23 | `categories` | D-56 | CU-19 sección 1 |
| 24 | `cart_items` | D-05 | CU-10 RN-006 |
| 25 | `audit_log` | D-27 | Siete especificaciones |
| 26 | `notifications` | D-38, D-53 | CU-15, 21, 26, 27 |
| 27 | `login_attempts` | D-08 | CU-02 RN-007 |
| 28 | `sessions` | D-02 | CU-03 objetivo y RNF-002 |
| 29 | `order_tracking_events` | D-25 | CU-13 RNF-007 |

### 3.3 Entidades de infraestructura incorporadas por addendum

Las siguientes entidades no derivan de una especificación funcional sino de requerimientos no
funcionales documentados. Se incorporaron mediante un addendum al esquema, posterior a la
validación inicial, al advertirse que dichos requerimientos carecían de sustento en el modelo.

| # | Entidad | Requerimiento que la origina |
| --- | --- | --- |
| 31 | `processed_payments` | RNF-CU12-002 — procesamiento de notificaciones simultáneas sin conflictos |
| 32 | `outbox_emails` | RF-CU12-006 — remisión del comprobante por correo electrónico |
| 33 | `stock_movements` | RNF-SIS-016 — asiento en auditoría de operaciones sobre datos sensibles |
| 34 | *(reemplazo)* `sessions` sustituye a `revoked_tokens` | CU-03 objetivo — invalidación efectiva de la sesión |

**Sobre la sustitución de `revoked_tokens` por `sessions`.** El esquema inicial contemplaba una
lista de revocación, adecuada para credenciales autocontenidas. La implementación adopta una
sesión opaca con estado en el servidor, que satisface el objetivo de CU-03 de manera más
completa: al cerrar sesión se elimina el registro y la credencial deja de existir, sin ventana
de validez residual. Se documenta como decisión de arquitectura fundada en el propio objetivo
de la especificación.

**Nota sobre la decisión D-18.** El equipo resolvió, con carácter provisional, almacenar los
archivos de recursos en la propia base de datos y controlar el acceso mediante validación de
token, sin dirección prefirmada. No constituye una entidad nueva sino un atributo de
contenido binario en `resources`. La decisión se registró como revisable.

---

## 4. Registro de decisiones ratificadas

Las 58 definiciones se resolvieron conforme al detalle del documento de propuestas
actualizado. La tabla siguiente consigna el resultado y distingue las decisiones en las que
el equipo se apartó de la propuesta original.

| Definición | Resultado | Observación |
| --- | --- | --- |
| D-01 | Numeración por caso de uso: RN-CU\<nn\>-\<nnn\> | **Apartada de la propuesta.** El equipo prefirió la referencia directa al caso de uso |
| D-02 | Entidad `revoked_tokens`, invalidación obligatoria | Según propuesta |
| D-03 | Rol `estudiante` descartado por completo | **Apartada de la propuesta.** Se elimina del dominio; requiere corregir CU-02 |
| D-04, D-34 | `users.role` e `institutional_teachers.is_admin` como conceptos separados | Según propuesta |
| D-05 | Entidades `carts` y `cart_items` | Según propuesta |
| D-06 | `teacher_profiles.email_notifications` | Según propuesta |
| D-07 | bcrypt con factor 12 | Según propuesta |
| D-08 | Entidad `login_attempts`, ambos mecanismos | Según propuesta |
| D-09 | `password_hash` | Según propuesta |
| D-10 | Se crea CU-34 para el cambio de correo | **Apartada de la propuesta.** El equipo optó por especificarlo, no diferirlo |
| D-11 | Diferida; `users.email_verified` reservado | Según propuesta |
| D-12 | Requerimiento exclusivo de plataforma web | Según propuesta |
| D-13, D-31 | Cinco requerimientos de sistema reconstruidos | Según propuesta, con la numeración de D-01 |
| D-14 | Favoritos con tres referencias e índices parciales | Según propuesta |
| D-15 | `download_count` de actualización obligatoria | Según propuesta |
| D-16 | `promotion_starts_at` y `promotion_ends_at` en `resources` | Según propuesta |
| D-17 | `game_progress` | Según propuesta |
| D-18 | Almacenamiento en base de datos, validación por token, sin firma | **Apartada de la propuesta.** Resuelto con carácter provisional y revisable |
| D-19 | `resources.product_id` con admisión de nulo | Según propuesta |
| D-20 | Derecho institucional por tenencia, sin asignación individual | Según propuesta |
| D-21 | Acceso irrestricto del administrador de plataforma | Según propuesta |
| D-22, D-52 | Estados unificados en inglés | Según propuesta |
| D-23 | Sin atributo de reserva; disponibilidad calculada | Según propuesta |
| D-24 | Orden en `pending` ante pago rechazado | Según propuesta |
| D-25 | Entidad `order_tracking_events` | Según propuesta |
| D-26 | `orders.institution_id` con admisión de nulo | Según propuesta |
| D-27 | Entidad `audit_log` transversal | Según propuesta |
| D-28 | `shipping_cost`, `shipping_method`, `shipping_carrier` en `orders` | Según propuesta |
| D-29, D-44 | Estructura de domicilio de cinco componentes | Según propuesta |
| D-30 | Captura de datos de pago en la pasarela; se ajusta CU-12 | **Apartada de la propuesta.** El equipo precisó la ubicación del formulario |
| D-32 | CU-24 redactado con la especificación B2B | Resuelto — ver sección 6 |
| D-33, D-37 | Asignaciones con estado, sin eliminación | Según propuesta |
| D-35 | Restricción de encargado por índice parcial | Según propuesta |
| D-36 | `quantity_assigned` agregado y transaccional | Según propuesta |
| D-38, D-53 | Entidad `notifications` | Según propuesta |
| D-39 | Agregación en tiempo de consulta | Según propuesta |
| D-40 | Reporte tabular y tablero analítico delimitados | Según propuesta |
| D-41 | Nivel educativo desde el perfil del docente | Según propuesta |
| D-42 | `institutional_teacher_id` referido a `institutional_teachers` | Según propuesta |
| D-43 | Sin hora en las sesiones; sin mapa de calor horario | Según propuesta |
| D-45 | CU-20 redactado con reglas de encuestas | Resuelto — ver sección 6 |
| D-46 | Una respuesta por usuario y encuesta | Según propuesta |
| D-47 | Recuento de votos calculado | Según propuesta |
| D-48 | `polls.status` con dominio de tres estados | Según propuesta |
| D-49 | Encuesta con respuestas no eliminable | Según propuesta |
| D-50 | `proposals.target_level_id` | Según propuesta |
| D-51 | Duplicados por título idéntico en 30 días | Según propuesta |
| D-54 | Edición condicionada al estado de la encuesta | Según propuesta |
| D-55 | `products.is_active`, eliminación lógica | Según propuesta |
| D-56 | Entidad `categories` | Según propuesta |
| D-57 | Dirección del motor de juego en la configuración | Según propuesta |
| D-58 | Productos de terceros solo en exhibición | Según propuesta |

---

## 5. Definiciones reservadas para instancia posterior

Tres asuntos no quedan cerrados en esta versión. No bloquean el modelo de datos, pero
requieren una definición antes de su implementación.

| Asunto | Situación | Pendiente |
| --- | --- | --- |
| D-18 | Almacenamiento de archivos resuelto de manera provisional en la base de datos | Confirmar si se migra a almacenamiento de objetos antes de la entrega final |
| D-30 | Ubicación del formulario de pago precisada en la pasarela | Ajustar la redacción de CU-12 en consecuencia |
| Corrección de CU-02 | Derivada de la decisión D-03 | Retirar el rol `estudiante` y su flujo alternativo A4 |

---

## 6. Correcciones aplicadas al corpus

**CU-24 — Adquirir Lote de Juegos Físicos (B2B).** La especificación fue reescrita. Su
objetivo, poscondiciones y reglas describen ahora la adquisición institucional: la orden se
genera con `institution_id` y con el atributo `order_type` en valor `b2b`, el inventario
institucional se incrementa con la confirmación del pago, y el circuito reutiliza la pasarela
de pago con las mismas reglas de seguridad que la compra individual. El atributo `order_type`
se incorpora a la entidad `orders` como resultado de esta corrección.

**CU-20 — Parametrizar Encuesta.** La sección de reglas de negocio fue reescrita. Sus reglas
describen ahora la parametrización de encuestas: cantidad de opciones admitida, unicidad y no
vacuidad de las opciones, activación manual, restricción de edición sobre encuestas activas y
asiento en auditoría.

---

## 7. Observación sobre la evolución del alcance

El análisis transversal partió de 33 especificaciones. Como resultado de su desarrollo, dos
especificaciones fueron corregidas por reproducir contenido ajeno, y se incorporó una
especificación nueva para una funcionalidad que una de las existentes remitía a un flujo
inexistente. El alcance resultante es de 34 especificaciones funcionales.

La incorporación de CU-34 corresponde a la decisión del equipo sobre la definición D-10. Su
especificación se detalla en el documento correspondiente.

---

## 8. Registro de revisiones

| Revisión | Fecha | Ítem | Descripción | Intervino |
| --- | --- | --- | --- | --- |
| 00 | 24/07/2026 | Documento total | Versión inicial |  |
| 01 | 24/07/2026 | Secciones 1, 3, 4, 5, 6, 7 | Incorporación de las decisiones ratificadas por el equipo |  |
| 02 | 28/07/2026 | Sección 3 | Incorporación de las entidades de infraestructura del addendum |  |

## 9. Participantes y Aprobaciones

| **Confecciona** | **Revisa** | **Aprueba** |
| --- | --- | --- |
|  |  |  |
