|  | **Sistema ACALUD** |
| --- | --- |
|  | Análisis Transversal — Módulo 06: Administración de Catálogo |
|  | Versión: 00 | Fecha: 24/07/2026 | Página: 1 de 4 |

| Información del Documento |
| --- |
| Nombre del Proyecto | Sistema Acalud |
| Tipo de documento | Análisis transversal de especificaciones funcionales (documento de trabajo) |
| Casos de uso analizados | CU-19 |
| Propósito | Consolidar entidades, atributos, relaciones, reglas de negocio y requerimientos no funcionales como insumo para el Diagrama Entidad-Relación y el documento de requerimientos. |

---

## 1. Alcance del análisis

Se relevó la especificación correspondiente a la gestión del catálogo por parte del
administrador de la plataforma: alta, baja y modificación de productos, categorías, demos y
recursos, tanto de marca propia como de terceros.

Esta especificación reviste particular importancia para el modelo de datos porque es la única
que define de manera taxativa los atributos de la entidad `products`, referenciada por los
módulos de catálogo, compras e institucional.

La sección 8 (Modelo Conceptual de Datos) se encuentra sin completar.

---

## 2. Catálogo de entidades

### 2.1 Entidades identificadas

| Entidad | Origen (CU / sección) | Naturaleza |
| --- | --- | --- |
| `products` | CU-19 §4, RN-003 a RN-007 | Transaccional — núcleo del catálogo |
| `categories` | CU-19 §1 | Maestro — mencionada sin especificar; ver decisión D-56 |
| `demos` | CU-19 A8 | Configuración asociada a producto |
| `resources` | CU-19 A9, RN-009 | Transaccional |
| *(registro de auditoría)* | CU-19 §3, RN-002 | Sin denominar; ver decisión D-27 |

### 2.2 Atributos relevados

**`products`** — enumeración consolidada

| Atributo | Origen | Notas |
| --- | --- | --- |
| `product_id` | CU-19 §4 | Identificador |
| *(nombre y descripción)* | CU-19 §4 | Obligatorios |
| *(precio)* | CU-19 RN-006 | Mayor o igual a cero |
| `stock` | CU-19 RN-007 | Mayor o igual a cero |
| `is_own_brand` | CU-19 RN-003, RN-004 | Distingue marca propia de terceros |
| `external_url` | CU-19 RN-003, RN-004 | Obligatorio para terceros, nulo para marca propia |
| `wholesale_threshold` | CU-19 RN-005 | Ver módulo 03 |
| `wholesale_discount_percent` | CU-19 RN-005 | Ver módulo 03 |
| *(estado de actividad)* | CU-19 RN-010, RNF-008 | Requerido por la baja lógica; no enumerado. Ver decisión D-55 |
| *(categoría)* | CU-19 §1 | Relación con `categories`; ver decisión D-56 |

**`demos`** — atributos adicionales a los relevados en el módulo 02

| Atributo | Origen | Notas |
| --- | --- | --- |
| `config_json` | CU-19 RN-008, A8.4 | Debe constituir una estructura válida |
| *(dirección del motor de juego)* | CU-19 A8.4 | Declarada opcional; ver decisión D-57 |

**`resources`** — atributos adicionales a los relevados en el módulo 02

| Atributo | Origen | Notas |
| --- | --- | --- |
| *(título)* | CU-19 A9.4 | Obligatorio |
| *(tipo)* | CU-19 RN-009 | Valores `pdf` o `link` |
| *(dirección)* | CU-19 RN-009, A9.4 | Obligatoria. Para tipo `pdf` debe apuntar a un archivo |
| `is_licensed` | CU-19 A9.4 | |
| *(producto relacionado)* | CU-19 A9.4 | Declarado opcional, lo que confirma la cardinalidad planteada en la decisión D-19 |

---

## 3. Relaciones detectadas

| Relación | Cardinalidad | Origen | Notas |
| --- | --- | --- | --- |
| `products` — `categories` | N : 1 | CU-19 §1 | Cardinalidad no especificada |
| `products` — `demos` | 1 : 0..1 | CU-19 A8.8 | |
| `products` — `resources` | 1 : 0..N | CU-19 A9.4 | La relación admite nulo |
| `products` — `orders` | Indirecta | CU-19 RN-010 | Condiciona la eliminación |

---

## 4. Reglas de negocio consolidadas

| ID propuesto | Origen | Regla |
| --- | --- | --- |
| RN-ADM-01 | CU-19 RN-001 | La gestión del catálogo se reserva al rol administrador |
| RN-ADM-02 | CU-19 RN-002 | Cada operación de alta, baja o modificación se asienta en auditoría con administrador, acción, producto y marca temporal |
| RN-ADM-03 | CU-19 RN-003 | Los productos de terceros requieren dirección externa |
| RN-ADM-04 | CU-19 RN-004 | Los productos de marca propia no llevan dirección externa |
| RN-ADM-05 | CU-19 RN-005 | La configuración de descuento mayorista se completa de manera íntegra y consistente |
| RN-ADM-06 | CU-19 RN-006 | El precio es mayor o igual a cero |
| RN-ADM-07 | CU-19 RN-007 | El stock es mayor o igual a cero |
| RN-ADM-08 | CU-19 RN-008 | La configuración de la demo constituye una estructura válida |
| RN-ADM-09 | CU-19 RN-009 | Los recursos son de tipo documento o enlace; los del primer tipo apuntan a un archivo |
| RN-ADM-10 | CU-19 RN-010, RNF-008 | La eliminación de un producto con órdenes asociadas se resuelve por desactivación lógica, preservando la integridad histórica |

---

## 5. Requerimientos no funcionales consolidados

| ID propuesto | Categoría | Requerimiento | Origen |
| --- | --- | --- | --- |
| RNF-ADM-01 | Seguridad | El panel de administración exige autenticación y autorización por rol | CU-19 RNF-001 |
| RNF-ADM-02 | Seguridad | Toda operación administrativa se asienta en auditoría | CU-19 RNF-002 |
| RNF-ADM-03 | Usabilidad | Los formularios validan en tiempo real | CU-19 RNF-003 |
| RNF-ADM-04 | Usabilidad | El listado de productos admite búsqueda, filtros y paginación | CU-19 RNF-004 |
| RNF-ADM-05 | Rendimiento | Las operaciones administrativas resuelven en menos de 2 segundos | CU-19 RNF-005 |
| RNF-ADM-06 | Compatibilidad | El panel es adaptable, con ancho mínimo soportado de 320 px | CU-19 RNF-006 |
| RNF-ADM-07 | Disponibilidad | La expiración de sesión durante la administración conserva los cambios ingresados | CU-19 RNF-007 |
| RNF-ADM-08 | Integridad | La eliminación de productos es lógica, para preservar las órdenes históricas | CU-19 RNF-008 |

---

## 6. Inconsistencias detectadas y decisiones requeridas

| ID | Situación | Origen | Definición requerida |
| --- | --- | --- | --- |
| **D-55** | La eliminación de productos se enuncia con tres grados de compromiso distintos: la regla de negocio indica verificar órdenes asociadas antes de eliminar físicamente y "permitir" la desactivación lógica; el flujo alternativo elimina el registro "o lo marca como inactivo según política"; el requerimiento no funcional establece que la eliminación debe ser lógica. Adicionalmente, el atributo que sostendría la baja lógica no figura entre los enumerados | CU-19 RN-010 vs. A2.5 vs. RNF-008 | Definir la política de eliminación e incorporar el atributo de estado a la entidad |
| **D-56** | El objetivo de la especificación incluye la gestión de categorías, pero ninguna regla, atributo ni flujo desarrolla la entidad. Tampoco se define la relación con productos ni su cardinalidad | CU-19 §1 | Definir si las categorías integran el modelo y, en tal caso, sus atributos y relación |
| **D-57** | El formulario de configuración de demos incorpora una dirección de motor de juego declarada como opcional, atributo que no aparece en ninguna otra especificación ni dentro de la configuración estructurada | CU-19 A8.4 vs. CU-06 §4, CU-07 §4 | Definir si el atributo integra la entidad o la configuración estructurada |
| **D-58** | Los productos de terceros llevan dirección externa, sin que se establezca su relación con las editoriales aliadas ni si resultan comercializables dentro de la plataforma | CU-19 RN-003 vs. CU-17 §1 | Definir la relación entre productos de terceros y editoriales aliadas, y el tratamiento comercial de los primeros |

---

## 7. Trazabilidad

| Caso de uso | Entidades referidas | Reglas relevadas | RNF relevados | Flujos alternativos |
| --- | --- | --- | --- | --- |
| CU-19 Gestionar Catálogo | `products`, `categories`, `demos`, `resources`, *(auditoría)* | 10 | 8 | 11 |
| **Total** | **5 entidades** | **10** | **8** | **11** |

---

## 8. Registro de revisiones

| Revisión | Fecha | Ítem | Descripción | Intervino |
| --- | --- | --- | --- | --- |
| 00 | 24/07/2026 | Documento total | Versión inicial |  |

## 9. Participantes y Aprobaciones

| **Confecciona** | **Revisa** | **Aprueba** |
| --- | --- | --- |
|  |  |  |
