|  | **Sistema ACALUD** |
| --- | --- |
|  | Análisis Transversal — Módulo 02: Catálogo, Demos y Contenido |
|  | Versión: 00 | Fecha: 24/07/2026 | Página: 1 de 6 |

| Información del Documento |
| --- |
| Nombre del Proyecto | Sistema Acalud |
| Tipo de documento | Análisis transversal de especificaciones funcionales (documento de trabajo) |
| Casos de uso analizados | CU-06, CU-07, CU-08, CU-09, CU-17, CU-18 |
| Propósito | Consolidar entidades, atributos, relaciones, reglas de negocio y requerimientos no funcionales como insumo para el Diagrama Entidad-Relación y el documento de requerimientos. |

---

## 1. Alcance del análisis

Se relevaron las seis especificaciones correspondientes a la exhibición de contenido: demos
jugables en sus dos modalidades de acceso, el Centro de Descargas con recursos gratuitos y
licenciados, el directorio de editoriales aliadas y el guardado de favoritos.

La sección 8 (Modelo Conceptual de Datos) se encuentra sin completar en las seis
especificaciones.

---

## 2. Catálogo de entidades

### 2.1 Entidades identificadas

| Entidad | Origen (CU / sección) | Naturaleza |
| --- | --- | --- |
| `products` | CU-06 §4, CU-18 §4 | Transaccional — núcleo del catálogo |
| `demos` | CU-06 §4, RN-001; CU-07 §4 | Configuración asociada a producto |
| `game_progress` | CU-07 §3, RN-003 | Transaccional |
| `resources` | CU-08 RN-001; CU-09 §2 | Transaccional |
| `favorites` | CU-18 §3, RN-002 | Relación polimórfica |
| `editorial_partners` | CU-17 §4, RN-001 | Transaccional |

### 2.2 Atributos relevados

**`demos`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `product_id` | CU-06 §4 | Relación con `products` |
| `config_json` | CU-06 RN-001 | Estructura semiestructurada con los parámetros de límite |
| ↳ `turnos_max_anonimo` | CU-06 §4, CU-07 §4 | Valor de ejemplo 5 para anónimos; nulo para registrados |
| ↳ `duracion_maxima_segundos` | CU-06 §4, CU-07 §4 | Valor de ejemplo 120 para anónimos; nulo para registrados |
| ↳ `enable_save_progress` | CU-06 §4, CU-07 §4 | Falso para anónimos; verdadero para registrados |

**`game_progress`** — atributos enumerados taxativamente en CU-07 RN-003

| Atributo | Origen | Notas |
| --- | --- | --- |
| `user_id` | CU-07 RN-003 | Relación con `users` |
| `product_id` | CU-07 RN-003 | Relación con `products` |
| `progress_data` | CU-07 RN-003 | Estructura flexible en formato JSON |
| `best_score` | CU-07 RN-003 | |
| `total_plays` | CU-07 RN-003 | |
| `last_played_at` | CU-07 RN-003 | |

**`resources`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `resource_id` | CU-08 §3, CU-09 §4 | Identificador |
| `is_licensed` | CU-08 RN-001, CU-09 RN-001 | Determina el régimen de acceso |
| *(tipo)* | CU-08 RN-003 | Valores: `pdf`, `link` |
| *(URL)* | CU-08 RNF-006, CU-09 RN-004 | Prefirmada cuando el recurso es licenciado |
| `download_count` | CU-08 RN-006 | |
| *(producto asociado)* | CU-09 §4 | Relación con `products`; nombre de columna no especificado |

**`favorites`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `user_id` | CU-18 §3 | Obligatorio |
| `product_id` | CU-18 RN-002 | Admite nulo |
| `resource_id` | CU-18 RN-002 | Admite nulo |
| `editorial_partner_id` | CU-18 RN-002 | Admite nulo |
| `created_at` | CU-18 §4 | |

**`editorial_partners`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `partner_id` | CU-17 §3 | Identificador |
| *(nombre, logo, descripción)* | CU-17 RN-002 | Obligatorios para que la editorial sea visible |
| `external_website_url` | CU-17 RN-002, RN-003 | |
| `is_active` | CU-17 RN-001 | Controla la visibilidad en el directorio |
| `category` | CU-17 A7.4 | Valores de ejemplo: Juegos de Mesa, Material Didáctico, Tecnología |

---

## 3. Relaciones detectadas

| Relación | Cardinalidad | Origen | Notas |
| --- | --- | --- | --- |
| `products` — `demos` | 1 : 0..1 | CU-06 §4, A3.1 | Un producto puede no tener demo |
| `users` — `game_progress` — `products` | N : M con atributos | CU-07 RN-003, A9.1 | Un registro por par usuario-producto |
| `products` — `resources` | 1 : 0..N | CU-09 §4 | Un recurso se asocia a un producto |
| `users` — `favorites` | 1 : 0..N | CU-18 §3 | |
| `favorites` — `products` / `resources` / `editorial_partners` | 0..1 cada una | CU-18 RN-002, RN-003 | Exactamente una de las tres referencias es no nula |
| `orders` — `products` — `resources` | Indirecta | CU-09 RN-002, A9.1 | Base del derecho de acceso individual |
| `institutional_inventories` — `products` | Indirecta | CU-09 A8.2 | Base del derecho de acceso institucional |

---

## 4. Reglas de negocio consolidadas

| ID propuesto | Origen | Regla |
| --- | --- | --- |
| RN-CAT-01 | CU-06 RN-001 | Las demos para usuarios anónimos tienen límites de tiempo o turnos definidos en la configuración de la demo |
| RN-CAT-02 | CU-06 RN-002 | Al finalizar la demo anónima se presenta obligatoriamente la invitación al registro |
| RN-CAT-03 | CU-06 RN-003 | El usuario anónimo no persiste progreso; cada sesión comienza desde cero |
| RN-CAT-04 | CU-06 RN-008, CU-07 RN-001 | El usuario registrado accede a la demo sin límites de tiempo ni turnos |
| RN-CAT-05 | CU-07 RN-002 | El progreso se guarda automáticamente al finalizar cada partida |
| RN-CAT-06 | CU-07 RN-004 | El progreso está disponible desde cualquier dispositivo mientras la sesión esté iniciada |
| RN-CAT-07 | CU-08 RN-001, RN-007 | Los recursos no licenciados son de acceso libre y visibles sin autenticación |
| RN-CAT-08 | CU-08 RN-002 | El Centro de Descargas exhibe únicamente recursos no licenciados |
| RN-CAT-09 | CU-08 RN-003 | El tipo de recurso determina la acción: descarga directa o redirección externa |
| RN-CAT-10 | CU-08 RN-006 | El contador de descargas se incrementa con cada descarga exitosa |
| RN-CAT-11 | CU-09 RN-001 | Los recursos licenciados exigen autenticación y verificación de derecho previa |
| RN-CAT-12 | CU-09 RN-002 | El derecho de acceso se concede por compra individual, por licencia institucional o por período promocional |
| RN-CAT-13 | CU-09 RN-004 | Las direcciones de recursos licenciados se entregan prefirmadas con vigencia acotada |
| RN-CAT-14 | CU-09 RN-006 | Los intentos de acceso denegado se registran para análisis de conversión |
| RN-CAT-15 | CU-09 RN-007 | El rol administrador accede a cualquier recurso sin restricción |
| RN-CAT-16 | CU-17 RN-001 | Solo se exhiben las editoriales activas |
| RN-CAT-17 | CU-17 RN-002 | Una editorial requiere logo, nombre, descripción y dirección web para ser visible |
| RN-CAT-18 | CU-17 RN-003, RNF-007 | La dirección externa se abre en una pestaña nueva |
| RN-CAT-19 | CU-17 RN-004, RN-005 | El usuario anónimo que solicita salir al sitio externo recibe una invitación al registro con dos opciones |
| RN-CAT-20 | CU-18 RN-001 | Cada elemento puede guardarse una sola vez por usuario |
| RN-CAT-21 | CU-18 RN-002, RN-003 | Un favorito refiere a un producto, un recurso o una editorial; al menos una referencia es no nula |
| RN-CAT-22 | CU-18 RN-005 | El guardado de favoritos opera por alternancia: un segundo clic elimina |
| RN-CAT-23 | CU-18 RN-008 | El guardado de favoritos exige autenticación |
| RN-CAT-24 | CU-06 RN-004 a RN-007, CU-07 RN-006, CU-08 RN-004, CU-09 RN-005, CU-17 RN-006, RN-007, CU-18 RN-006, RN-007 | Cada interacción del módulo emite su evento de analítica correspondiente |

**Reglas duplicadas detectadas:** las relativas a analítica se repiten en las seis
especificaciones, con doce enunciados que expresan el mismo requisito.

---

## 5. Requerimientos no funcionales consolidados

### 5.1 Transversales al módulo

| ID propuesto | Categoría | Requerimiento | Origen |
| --- | --- | --- | --- |
| RNF-CAT-01 | Rendimiento | Los listados del módulo cargan en menos de 2 segundos | CU-08, CU-17 |
| RNF-CAT-02 | Rendimiento | Las demos cargan en menos de 3 segundos | CU-06, CU-07 |
| RNF-CAT-03 | Compatibilidad | Las vistas son adaptables y operables en tabletas y teléfonos | CU-06, CU-07, CU-08, CU-09, CU-17, CU-18 |
| RNF-CAT-04 | Escalabilidad | El motor de demos es un componente independiente que admite nuevos juegos sin reestructurar el frontend | CU-06, CU-07 |
| RNF-CAT-05 | Disponibilidad | La expiración de sesión durante una operación redirige al ingreso conservando el contexto | CU-07, CU-09, CU-18 |

### 5.2 Específicos

| ID propuesto | Categoría | Requerimiento | Origen |
| --- | --- | --- | --- |
| RNF-CAT-06 | Seguridad | Las demos se cargan en un entorno aislado para prevenir inyección de secuencias de comandos | CU-06 RNF-001 |
| RNF-CAT-07 | Usabilidad | La invitación al registro es clara y no invasiva | CU-06 RNF-004, CU-17 RNF-003 |
| RNF-CAT-08 | Rendimiento | El guardado de progreso es asíncrono y no interrumpe la partida | CU-07 RNF-003 |
| RNF-CAT-09 | Persistencia | El progreso de demo se almacena en PostgreSQL | CU-07 RNF-008 |
| RNF-CAT-10 | Rendimiento | El inicio de descarga responde en menos de 1 segundo | CU-08 RNF-002 |
| RNF-CAT-11 | Disponibilidad | Las direcciones de recursos se validan periódicamente para detectar enlaces caídos | CU-08 RNF-006 |
| RNF-CAT-12 | Seguridad | La verificación de derecho de acceso se resuelve en el servidor, nunca en el cliente | CU-09 RNF-001 |
| RNF-CAT-13 | Seguridad | Las direcciones prefirmadas expiran a los 5 minutos | CU-09 RNF-002 |
| RNF-CAT-14 | Rendimiento | La verificación de derecho se resuelve en menos de 1 segundo | CU-09 RNF-004 |
| RNF-CAT-15 | Usabilidad | Los recursos licenciados se distinguen visualmente de los gratuitos | CU-09 RNF-005 |
| RNF-CAT-16 | Rendimiento | El guardado de un favorito responde en menos de 1 segundo | CU-18 RNF-001 |
| RNF-CAT-17 | Usabilidad | El control táctil de favorito mide al menos 44 px | CU-18 RNF-005 |
| RNF-CAT-18 | Escalabilidad | La tabla de favoritos se indexa por usuario y por cada referencia | CU-18 RNF-008 |

---

## 6. Inconsistencias detectadas y decisiones requeridas

| ID | Situación | Origen | Definición requerida |
| --- | --- | --- | --- |
| **D-13** | Las especificaciones remiten a requerimientos no funcionales de nivel proyecto identificados como RNF01, RNF02, RNF04 y RNF05 "del proyecto", que no forman parte de los 33 casos de uso relevados | CU-06 RNF-002, RNF-003, RNF-005; CU-07 RNF-004, RNF-006, RNF-008 | Localizar el documento de requerimientos de proyecto referenciado, o consolidar dichos requerimientos a partir de las menciones dispersas |
| **D-14** | La tabla de favoritos admite dos modelados: tres referencias con valor nulo admitido más una restricción de integridad, o un par tipo-identificador. CU-17 A10.5 la denomina "tabla polimórfica" mientras CU-18 enumera las tres columnas | CU-18 RN-002, RN-003 vs. CU-17 A10.5 | Definir el modelado. La restricción de unicidad de CU-18 RN-001 se enuncia como "UNIQUE(user_id, product_id) o similar", sin cubrir los otros dos tipos |
| **D-15** | El incremento del contador de descargas se enuncia como obligatorio en la regla de negocio y como opcional en las poscondiciones y en el flujo principal | CU-08 RN-006 vs. CU-08 §3 y §4 | Definir si el atributo `download_count` es obligatorio |
| **D-16** | El acceso promocional a recursos licenciados se describe como "configurable desde backend" y "período de promoción temporal", sin entidad ni atributos que lo sustenten | CU-09 RN-002, A10.1 | Definir la entidad que registra las promociones, o retirar esta vía de acceso |
| **D-17** | La entidad que persiste el progreso se menciona como "tabla `game_progress` o similar" | CU-07 §3 | Confirmar denominación |
| **D-18** | Las direcciones prefirmadas se ejemplifican con un servicio de almacenamiento externo específico, sin que ninguna especificación defina el proveedor de almacenamiento del proyecto | CU-09 RN-004, RNF-002 | Definir el mecanismo de almacenamiento y firma de archivos |
| **D-19** | La relación entre recursos y productos se infiere de la expresión "producto asociado al recurso", sin que se declare la columna ni la cardinalidad. En el Centro de Descargas los recursos gratuitos se listan de forma autónoma, lo que sugiere que la relación admite nulo | CU-09 §4 vs. CU-08 §4 | Definir cardinalidad y obligatoriedad de la relación |
| **D-20** | El derecho de acceso institucional se verifica contra `institutional_inventories` e `institutional_teachers`, entidades definidas en el módulo Institucional. La regla no precisa si el docente debe tener la licencia asignada o alcanza con que la institución posea el producto | CU-09 RN-002, A8.1, A8.2 | Definir el criterio de derecho institucional. Es determinante para el modelo de asignación de licencias |
| **D-21** | El acceso irrestricto del rol administrador convive con la ausencia del rol en el flujo de registro | CU-09 RN-007 | Vinculada a la decisión D-03 sobre el dominio de roles |

---

## 7. Trazabilidad

| Caso de uso | Entidades referidas | Reglas relevadas | RNF relevados | Flujos alternativos |
| --- | --- | --- | --- | --- |
| CU-06 Probar Demo Anónimos | `demos`, `products` | 8 | 7 | 3 |
| CU-07 Probar Demo Registrado | `demos`, `products`, `game_progress`, `resources`, `favorites` | 7 | 8 | 9 |
| CU-08 Descargar Recurso Libre | `resources`, `favorites` | 7 | 7 | 8 |
| CU-09 Descargar Recurso Licenciado | `resources`, `products`, `orders`, `institutional_inventories`, `institutional_teachers` | 7 | 8 | 10 |
| CU-17 Explorar Editoriales | `editorial_partners`, `favorites` | 8 | 8 | 10 |
| CU-18 Guardar Favorito | `favorites`, `products`, `resources`, `editorial_partners` | 8 | 8 | 10 |
| **Total** | **6 entidades propias** | **45** | **46** | **50** |

---

## 8. Registro de revisiones

| Revisión | Fecha | Ítem | Descripción | Intervino |
| --- | --- | --- | --- | --- |
| 00 | 24/07/2026 | Documento total | Versión inicial |  |

## 9. Participantes y Aprobaciones

| **Confecciona** | **Revisa** | **Aprueba** |
| --- | --- | --- |
|  |  |  |
