|  | **Sistema ACALUD** |
| --- | --- |
|  | Base de Datos — Esquema Físico |
|  | Versión: 00 | Fecha: 24/07/2026 | Página: 1 de 9 |

| Información del Documento |
| --- |
| Nombre del Proyecto | Sistema Acalud |
| Tipo de documento | Especificación del esquema físico de la base de datos |
| Motor | PostgreSQL 15 o superior |
| Documento antecedente | Diagrama Entidad-Relación, versión 00 |
| Artefacto asociado | `acalud_schema.sql` |
| Propósito | Definir el esquema físico ejecutable de la base de datos, derivado del modelo lógico, e informar el resultado de su validación contra el motor. |

---

## 1. Introducción

Este documento especifica el esquema físico de la base de datos del sistema Acalud. El
esquema se materializa en el script `acalud_schema.sql`, que crea la totalidad de las
estructuras: tipos enumerados, tablas, claves, restricciones de integridad, índices,
disparadores y datos maestros iniciales.

El esquema deriva directamente del modelo lógico presentado en el Diagrama Entidad-Relación.
Cada tabla corresponde a una entidad del modelo, y cada restricción traduce una regla de
negocio de las especificaciones funcionales a una garantía verificada por el motor.

El script fue ejecutado y validado contra PostgreSQL. El resultado de esa validación se
informa en la sección 7.

---

## 2. Decisiones del esquema físico

### 2.1 Motor y versión

Se adopta PostgreSQL en versión 15 o superior. La elección responde a los requerimientos no
funcionales que mencionan expresamente este motor (CU-07 RNF-008) y a la necesidad de tipos
estructurados, índices parciales y restricciones de verificación, empleados a lo largo del
esquema.

### 2.2 Claves primarias

Todas las tablas adoptan un identificador de tipo `uuid` como clave primaria, generado por la
función `gen_random_uuid()` de la extensión `pgcrypto`. Frente a las claves seriales, el
identificador universal no expone el volumen de registros ni su orden de creación, y simplifica
la integración entre componentes.

### 2.3 Marcas temporales

Las marcas temporales emplean el tipo `timestamptz`, que registra el instante con zona
horaria. Las columnas `created_at` y `updated_at` adoptan `now()` como valor por defecto. El
mantenimiento de `updated_at` se automatiza mediante disparadores, de modo que la aplicación no
requiere actualizarla explícitamente.

### 2.4 Tipos enumerados

Los dominios cerrados de valores se implementan como tipos enumerados del motor, en lugar de
restricciones de verificación sobre cadenas. Esta decisión documenta el dominio en el propio
esquema y previene valores fuera de rango. Se definen siete tipos enumerados.

| Tipo | Valores | Entidad |
| --- | --- | --- |
| `user_role` | `docente`, `admin` | `users` |
| `resource_type` | `pdf`, `link` | `resources` |
| `order_type` | `b2c`, `b2b` | `orders` |
| `order_status` | `pending`, `paid`, `shipped`, `delivered`, `cancelled` | `orders` |
| `assignment_status` | `active`, `revoked` | `institutional_assignments` |
| `poll_status` | `draft`, `active`, `closed` | `polls` |
| `proposal_status` | `pending`, `reviewed`, `approved`, `rejected` | `proposals` |

---

## 3. Restricciones de integridad

Más allá de las claves primarias y foráneas, el esquema traduce reglas de negocio a
restricciones de verificación que el motor garantiza en toda operación. Las principales:

| Restricción | Entidad | Regla de negocio traducida |
| --- | --- | --- |
| `wholesale_pair_consistency` | `products` | El umbral y el porcentaje de descuento mayorista se configuran juntos o quedan ambos nulos (CU-10 RN-003) |
| `own_brand_url_consistency` | `products` | Un producto de terceros lleva dirección externa; uno de marca propia, no (CU-19 RN-003, RN-004) |
| `resource_content_by_type` | `resources` | Un recurso de tipo enlace lleva dirección; uno de tipo documento lleva dirección o contenido (CU-08 RN-003) |
| `promotion_range` | `resources` | El período de promoción tiene ambas fechas y son coherentes, o ninguna (D-16) |
| `favorite_exactly_one_target` | `favorites` | Un favorito refiere exactamente a un producto, un recurso o una editorial (D-14) |
| `order_type_institution_consistency` | `orders` | Una orden institucional pertenece a una institución; una individual, no (CU-24) |
| `assigned_not_exceed_purchased` | `institutional_inventories` | La cantidad asignada no supera la adquirida (CU-26 RN-005) |
| `revocation_consistency` | `institutional_assignments` | Una asignación revocada tiene fecha de revocación; una activa, no (D-33) |
| `session_date_not_future` | `game_sessions` | La fecha de la sesión no es futura (CU-29 RN-002) |
| Verificación de rango | `game_sessions` | La satisfacción se expresa entre 1 y 5; la cantidad de estudiantes y la duración son mayores a cero (CU-29 RN-003, RN-005) |
| Verificación de longitud | `game_sessions`, `proposals` | Los aprendizajes requieren 20 caracteres; las descripciones de propuestas, 50 (CU-29 RN-004, CU-15 RN-002) |

### 3.1 Restricciones de unicidad

| Restricción | Entidad | Propósito |
| --- | --- | --- |
| `email` único | `users` | Identificador de acceso |
| `user_id` único | `teacher_profiles`, `carts` | Un perfil y un carrito por usuario |
| `tax_id`, `email` únicos | `institutions` | Identidad institucional |
| `uq_institution_user` | `institutional_teachers` | Sin vínculos duplicados |
| `uq_single_admin_per_user` | `institutional_teachers` | Índice parcial: un usuario es encargado de una sola institución (D-35) |
| `uq_institution_product` | `institutional_inventories` | Un registro de tenencia por producto |
| `uq_progress_user_product` | `game_progress` | Un progreso por usuario y juego |
| `uq_cart_product` | `cart_items` | Sin ítems duplicados en el carrito |
| `uq_poll_user` | `poll_responses` | Una participación por usuario y encuesta (D-46) |
| Tres índices parciales | `favorites` | Sin favoritos duplicados, por cada tipo de referencia (D-14) |

Las restricciones de unicidad condicionadas se implementan como índices únicos parciales, que
PostgreSQL evalúa únicamente sobre las filas que cumplen la condición. El índice
`uq_single_admin_per_user`, por ejemplo, se aplica solo a los vínculos donde `is_admin` es
verdadero, permitiendo así que un usuario sea docente en varias instituciones pero encargado
en una sola.

---

## 4. Comportamiento ante eliminación

Las claves foráneas definen su comportamiento ante la eliminación de la entidad referida,
según la naturaleza de la relación:

| Comportamiento | Aplicación | Fundamento |
| --- | --- | --- |
| En cascada | Detalle respecto de su maestro: `cart_items`, `order_items`, `poll_options`, `teacher_profiles`, y las entidades dependientes de una institución | La existencia del detalle carece de sentido sin su maestro |
| Restringida | `orders` y `order_items` respecto de `products`; inventario y asignaciones respecto de `products` | Un producto con historial comercial o institucional no se elimina físicamente (D-55, CU-19 RN-010) |
| Anulación de la referencia | `products` respecto de `categories`; propuestas y encuestas respecto de datos maestros | La eliminación del elemento referido no elimina al que lo referencia |

La combinación de la restricción de eliminación sobre productos con el atributo `is_active`
implementa la baja lógica exigida por CU-19 RNF-008: un producto con órdenes asociadas no puede
eliminarse físicamente, y se retira estableciendo su estado en inactivo.

---

## 5. Índices

El esquema define índices sobre las claves foráneas de consulta frecuente y sobre los campos
empleados en filtros y ordenamientos. Se destacan:

- Índices sobre las claves foráneas de todas las entidades de detalle, para la resolución
  eficiente de las relaciones.
- Índices descendentes sobre `created_at` en `orders` y `audit_log`, para el ordenamiento por
  fecha más reciente exigido por CU-05 RN-002.
- Índices sobre los campos de estado (`orders`, `institutional_assignments`, `proposals`),
  empleados como filtro en los listados administrativos.
- Índices sobre las claves foráneas de `game_sessions` (docente, producto, fecha), que
  sustentan las agregaciones de los reportes institucionales calculadas en tiempo de consulta
  (D-39).
- Índices sobre `poll_responses`, que sustentan el cálculo del recuento de votos en tiempo de
  consulta (D-47).

---

## 6. Datos maestros

El script incorpora los datos maestros iniciales de dos tablas de referencia:

- **`levels`**: los tres niveles educativos enumerados en CU-04 (Inicial, Primaria,
  Secundaria).
- **`subjects`**: un conjunto inicial de materias frecuentes, ampliable por el administrador.

Las restantes tablas se pueblan a través de las operaciones de la aplicación.

---

## 7. Validación contra el motor

El script fue ejecutado contra PostgreSQL en modo de detención ante el primer error, de modo
que cualquier inconsistencia habría interrumpido la ejecución. El esquema se aplicó
íntegramente sin error.

### 7.1 Objetos creados

| Objeto | Cantidad |
| --- | --- |
| Tablas | 29 |
| Tipos enumerados | 7 |
| Claves foráneas | 42 |
| Índices (incluidos los automáticos de claves) | 80 |
| Disparadores | 6 |

### 7.2 Verificación del comportamiento

Se verificó que las restricciones rechazan efectivamente los datos inválidos. Las pruebas
confirmaron el rechazo de: precio negativo, producto de marca propia con dirección externa,
descuento mayorista sin umbral, orden institucional sin institución, satisfacción fuera del
rango uno a cinco, sesión con fecha futura, aprendizajes con menos de veinte caracteres,
favorito con más de una referencia y favorito sin referencia alguna.

Se verificó asimismo el rechazo de: segundo encargado para un mismo usuario, asignación
superior a la cantidad adquirida, identificador tributario duplicado y eliminación de un
producto con órdenes asociadas.

Finalmente, se verificó que el circuito institucional completo —registro de usuario,
institución, vínculo de encargado, producto, inventario, asignación y sesión de uso— se
ejecuta correctamente sobre el esquema.

---

## 8. Integración con la implementación

Este esquema constituye la fuente de verdad del modelo de datos para la implementación. Su
adopción implica la alineación del código existente con la nomenclatura y las estructuras aquí
definidas.

El artefacto `acalud_schema.sql` se incorpora al repositorio como script de migración inicial.
Su ejecución sobre una base vacía produce el esquema completo, listo para operar.

---

## 9. Registro de revisiones

| Revisión | Fecha | Ítem | Descripción | Intervino |
| --- | --- | --- | --- | --- |
| 00 | 24/07/2026 | Documento total | Versión inicial |  |

## 10. Participantes y Aprobaciones

| **Confecciona** | **Revisa** | **Aprueba** |
| --- | --- | --- |
|  |  |  |
