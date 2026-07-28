|  | **Sistema ACALUD** |
| --- | --- |
|  | Análisis Transversal — Módulo 04: Institucional |
|  | Versión: 00 | Fecha: 24/07/2026 | Página: 1 de 8 |

| Información del Documento |
| --- |
| Nombre del Proyecto | Sistema Acalud |
| Tipo de documento | Análisis transversal de especificaciones funcionales (documento de trabajo) |
| Casos de uso analizados | CU-23, CU-24, CU-25, CU-26, CU-27, CU-28, CU-29, CU-30, CU-31, CU-32, CU-33 |
| Propósito | Consolidar entidades, atributos, relaciones, reglas de negocio y requerimientos no funcionales como insumo para el Diagrama Entidad-Relación y el documento de requerimientos. |

---

## 1. Alcance del análisis

Se relevaron las once especificaciones del circuito institucional: registro de la
institución, adquisición de lotes, consulta de inventario, asignación y revocación de
licencias a docentes, listado de docentes asignados, registro y consulta de sesiones de uso,
reportes, exportación y tablero de métricas pedagógicas.

Este módulo concentra el diferencial pedagógico del sistema y es, a la vez, el que presenta
la mayor cantidad de definiciones pendientes. Se destaca especialmente la observación
registrada como decisión D-32, que afecta la integridad del circuito completo.

La sección 8 (Modelo Conceptual de Datos) se encuentra sin completar en las once
especificaciones.

---

## 2. Catálogo de entidades

### 2.1 Entidades identificadas

| Entidad | Origen (CU / sección) | Naturaleza |
| --- | --- | --- |
| `institutions` | CU-23 §3, RN-001 | Transaccional — núcleo |
| `institutional_teachers` | CU-23 §3, RN-004 | Vínculo entre usuario e institución |
| `institutional_inventories` | CU-25 RN-001 | Tenencia de productos por institución |
| `institutional_assignments` | CU-26 §3, RN-006 | Asignación de unidades a docentes |
| `game_sessions` | CU-29 §3, RN-006 | Registro pedagógico de uso |

### 2.2 Atributos relevados

**`institutions`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `institution_id` | CU-23 §3 | Identificador |
| `legal_name` | CU-23 RN-006 | Obligatorio |
| `tax_id` | CU-23 RN-001, A2.1 | Único. Formato de once dígitos con separadores |
| *(email institucional)* | CU-23 RN-002, A3.1 | Único en el sistema |
| *(dirección)* | CU-23 RN-006 | Obligatoria; estructura no detallada |

**`institutional_teachers`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `institution_id` | CU-23 §3 | Relación con `institutions` |
| *(identificador del docente)* | CU-26 RN-006, CU-29 RN-006 | Denominación no unificada; ver decisión D-42 |
| `is_admin` | CU-23 RN-004, CU-25 RN-004 | Distingue al encargado del docente |

**`institutional_inventories`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `institution_id` | CU-25 RN-001 | Relación con `institutions` |
| `product_id` | CU-25 §4 | Relación con `products` |
| `quantity_purchased` | CU-25 RN-002 | |
| `quantity_assigned` | CU-25 RN-002, CU-26 RN-007 | Dato derivado; ver decisión D-36 |
| *(fecha de adquisición)* | CU-25 §3 | Columna no denominada |
| *(orden asociada)* | CU-25 RN-007 | Relación con `orders`; no denominada |

**`institutional_assignments`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `institution_id` | CU-26 RN-006 | |
| `teacher_id` | CU-26 RN-006 | |
| `product_id` | CU-26 RN-006 | |
| `quantity_assigned` | CU-26 §3, RN-006 | |
| `assigned_by` | CU-26 RN-006 | Encargado que realizó la asignación |
| `assigned_at` | CU-26 RN-006 | |
| *(estado)* | CU-28 RN-003 | **No enumerado entre los atributos**; ver decisión D-37 |

**`game_sessions`** — atributos relevados de CU-29 y CU-30

| Atributo | Origen | Notas |
| --- | --- | --- |
| `session_id` | CU-29 §3 | Identificador |
| `institutional_teacher_id` | CU-29 RN-006 | Ver decisión D-42 |
| `product_id` | CU-29 RN-006 | |
| `session_date` | CU-30 RN-002 | No admite fecha futura (CU-29 RN-002) |
| `group_name` | CU-30 §3 | Grupo o curso |
| `student_count` | CU-29 RN-003 | Mayor a cero |
| `duration_minutes` | CU-29 RN-003 | Mayor a cero |
| `teacher_satisfaction` | CU-29 RN-005 | Escala de 1 a 5 |
| `key_learnings` | CU-29 RN-004 | Mínimo 20 caracteres |
| *(dificultades)* | CU-30 §3 | |
| `would_reuse` | CU-30 §3 | |

---

## 3. Relaciones detectadas

| Relación | Cardinalidad | Origen | Notas |
| --- | --- | --- | --- |
| `users` — `institutional_teachers` — `institutions` | N : M | CU-23 §3 | Restringida por CU-23 RN-003; ver decisión D-35 |
| `institutions` — `institutional_inventories` — `products` | N : M con cantidades | CU-25 RN-001 | Un registro por par institución-producto |
| `institutional_inventories` — `orders` | 0..N | CU-25 RN-007 | Historial de compras del producto |
| `institutional_assignments` — `institutional_teachers` | N : 1 | CU-26 RN-006 | Un docente admite múltiples asignaciones del mismo producto (CU-26 RN-003) |
| `institutional_assignments` — `products` | N : 1 | CU-26 RN-006 | |
| `game_sessions` — `institutional_teachers` | N : 1 | CU-29 RN-006 | |
| `game_sessions` — `products` | N : 1 | CU-29 RN-006 | El producto debe estar asignado al docente (CU-29 RN-001) |

---

## 4. Reglas de negocio consolidadas

| ID propuesto | Origen | Regla |
| --- | --- | --- |
| RN-INS-01 | CU-23 RN-001 | El identificador tributario de la institución es único |
| RN-INS-02 | CU-23 RN-002 | El correo institucional es único en el sistema |
| RN-INS-03 | CU-23 RN-003 | Un usuario se asocia como encargado a una sola institución |
| RN-INS-04 | CU-23 RN-004 | Quien registra la institución queda como encargado principal |
| RN-INS-05 | CU-23 RN-006 | Nombre legal, identificador tributario, dirección y correo son obligatorios |
| RN-INS-06 | CU-25 RN-001 | El inventario institucional comprende todos los productos adquiridos por la institución |
| RN-INS-07 | CU-25 RN-002, CU-27 RN-008 | La cantidad disponible resulta de restar la cantidad asignada a la adquirida |
| RN-INS-08 | CU-25 RN-004, CU-26 RN-001, CU-27 RN-001, CU-28 RN-001, CU-31 RN-001, CU-32 RN-001, CU-33 RN-001 | Las funciones de gestión y reporte institucional se reservan al encargado |
| RN-INS-09 | CU-25 RN-005 | El docente accede únicamente a los juegos que tiene asignados |
| RN-INS-10 | CU-26 RN-002, RN-005 | La asignación verifica disponibilidad y no puede exceder la cantidad disponible |
| RN-INS-11 | CU-26 RN-003 | Un docente admite múltiples asignaciones del mismo producto |
| RN-INS-12 | CU-26 RN-004, CU-27 RN-002 | Las cantidades de asignación y revocación son mayores a cero |
| RN-INS-13 | CU-26 RN-007, CU-27 RN-004 | El inventario se actualiza automáticamente ante cada asignación o revocación |
| RN-INS-14 | CU-26 RN-008, CU-27 RN-005 | El docente recibe notificación ante una asignación o revocación |
| RN-INS-15 | CU-27 RN-003 | La revocación admite ser parcial o total |
| RN-INS-16 | CU-28 RN-002 | El listado incluye a todos los docentes vinculados, aun sin asignaciones |
| RN-INS-17 | CU-28 RN-007, RN-008, RNF-007 | Las asignaciones revocadas permanecen en el historial con su fecha y responsable |
| RN-INS-18 | CU-29 RN-001 | Solo el docente con el juego asignado registra sesiones de uso |
| RN-INS-19 | CU-29 RN-002 | La fecha de uso no admite valores futuros |
| RN-INS-20 | CU-29 RN-003 | La cantidad de estudiantes y la duración son mayores a cero |
| RN-INS-21 | CU-29 RN-004 | Los aprendizajes clave requieren al menos 20 caracteres |
| RN-INS-22 | CU-29 RN-005 | La satisfacción se expresa en una escala de 1 a 5 |
| RN-INS-23 | CU-30 RN-001, RNF-006 | El docente accede únicamente a sus propias sesiones |
| RN-INS-24 | CU-30 RN-002 | Las sesiones se ordenan por defecto de más reciente a más antigua |
| RN-INS-25 | CU-30 RN-005 | El resumen del docente comprende total de sesiones, estudiantes alcanzados y satisfacción promedio |
| RN-INS-26 | CU-31 RN-003, CU-33 RN-004 | Los reportes admiten filtro por rango de fechas, juego y docente |
| RN-INS-27 | CU-31 RN-004 | El tablero institucional expone total de sesiones, estudiantes alcanzados, satisfacción promedio, juegos más utilizados y docentes más activos |
| RN-INS-28 | CU-31 RN-006, CU-33 RN-006 | La nube de aprendizajes se construye por frecuencia de mención |
| RN-INS-29 | CU-32 RN-002 | Los formatos de exportación son documento portátil y planilla de cálculo |
| RN-INS-30 | CU-32 RN-003, RN-004 | El archivo exportado consigna institución, fecha de generación y filtros aplicados |
| RN-INS-31 | CU-32 RN-008 | La ausencia de datos para exportar se informa y permite ajustar filtros |
| RN-INS-32 | CU-33 RN-005 | Los filtros se aplican en cascada sobre todas las visualizaciones |
| RN-INS-33 | CU-23 RN-008, CU-26 RNF-007, CU-27 RN-006, CU-29 RNF-008 | Las operaciones del módulo se registran en auditoría |
| RN-INS-34 | CU-23 RN-007, CU-25 RN-006, CU-26 RN-009, CU-27 RN-007, CU-28 RN-006, CU-29 RN-007, CU-30 RN-006, CU-31 RN-008, CU-32 RN-007, CU-33 RN-008 | Cada operación del módulo emite su evento de analítica |

---

## 5. Requerimientos no funcionales consolidados

### 5.1 Transversales al módulo

| ID propuesto | Categoría | Requerimiento | Origen |
| --- | --- | --- | --- |
| RNF-INS-01 | Rendimiento | Las consultas y operaciones del módulo resuelven en menos de 2 segundos | CU-23, CU-25, CU-26, CU-27, CU-28, CU-29, CU-30 |
| RNF-INS-02 | Rendimiento | Los tableros con métricas agregadas resuelven en menos de 3 segundos | CU-31, CU-33 |
| RNF-INS-03 | Compatibilidad | Las vistas son adaptables, con ancho mínimo soportado de 320 px | Los once casos de uso |
| RNF-INS-04 | Seguridad | El acceso a datos institucionales se restringe a usuarios autorizados de la institución | CU-25, CU-26, CU-27, CU-28, CU-29, CU-31, CU-32, CU-33 |
| RNF-INS-05 | Trazabilidad | Las operaciones de asignación, revocación y registro de sesiones se asientan en auditoría | CU-26, CU-27, CU-29 |

### 5.2 Específicos

| ID propuesto | Categoría | Requerimiento | Origen |
| --- | --- | --- | --- |
| RNF-INS-06 | Privacidad | Los datos sensibles de la institución no se exponen en registros de acceso público | CU-23 RNF-008 |
| RNF-INS-07 | Usabilidad | El inventario se presenta con totales de adquiridos, asignados y disponibles | CU-25 RNF-002 |
| RNF-INS-08 | Usabilidad | La asignación valida en tiempo real que la cantidad no exceda la disponibilidad | CU-26 RNF-004 |
| RNF-INS-09 | Usabilidad | Los docentes ya asignados se distinguen visualmente en el selector | CU-26 RNF-003 |
| RNF-INS-10 | Usabilidad | La revocación es reversible mediante una nueva asignación | CU-27 RNF-004 |
| RNF-INS-11 | Usabilidad | El formulario de sesión expone contador de caracteres y selector de satisfacción por estrellas | CU-29 RNF-004, RNF-005 |
| RNF-INS-12 | Seguridad | El registro de sesión valida que el docente tenga el producto asignado | CU-29 RNF-007 |
| RNF-INS-13 | Usabilidad | Los gráficos son interactivos y admiten detalle al posarse, filtrado al seleccionar y acercamiento por período | CU-33 RNF-003, RN-003 |
| RNF-INS-14 | Rendimiento | La exportación resuelve en menos de 5 segundos para documento portátil y 10 segundos para planilla | CU-32 RNF-001 |
| RNF-INS-15 | Rendimiento | El archivo exportado no supera los 10 MB | CU-32 RNF-002 |
| RNF-INS-16 | Compatibilidad | Las planillas exportadas son compatibles con las suites de oficina de uso corriente | CU-32 RNF-006 |
| RNF-INS-17 | Escalabilidad | El tablero opera eficientemente sobre volúmenes de miles de sesiones | CU-33 RNF-006 |

---

## 6. Inconsistencias detectadas y decisiones requeridas

| ID | Situación | Origen | Definición requerida |
| --- | --- | --- | --- |
| **D-32** | **La especificación CU-24 no describe la funcionalidad que su título enuncia.** El encabezado consigna "Adquirir Lote de Juegos Físicos (B2B)", pero el cuerpo del documento —objetivo, resumen, precondiciones, poscondiciones, flujo principal, flujos alternativos, reglas de negocio y requerimientos no funcionales— reproduce íntegramente el contenido de CU-23 (Registrar Institución Educativa). El texto no contiene ninguna mención a lote, adquisición, inventario, `institutional_inventories`, `quantity_purchased` ni orden de compra. En consecuencia, **la entidad `institutional_inventories` es consultada por CU-25, decrementada por CU-26 y CU-27, y es base de todo el circuito pedagógico, sin que ninguna especificación describa cómo se puebla** | CU-24 (documento completo) vs. CU-23 | Redactar la especificación funcional de la adquisición de lotes institucionales. Es condición necesaria para completar el modelo de datos: sin ella, el circuito institucional carece de origen |
| **D-33** | La revocación total elimina el registro de asignación, mientras que el listado de docentes exige conservar las asignaciones revocadas con su fecha y responsable para trazabilidad histórica | CU-27 §3 y §4 paso 18.1 vs. CU-28 RN-007, RN-008, RNF-007 | Definir si la revocación elimina el registro o lo marca como revocado conservando el historial. Ambas conductas son excluyentes |
| **D-34** | El atributo `is_admin` designa al encargado institucional, en tanto el rol `admin` designa al administrador de la plataforma. Ambos conceptos se enuncian con la misma denominación en especificaciones distintas | CU-23 RN-004, CU-25 RN-004 vs. CU-09 RN-007, CU-22 RN-001 | Diferenciar la denominación de ambos conceptos para evitar ambigüedad en el modelo y en la autorización |
| **D-35** | La regla restringe a un usuario a ser encargado de una sola institución, pero el flujo alternativo verifica la existencia de cualquier registro en `institutional_teachers`, lo que impediría también que un docente pertenezca a más de una institución | CU-23 RN-003 vs. A1.1, A1.2 | Definir si la restricción alcanza únicamente al rol de encargado o a todo vínculo institucional |
| **D-36** | El atributo `quantity_assigned` figura tanto en el inventario, como valor agregado, cuanto en cada asignación individual. Se trata de un dato derivado almacenado en dos lugares | CU-25 RN-002 vs. CU-26 RN-006 | Definir si el agregado se almacena o se calcula, y en el primer caso, el mecanismo que garantiza su consistencia |
| **D-37** | El estado de la asignación (activa o revocada) se requiere para el listado de docentes, pero no figura entre los atributos enumerados de la entidad | CU-28 RN-003 vs. CU-26 RN-006 | Incorporar el atributo de estado, en concordancia con la decisión D-33 |
| **D-38** | La notificación al docente ante asignación o revocación se enuncia como "email o dashboard", sin definir el mecanismo ni entidad de respaldo | CU-26 RN-008, CU-27 RN-005 | Definir el mecanismo de notificación y, si corresponde, la entidad que la registra |
| **D-39** | El registro de una sesión actualiza "las estadísticas agregadas del juego para la institución", sin precisar si se trata de una entidad materializada o de un cálculo en tiempo de consulta | CU-29 §3 | Definir la estrategia de agregación |
| **D-40** | Las especificaciones CU-31 y CU-33 describen tableros del encargado con métricas, filtros y nube de aprendizajes de alcance sustancialmente equivalente. La distinción funcional entre ambas no resulta explícita | CU-31 §1, RN-002 a RN-006 vs. CU-33 §1, RN-002 a RN-007 | Delimitar el alcance de cada una o unificarlas |
| **D-41** | El tablero pedagógico admite filtrar por nivel educativo, atributo que reside en el perfil del docente y no en la sesión ni en la institución | CU-33 RN-004 | Definir el origen del dato de nivel para el filtro |
| **D-42** | El identificador del docente dentro del circuito institucional se denomina `teacher_id` en la asignación, `institutional_teacher_id` en la sesión de uso, y se contrasta contra el usuario autenticado en la consulta de sesiones propias | CU-26 RN-006 vs. CU-29 RN-006 vs. CU-30 RNF-006 | Definir si las entidades referencian a `users` o a `institutional_teachers`, y unificar la denominación |
| **D-43** | El mapa de calor por día y hora se condiciona a que se registre la hora de la sesión, dato que el formulario de registro no contempla | CU-33 §4 vs. CU-29 §4 | Definir si la sesión registra hora, y en caso negativo, retirar la visualización |
| **D-44** | La dirección de la institución es obligatoria sin que se detalle su estructura, del mismo modo que la dirección de envío en el circuito comercial | CU-23 RN-006 | Vinculada a la decisión D-29 |

---

## 7. Trazabilidad

| Caso de uso | Entidades referidas | Reglas relevadas | RNF relevados | Flujos alternativos |
| --- | --- | --- | --- | --- |
| CU-23 Registrar Institución | `institutions`, `institutional_teachers` | 8 | 8 | 10 |
| CU-24 Adquirir Lote (B2B) | *(no especificadas — ver D-32)* | 8 | 8 | 10 |
| CU-25 Ver Tenencia de Licencias | `institutional_inventories`, `products`, `orders` | 7 | 6 | 8 |
| CU-26 Asignar Licencia | `institutional_assignments`, `institutional_inventories` | 9 | 7 | 8 |
| CU-27 Revocar Licencia | `institutional_assignments`, `institutional_inventories` | 8 | 7 | 10 |
| CU-28 Ver Docentes Asignados | `institutional_teachers`, `institutional_assignments` | 8 | 7 | 10 |
| CU-29 Cargar Estadísticas de Uso | `game_sessions`, `institutional_assignments` | 8 | 8 | 12 |
| CU-30 Ver Mis Sesiones | `game_sessions`, `products` | 7 | 7 | 10 |
| CU-31 Ver Reporte Institucional | `game_sessions` | 8 | 8 | 12 |
| CU-32 Exportar Reporte | `game_sessions` | 8 | 8 | 8 |
| CU-33 Ver Dashboard Pedagógico | `game_sessions` | 8 | 8 | 8 |
| **Total** | **5 entidades propias** | **87** | **82** | **106** |

---

## 8. Observación sobre la integridad del circuito

El circuito institucional se sostiene sobre una secuencia de cuatro etapas: la institución se
registra, adquiere productos que se incorporan a su inventario, asigna unidades de ese
inventario a sus docentes, y los docentes registran las sesiones de uso que alimentan los
reportes.

Las etapas primera, tercera y cuarta cuentan con especificación funcional. La segunda
—la adquisición que da origen al inventario— no la tiene, conforme se detalla en la
decisión D-32. Toda la cadena posterior opera sobre una entidad cuyo origen no está
documentado.

---

## 9. Registro de revisiones

| Revisión | Fecha | Ítem | Descripción | Intervino |
| --- | --- | --- | --- | --- |
| 00 | 24/07/2026 | Documento total | Versión inicial |  |

## 10. Participantes y Aprobaciones

| **Confecciona** | **Revisa** | **Aprueba** |
| --- | --- | --- |
|  |  |  |
