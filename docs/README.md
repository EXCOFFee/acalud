|  | **Sistema ACALUD** |
| --- | --- |
|  | Documentación de Arquitectura y Diseño — Índice General |
|  | Versión: 01 | Fecha: 24/07/2026 | Página: 1 de 5 |

| Información del Documento |
| --- |
| Nombre del Proyecto | Sistema Acalud |
| Tipo de documento | Índice general de la documentación |
| Alcance | 34 especificaciones funcionales |
| Propósito | Presentar la estructura completa de la documentación de arquitectura y diseño, con la relación entre sus fases y la ubicación de cada entregable. |

---

## 1. Presentación

Acalud es una plataforma web y móvil para una editorial de juegos educativos, con dos
segmentos de mercado: docentes de forma individual y instituciones educativas. Su diferencial
es el circuito pedagógico: las instituciones adquieren lotes de juegos, los docentes registran
las sesiones de uso en el aula, y los tableros exhiben métricas de aprendizaje.

Esta documentación cubre el análisis, el diseño de datos, los requerimientos y el modelado UML
del sistema, a partir de las 34 especificaciones funcionales.

---

## 2. Estructura de la documentación

La documentación se organiza en seis fases sucesivas. Cada fase toma como insumo el resultado
de la anterior, de modo que existe una cadena de trazabilidad desde el análisis inicial hasta
los diagramas UML de nivel sistema.

| Fase | Contenido | Entregable principal |
| --- | --- | --- |
| 0 | Análisis transversal y decisiones | Consolidado y propuestas de resolución |
| 1 | Modelo de datos conceptual y lógico | Diagrama Entidad-Relación |
| 2 | Esquema físico de la base de datos | Script SQL validado |
| 3 | Requerimientos funcionales y no funcionales | Especificación de requerimientos |
| 4 | Diagramas de comportamiento por caso de uso | 68 diagramas de secuencia y actividad |
| 5 | Diagramas UML de nivel sistema | Casos de uso y clases |

---

## 3. Detalle de las fases

### 3.1 Fase 0 — Análisis Transversal

Relevamiento de las 34 especificaciones funcionales, con identificación de entidades, reglas
de negocio, requerimientos no funcionales e inconsistencias. Se identificaron 58 definiciones
pendientes, resueltas posteriormente por el equipo.

**Ubicación:** raíz de la carpeta de documentación.

| Archivo | Contenido |
| --- | --- |
| `F0-00-consolidado` | Catálogo unificado de 30 entidades y estado de las 58 decisiones |
| `F0-01` a `F0-06` | Análisis detallado por módulo (Identidad, Catálogo, Compras, Institucional, Comunidad, Administración) |
| `F0-07-propuestas-resolucion` | Propuesta fundamentada para cada una de las 58 definiciones, y especificación de CU-34 |

**Hallazgos destacados:** se detectaron dos especificaciones que reproducían contenido ajeno
(CU-24 y CU-20), corregidas por el equipo.

### 3.2 Fase 1 — Diagrama Entidad-Relación

Modelo de datos derivado del análisis, en dos niveles: conceptual (entidades y relaciones
agrupadas por módulo) y lógico (atributos, claves y cardinalidades).

**Ubicación:** carpeta `fase1-der/`.

| Archivo | Contenido |
| --- | --- |
| `F1-DER` | Documento con los modelos conceptual y lógico, y las consideraciones de diseño |
| `diagramas/` | Siete diagramas: uno conceptual global y seis lógicos por módulo, en imagen y en fuente editable |

**Total:** 30 entidades.

### 3.3 Fase 2 — Base de Datos

Esquema físico ejecutable derivado del DER, con tipos, tablas, claves, restricciones de
integridad, índices y disparadores.

**Ubicación:** carpeta `fase2-basededatos/`.

| Archivo | Contenido |
| --- | --- |
| `F2-BaseDeDatos` | Documento con las decisiones del esquema físico y el resultado de la validación |
| `acalud_schema.sql` | Script completo de creación de la base de datos |

**Validación:** el esquema fue ejecutado contra PostgreSQL. Se verificó la creación de 29
tablas, 7 tipos enumerados, 42 claves foráneas e índices, y que las restricciones rechazan
efectivamente los datos inválidos.

### 3.4 Fase 3 — Requerimientos

Consolidación de los requerimientos funcionales y no funcionales, deduplicados y organizados
por módulo, con identificación de su aplicabilidad a las plataformas web y móvil.

**Ubicación:** carpeta `fase3-requerimientos/`.

| Archivo | Contenido |
| --- | --- |
| `F3-Requerimientos` | 172 requerimientos funcionales y 69 no funcionales, con columna de plataforma |

**Numeración:** por caso de uso, según el formato `RF-CU<nn>-<nnn>` y `RNF-CU<nn>-<nnn>`.

### 3.5 Fase 4 — Diagramas UML por Caso de Uso

Diagramas de comportamiento para cada uno de los 34 casos de uso: un diagrama de secuencia y
uno de actividad por caso.

**Ubicación:** carpeta `fase4-uml/`, con una subcarpeta por módulo.

| Módulo | Casos de uso | Diagramas |
| --- | --- | --- |
| `identidad/` | CU-01, 02, 03, 04, 34 | 10 |
| `catalogo/` | CU-06, 07, 08, 09, 17, 18 | 12 |
| `compras/` | CU-05, 10, 11, 12, 13, 22 | 12 |
| `institucional/` | CU-23 a 33 | 22 |
| `comunidad/` | CU-14, 15, 16, 20, 21 | 10 |
| `administracion/` | CU-19 | 2 |
| **Total** | **34** | **68** |

Cada módulo incluye su documento, los diagramas en imagen individual, y las fuentes editables.

### 3.6 Fase 5 — Diagramas UML Generales

Diagramas de nivel sistema: el modelo de casos de uso con sus actores, y el modelo de clases
derivado del modelo de datos.

**Ubicación:** carpeta `fase5-uml-general/`.

| Archivo | Contenido |
| --- | --- |
| `F5-UML-General` | Documento con ambos modelos |
| `diagramas/cu_b2c`, `cu_admin` | Casos de uso, dos vistas por segmento de actores |
| `diagramas/clases_global` | Vista global de las 29 clases y sus relaciones |
| `diagramas/clases_nucleo`, `clases_compras`, `clases_institucional` | Vistas de detalle con atributos y operaciones |

---

## 4. Cadena de trazabilidad

La documentación mantiene trazabilidad completa entre sus fases:

- Cada **entidad** del DER (Fase 1) se origina en una o más **especificaciones** relevadas en
  el análisis (Fase 0).
- Cada **tabla** del esquema físico (Fase 2) se corresponde con una **entidad** del DER.
- Cada **requerimiento** (Fase 3) deriva de una **regla de negocio** relevada en el análisis.
- Cada **diagrama de comportamiento** (Fase 4) representa el flujo de una **especificación**.
- Cada **clase** del modelo (Fase 5) se corresponde con una **tabla** del esquema.

De este modo, es posible rastrear cualquier elemento desde su origen funcional hasta su
representación en el diseño, y a la inversa.

---

## 5. Formato de los entregables

Cada documento se provee en dos formatos:

- **Markdown** (`.md`): para su versionado en el repositorio y su lectura en línea.
- **PDF**: con formato de documento institucional, para su presentación.

Los diagramas se proveen adicionalmente como:

- **Imágenes** (`.png`): para su inclusión en documentos y su visualización directa.
- **Fuentes** (`.mmd`): en formato de texto editable, para su modificación o regeneración.

---

## 6. Trabajos pendientes

Al cierre de esta documentación, restan las siguientes tareas, a cargo del equipo:

| Tarea | Detalle | Documento de referencia |
| --- | --- | --- |
| Corregir CU-02 | Retirar el rol de estudiante | Correcciones para el equipo, sección 2 |
| Precisar CU-12 | Clarificar el formulario de facturación | Correcciones para el equipo, sección 3 |
| Crear CU-34 | Formalizar la especificación de cambio de correo | Correcciones para el equipo, sección 4 |

Estas tareas se detallan en el documento de correcciones para el equipo.

---

## 7. Registro de revisiones

| Revisión | Fecha | Ítem | Descripción | Intervino |
| --- | --- | --- | --- | --- |
| 00 | 24/07/2026 | Documento total | Versión inicial |  |
| 01 | 24/07/2026 | Secciones 3 a 6 | Índice completo de las seis fases |  |

## 8. Participantes y Aprobaciones

| **Confecciona** | **Revisa** | **Aprueba** |
| --- | --- | --- |
|  |  |  |
