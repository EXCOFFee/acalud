|  | **Sistema ACALUD** |
| --- | --- |
|  | Análisis Transversal — Módulo 05: Comunidad y Co-creación |
|  | Versión: 00 | Fecha: 24/07/2026 | Página: 1 de 5 |

| Información del Documento |
| --- |
| Nombre del Proyecto | Sistema Acalud |
| Tipo de documento | Análisis transversal de especificaciones funcionales (documento de trabajo) |
| Casos de uso analizados | CU-14, CU-15, CU-16, CU-20, CU-21 |
| Propósito | Consolidar entidades, atributos, relaciones, reglas de negocio y requerimientos no funcionales como insumo para el Diagrama Entidad-Relación y el documento de requerimientos. |

---

## 1. Alcance del análisis

Se relevaron las cinco especificaciones del circuito de participación: votación en encuestas,
consulta pública de resultados, envío de propuestas de juegos por parte de los docentes, y
las dos operaciones administrativas asociadas (parametrización de encuestas y revisión de
propuestas).

CU-20 y CU-21 corresponden al panel de administración pero gobiernan las entidades de este
módulo, por lo que se relevan en conjunto.

La sección 8 (Modelo Conceptual de Datos) se encuentra sin completar en las cinco
especificaciones.

---

## 2. Catálogo de entidades

### 2.1 Entidades identificadas

| Entidad | Origen (CU / sección) | Naturaleza |
| --- | --- | --- |
| `polls` | CU-14 RN-002, CU-20 §3 | Transaccional |
| `poll_options` | CU-16 §4, CU-20 §3 | Detalle de `polls` |
| `poll_responses` | CU-14 §3, RN-001 | Registro de participación |
| `proposals` | CU-15 §3, CU-21 §3 | Transaccional |

### 2.2 Atributos relevados

**`polls`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `poll_id` | CU-14 §3 | Identificador |
| *(pregunta)* | CU-20 §4 | |
| `is_active` | CU-14 RN-002, CU-20 §4 | Falso por defecto al crearse |
| `target_level_id` | CU-14 RN-003, CU-20 §4 | Relación con `levels`; admite nulo |
| `created_at` | CU-20 §4 | |

**`poll_options`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `option_id` | CU-14 §4 | Identificador |
| `poll_id` | CU-20 §3 | Relación con `polls` |
| *(texto)* | CU-16 §4 | |
| `vote_count` | CU-16 RN-006 | Dato derivado; ver decisión D-47 |

**`poll_responses`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `poll_id` | CU-14 §3 | |
| `option_id` | CU-14 §3 | |
| `user_id` | CU-14 §3 | |
| `created_at` | CU-14 §3 | |

**`proposals`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `proposal_id` | CU-15 §3 | Identificador |
| `user_id` | CU-15 §3 | Autor de la propuesta |
| `title` | CU-15 §3, RN-001 | Obligatorio |
| `description` | CU-15 §3, RN-002 | Obligatorio, mínimo 50 caracteres |
| `subject_id` | CU-15 §3, RN-007 | Admite nulo |
| *(nivel educativo)* | CU-15 §4, RN-007 | Presente en el formulario, ausente de la enumeración de atributos; ver decisión D-50 |
| *(estado)* | CU-15 RN-003, CU-21 RN-002 | Valores: `pending`, `reviewed`, `approved`, `rejected` |
| `admin_feedback` | CU-21 §3, RN-003 | Opcional |
| `created_at` | CU-15 §3 | |
| `updated_at` | CU-21 §3 | |

---

## 3. Relaciones detectadas

| Relación | Cardinalidad | Origen | Notas |
| --- | --- | --- | --- |
| `polls` — `poll_options` | 1 : 1..N | CU-20 §3 | Eliminación en cascada según CU-20 A3.6 |
| `polls` — `poll_responses` | 1 : 0..N | CU-14 §3 | |
| `poll_options` — `poll_responses` | 1 : 0..N | CU-14 §3 | |
| `users` — `poll_responses` | 1 : 0..N | CU-14 RN-001 | Restringida a una respuesta por encuesta |
| `polls` — `levels` | N : 0..1 | CU-14 RN-003 | Segmentación por nivel educativo |
| `users` — `proposals` | 1 : 0..N | CU-15 §3 | |
| `proposals` — `subjects` | N : 0..1 | CU-15 RN-007 | |

---

## 4. Reglas de negocio consolidadas

| ID propuesto | Origen | Regla |
| --- | --- | --- |
| RN-COMU-01 | CU-14 RN-001 | Un usuario participa una sola vez por encuesta |
| RN-COMU-02 | CU-14 RN-002 | Solo las encuestas activas resultan visibles y votables |
| RN-COMU-03 | CU-14 RN-003 | Las encuestas admiten segmentación opcional por nivel educativo |
| RN-COMU-04 | CU-14 RN-004, CU-16 RN-002, RNF-007 | Los resultados se exhiben en forma agregada, sin identificación de participantes |
| RN-COMU-05 | CU-14 RN-006, RN-007, CU-16 RN-001, RN-008 | La consulta de resultados es pública; la participación exige autenticación |
| RN-COMU-06 | CU-16 RN-003 | Al usuario que ya participó se le destaca su opción |
| RN-COMU-07 | CU-16 RN-006 | El porcentaje por opción se calcula sobre el total de votos, con un decimal |
| RN-COMU-08 | CU-16 RN-007 | Sin votos registrados, los porcentajes son cero y se informa la ausencia de participación |
| RN-COMU-09 | CU-15 RN-001, RN-002 | El título y la descripción son obligatorios; la descripción requiere al menos 50 caracteres |
| RN-COMU-10 | CU-15 RN-003 | La propuesta se crea en estado pendiente de revisión |
| RN-COMU-11 | CU-15 RN-004, RNF-005 | El docente consulta el estado de sus propuestas en cualquier momento |
| RN-COMU-12 | CU-15 RN-005, CU-21 RN-005 | El equipo editorial es notificado de cada propuesta nueva, y el docente del cambio de estado de la suya |
| RN-COMU-13 | CU-15 RN-006 | No se admiten propuestas duplicadas en un período acotado |
| RN-COMU-14 | CU-15 RN-007 | La materia y el nivel educativo son opcionales pero recomendados para la clasificación |
| RN-COMU-15 | CU-21 RN-002 | El estado de la propuesta evoluciona a revisada, aprobada o rechazada |
| RN-COMU-16 | CU-21 RN-003, RN-007 | El comentario del administrador es opcional y puede registrarse sin modificar el estado |
| RN-COMU-17 | CU-21 RN-008 | Una propuesta revisada no retorna al estado pendiente |
| RN-COMU-18 | CU-20 RNF-005 | Las encuestas activas no admiten edición desde la interfaz |
| RN-COMU-19 | CU-21 RN-004, CU-20 §3 | Las operaciones administrativas del módulo se asientan en auditoría con estado anterior y nuevo |
| RN-COMU-20 | CU-14 RN-005, CU-15 RN-008, CU-16 RN-005 | Cada operación del módulo emite su evento de analítica |

---

## 5. Requerimientos no funcionales consolidados

### 5.1 Transversales al módulo

| ID propuesto | Categoría | Requerimiento | Origen |
| --- | --- | --- | --- |
| RNF-COMU-01 | Rendimiento | Las operaciones del módulo resuelven en menos de 2 segundos | CU-14, CU-15, CU-16, CU-20, CU-21 |
| RNF-COMU-02 | Compatibilidad | Las vistas son adaptables, con ancho mínimo soportado de 320 px | CU-14, CU-15, CU-16, CU-20, CU-21 |
| RNF-COMU-03 | Disponibilidad | La expiración de sesión durante una operación redirige al ingreso conservando el contenido ingresado | CU-14, CU-15, CU-20, CU-21 |
| RNF-COMU-04 | Seguridad | El panel administrativo exige autenticación y autorización por rol, con asiento en auditoría | CU-20, CU-21 |
| RNF-COMU-05 | Usabilidad | Los resultados se presentan mediante gráficos de lectura sencilla | CU-14 RNF-003, CU-16 RNF-002 |

### 5.2 Específicos

| ID propuesto | Categoría | Requerimiento | Origen |
| --- | --- | --- | --- |
| RNF-COMU-06 | Usabilidad | El usuario percibe con claridad si ya participó en la encuesta | CU-14 RNF-004, CU-16 RNF-004 |
| RNF-COMU-07 | Escalabilidad | El listado de encuestas se pagina a partir de diez registros activos | CU-14 RNF-006 |
| RNF-COMU-08 | Seguridad | La participación se almacena con identificación del usuario para validar unicidad, y se expone de forma anónima | CU-14 RNF-007 |
| RNF-COMU-09 | Escalabilidad | La consulta de resultados se apoya en índices sobre participación y opciones | CU-16 RNF-008 |
| RNF-COMU-10 | Usabilidad | El formulario de propuesta expone contador de caracteres | CU-15 RNF-003 |
| RNF-COMU-11 | Disponibilidad | El contenido de una propuesta en curso se preserva localmente ante una interrupción de sesión | CU-15 RNF-008 |
| RNF-COMU-12 | Usabilidad | La composición de opciones de respuesta admite agregar y quitar dinámicamente | CU-20 RNF-003 |
| RNF-COMU-13 | Usabilidad | El listado administrativo de encuestas expone estado, total de votos y fecha de creación | CU-20 RNF-004 |
| RNF-COMU-14 | Usabilidad | El listado de propuestas distingue los estados mediante color y admite filtro, búsqueda y ordenamiento | CU-21 RNF-003, RNF-005 |

---

## 6. Inconsistencias detectadas y decisiones requeridas

| ID | Situación | Origen | Definición requerida |
| --- | --- | --- | --- |
| **D-45** | **La sección 6 de CU-20 (Parametrizar Encuesta) reproduce literalmente la sección 6 de CU-19 (Gestionar Catálogo).** Sus diez reglas refieren a productos, precio, stock, descuento mayorista, marca propia y recursos, sin ninguna mención a encuestas ni a opciones de respuesta. Las restantes secciones de CU-20 sí corresponden a la funcionalidad enunciada | CU-20 §6 vs. CU-19 §6 (coincidencia literal verificada) | Redactar las reglas de negocio propias de la parametrización de encuestas. En su ausencia, la entidad `polls` carece de reglas documentadas |
| **D-46** | La restricción de unicidad admite una sola participación por usuario y encuesta, mientras que otra regla del mismo documento establece que el sistema debe permitir la selección de múltiples opciones en encuestas de opción múltiple. Con un registro único por usuario y encuesta, la selección múltiple no resulta representable | CU-14 RN-001 vs. RN-008 | Definir si la encuesta admite selección múltiple y, en tal caso, ajustar la restricción de unicidad al par usuario-opción |
| **D-47** | El recuento de votos por opción se describe como atributo almacenado y, alternativamente, como cálculo en tiempo de consulta. El texto lo enuncia como "opcional" | CU-14 §4 vs. CU-16 RN-006, RNF-008 | Definir si `vote_count` se almacena o se deriva |
| **D-48** | El estado de la encuesta se expresa como indicador booleano de actividad, pero la vista pública distingue encuestas "finalizadas" con indicador propio, y la vista administrativa habla de estado activa o inactiva. Una encuesta aún no publicada y una ya cerrada no son equivalentes, y el indicador booleano no las distingue | CU-14 RN-002 vs. CU-16 RN-004 vs. CU-20 RNF-004 | Definir el dominio de estados de la encuesta |
| **D-49** | La eliminación de una encuesta arrastra en cascada sus opciones y la totalidad de las respuestas registradas, lo que suprime el historial de participación de la comunidad | CU-20 A3.6 | Definir si la eliminación es física con cascada o lógica con preservación del historial |
| **D-50** | El nivel educativo destinatario integra el formulario de propuesta y una regla de negocio lo menciona, pero no figura entre los atributos enumerados en las poscondiciones | CU-15 §4, RN-007 vs. CU-15 §3 | Confirmar la incorporación del atributo a la entidad |
| **D-51** | El control de propuestas duplicadas se define sobre "mismo título y descripción similar" dentro de "un período corto", sin precisar el criterio de similitud ni la ventana temporal | CU-15 RN-006 | Definir el criterio de detección y el intervalo |
| **D-52** | Los estados de la propuesta se expresan en idioma inglés, en concordancia con los estados de la orden pero en discordancia con la nomenclatura en español empleada en otras especificaciones | CU-15 RN-003, CU-21 RN-002 | Vinculada a la decisión D-22 sobre unificación de dominios de estado |
| **D-53** | La notificación al equipo editorial y al docente autor se enuncia como "email o dashboard", sin definir el mecanismo ni entidad de respaldo | CU-15 RN-005, CU-21 RN-005 | Vinculada a la decisión D-38 |
| **D-54** | Un requerimiento establece que las encuestas activas no pueden editarse desde la interfaz, mientras que un flujo alternativo describe la edición de encuesta y opciones sin condicionarla al estado | CU-20 RNF-005 vs. CU-20 A2.8, A2.9 | Definir si la edición se habilita según el estado de la encuesta |

---

## 7. Trazabilidad

| Caso de uso | Entidades referidas | Reglas relevadas | RNF relevados | Flujos alternativos |
| --- | --- | --- | --- | --- |
| CU-14 Participar en Encuesta | `polls`, `poll_options`, `poll_responses`, `levels` | 8 | 8 | 9 |
| CU-15 Enviar Propuesta | `proposals`, `subjects`, `levels` | 9 | 8 | 9 |
| CU-16 Ver Resultados | `polls`, `poll_options`, `poll_responses` | 8 | 8 | 8 |
| CU-20 Parametrizar Encuesta | `polls`, `poll_options` | 10 *(no corresponden — ver D-45)* | 8 | 10 |
| CU-21 Revisar Propuestas | `proposals`, `users` | 8 | 8 | 11 |
| **Total** | **4 entidades propias** | **43** | **40** | **47** |

---

## 8. Registro de revisiones

| Revisión | Fecha | Ítem | Descripción | Intervino |
| --- | --- | --- | --- | --- |
| 00 | 24/07/2026 | Documento total | Versión inicial |  |

## 9. Participantes y Aprobaciones

| **Confecciona** | **Revisa** | **Aprueba** |
| --- | --- | --- |
|  |  |  |
