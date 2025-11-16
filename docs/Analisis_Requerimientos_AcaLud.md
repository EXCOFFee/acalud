# Análisis de Requerimientos y Casos de Uso de AcaLud

## Objetivo del Proyecto
AcaLud es una plataforma educativa multiplataforma (web y mobile) orientada a fortalecer las prácticas pedagógicas fuera del horario escolar. Su misión es:
- Permitir que estudiantes accedan a aulas virtuales para realizar tareas y actividades lúdicas creadas por docentes.
- Motivar a los alumnos mediante logros, recompensas y elementos de gamificación.
- Garantizar el acceso gratuito desde cualquier dispositivo conectado a internet.
- Facilitar la colaboración entre docentes a través del intercambio de actividades.

## Alcance
La plataforma contempla las siguientes capacidades:
- Creación, gestión y compartición de aulas virtuales por parte de docentes.
- Acceso de los estudiantes a las aulas asignadas y realización de actividades.
- Sistema de logros y recompensas, incluyendo una tienda de cosméticos.
- Repositorio público de actividades para compartir recursos pedagógicos.
- Moderación de contenido basada en denuncias de usuarios.
- Monetización mediante anuncios manteniendo el acceso gratuito.

## Límites
- No gestiona documentación académica institucional (asistencias, boletines, actas).
- No reemplaza los métodos de evaluación tradicionales.
- No integra proveedores externos de autenticación.
- No maneja pagos ni microtransacciones.
- La moderación de contenido se realiza de forma manual con apoyo de denuncias.

## Diagrama de Casos de Uso
![Diagrama de Casos de Uso](./assets/diagrama-casos-uso.png)

> **Nota:** Colocar la imagen proporcionada en la ruta `docs/assets/diagrama-casos-uso.png` para visualizarla correctamente en la documentación.

## Especificación de Casos de Uso Clave

### CU-007 – Crear Nueva Aula
- **Actor:** Docente
- **Precondiciones:**
  - El docente inició sesión correctamente.
  - Accede a la sección "Mis Aulas".
- **Postcondiciones éxito:** Aula almacenada y docente redirigido a la vista de gestión con mensaje de confirmación.
- **Postcondiciones fallo:** Se muestra error y el aula no se crea.
- **Flujo Básico:** Seleccionar "Crear Aula", completar formulario, validar datos, guardar aula, enviar invitaciones y redirigir.
- **Flujos Alternativos:**
  - **Cancelar:** El docente puede cancelar antes de guardar y volver al dashboard.
  - **Datos inválidos:** El sistema marca errores y mantiene la información previa para corrección.
- **Requisitos Especiales:** Registrar fecha y hora de creación.

### CU-008 – Editar Información de Aula
- **Actor:** Docente
- **Precondiciones:** Aula existente y perteneciente al docente autenticado.
- **Postcondiciones:** Datos actualizados visibles para todos los involucrados.
- **Flujo Básico:** Acceder al aula, seleccionar "Editar", modificar campos y guardar.
- **Prioridad:** Media.

### CU-009 – Eliminar Aula
- **Actor:** Docente
- **Precondiciones:** Aula existente y perteneciente al docente autenticado.
- **Postcondiciones:** Aula eliminada y estudiantes sin acceso.
- **Flujo Básico:** Seleccionar aula, elegir "Eliminar" y confirmar.
- **Prioridad:** Alta.

## Casos de Prueba Asociados

| ID | Caso de Uso | Objetivo | Datos de Prueba | Resultado Esperado |
| --- | --- | --- | --- | --- |
| CU-007 | Crear Nueva Aula | Validar que se crea un aula correctamente | Nombre "Lengua 2°A", descripción opcional, nivel y asignatura | Aula registrada y visible en "Mis Aulas" |
| CU-008 | Editar Información de Aula | Verificar actualización de datos de aula | Aula "Lengua 2°A" actualizada a "Lengua y Literatura 2°A" | Cambios persistidos y visibles |
| CU-009 | Eliminar Aula | Confirmar que un aula puede eliminarse | Aula "Lengua y Literatura 2°A" | Aula eliminada y mensaje de confirmación |

## Catálogo de Requerimientos Funcionales

| Código | Módulo | Descripción |
| --- | --- | --- |
| RF001 | Autenticación | Registro de docentes con validación de credenciales institucionales |
| RF002 | Autenticación | Registro de alumnos mediante invitación |
| RF003 | Autenticación | Recuperación de contraseña vía email |
| RF004 | Gestión de Perfil | Perfiles diferenciados para docentes y estudiantes |
| RF005 | Gestión de Perfil | Modificación de datos personales |
| RF006 | Gestión de Perfil | Personalización de avatar y estética |
| RF007 | Gestión de Aulas | Creación de aulas con información básica |
| RF008 | Gestión de Aulas | Invitación de estudiantes mediante enlaces |
| RF009 | Gestión de Aulas | Visualización y acceso de estudiantes a aulas |
| RF010 | Gestión de Aulas | Abandono voluntario de aulas por estudiantes |
| RF011 | Gestión de Aulas | Edición y eliminación de aulas por docentes |
| RF012 | Gestión de Actividades | Creación de actividades lúdicas |
| RF013 | Gestión de Actividades | Asignación de actividades a aulas |
| RF014 | Gestión de Actividades | Ejecución de actividades por estudiantes |
| RF015 | Gestión de Actividades | Publicación y ocultamiento de actividades |
| RF016 | Gestión de Actividades | Historial de actividades realizadas |
| RF017 | Repositorio | Repositorio público de actividades |
| RF018 | Repositorio | Copia de actividades de la biblioteca |
| RF019 | Repositorio | Puntuación de actividades |
| RF020 | Logros y Tienda | Sistema de logros |
| RF021 | Logros y Tienda | Tienda de cosméticos |
| RF022 | Logros y Tienda | Compra de cosméticos mediante puntos |
| RF023 | Moderación | Reportes de contenido |
| RF024 | Moderación | Historial de reportes para moderadores |
| RF025 | Moderación | Ocultamiento de contenido y bloqueo de usuarios |

## Requerimientos No Funcionales

| Código | Tipo | Descripción |
| --- | --- | --- |
| RNF001 | Usabilidad | Interfaz intuitiva (<3 clics para funciones principales) |
| RNF002 | Usabilidad | Diseño responsive para mobile y desktop |
| RNF003 | Usabilidad | Carga de páginas < 3 segundos |
| RNF004 | Usabilidad | Curva de aprendizaje < 30 minutos |
| RNF005 | Rendimiento | Soporte para 1000 usuarios concurrentes |
| RNF006 | Rendimiento | Respuesta en operaciones críticas < 2 segundos |
| RNF007 | Rendimiento | Almacenamiento para 50,000 usuarios |
| RNF008 | Seguridad | Hash seguro de contraseñas |
| RNF009 | Seguridad | Protección contra XSS y SQL injection |
| RNF010 | Seguridad | Control de acceso basado en roles |
| RNF011 | Seguridad | Cifrado en tránsito y reposo |
| RNF012 | Fiabilidad | Disponibilidad del 99.5% |
| RNF013 | Fiabilidad | Backups automáticos diarios |
| RNF014 | Fiabilidad | Recuperación ante fallos ≤ 4 horas |
| RNF015 | Compatibilidad | Compatibilidad con navegadores modernos |
| RNF016 | Compatibilidad | Soporte 320px a 1920px |
| RNF017 | Compatibilidad | Compatibilidad con Android moderno |
| RNF018 | Mantenibilidad | Documentación técnica completa |
| RNF019 | Mantenibilidad | Código modular estandarizado |
| RNF020 | Mantenibilidad | Sistema de logging |
| RNF021 | Escalabilidad | Escalado horizontal |
| RNF022 | Escalabilidad | API RESTful para integraciones |

## Historias de Usuario

| Código | Módulo | Objetivo | Actor |
| --- | --- | --- | --- |
| HU-01 | Home Institucional | Ingresar a Home | Usuario |
| HU-02 | Home Institucional | Contacto | Usuario |
| HU-03 | Registro de Usuarios | Registración de Docente | Docente |
| HU-04 | Registro de Usuarios | Registración de Alumno | Estudiante |
| HU-05 | Inicio de Sesión | Inicio de Sesión | Docente/Estudiante/Admin |
| HU-06 | Inicio de Sesión | Recuperar Contraseña | Docente/Estudiante |
| HU-07 | Panel Principal | Ver panel principal | Docente/Estudiante |
| HU-08 | Panel Principal | Navegar menú lateral | Docente/Estudiante |
| HU-09 | Mi Cuenta | Ingresar a "Mi Cuenta" | Docente/Estudiante |
| HU-10 | Mi Cuenta | Modificar datos | Docente/Estudiante |
| HU-11 | Mi Cuenta | Modificar avatar | Docente/Estudiante |
| HU-12 | Mis Aulas | Ver "Mis Aulas" Docente | Docente |
| HU-13 | Mis Aulas | Ver "Mis Aulas" Estudiante | Estudiante |
| HU-14 | Mis Aulas | Crear nueva aula | Docente |
| HU-15 | Mis Aulas | Ingresar aula | Docente/Estudiante |
| HU-16 | Mis Aulas | Abandonar aula | Estudiante |
| HU-17 | Mis Aulas | Invitar alumno | Docente |
| HU-18 | Mis Aulas | Editar información de aula | Docente |
| HU-19 | Mis Aulas | Eliminar aula | Docente |
| HU-20 | Mis Aulas | Agregar actividad | Docente |
| HU-21 | Mis Aulas | Seleccionar actividad | Estudiante |
| HU-22 | Mis Aulas | Quitar actividad | Docente |
| HU-23 | Mis Actividades | Ver "Mis Actividades" | Docente |
| HU-24 | Mis Actividades | Crear actividad | Docente |
| HU-25 | Mis Actividades | Editar actividad | Docente |
| HU-26 | Mis Actividades | Eliminar actividad | Docente |
| HU-27 | Mis Actividades | Publicar actividad | Docente |
| HU-28 | Mis Actividades | Realizar actividad | Estudiante |
| HU-29 | Mis Actividades | Ver actividades asignadas | Estudiante |
| HU-30 | Mis Actividades | Ver historial de actividades | Estudiante |
| HU-31 | Mis Actividades | Ver estadísticas | Docente |
| HU-32 | Biblioteca | Ingresar a biblioteca | Docente |
| HU-33 | Biblioteca | Copiar actividad | Docente |
| HU-34 | Biblioteca | Ver actividad | Docente |
| HU-35 | Biblioteca | Puntuar actividad | Docente |
| HU-36 | Logros | Ver logros de estudiante | Estudiante |
| HU-37 | Logros | Ver logros de docente | Docente |
| HU-38 | Tienda | Ingresar a tienda | Docente/Estudiante |
| HU-39 | Tienda | Adquirir cosmético | Docente/Estudiante |
| HU-40 | Moderación | Ver reportes | Moderador |
| HU-41 | Moderación | Reportar actividad de aula | Estudiante |
| HU-42 | Moderación | Reportar actividad de biblioteca | Docente |

## Catálogo de Casos de Uso

| Código | Módulo | Título | Actor |
| --- | --- | --- | --- |
| CU-001 | Acceso | Iniciar sesión | Todos |
| CU-002 | Acceso | Registración | Docente/Estudiante |
| CU-003 | Acceso | Recuperar contraseña | Docente/Estudiante |
| CU-004 | Perfil | Modificar datos de cuenta | Docente/Estudiante |
| CU-005 | Perfil | Modificar avatar | Docente/Estudiante |
| CU-006 | Aulas | Ver aulas | Docente/Estudiante |
| CU-007 | Aulas | Crear nueva aula | Docente |
| CU-008 | Aulas | Editar información de aula | Docente |
| CU-009 | Aulas | Eliminar aula | Docente |
| CU-010 | Aulas | Invitar estudiante | Docente |
| CU-011 | Aulas | Abandonar aula | Estudiante |
| CU-012 | Actividades | Carpeta de actividades | Docente |
| CU-013 | Actividades | Crear actividad | Docente |
| CU-014 | Actividades | Editar actividad | Docente |
| CU-015 | Actividades | Eliminar actividad | Docente |
| CU-016 | Actividades | Agregar actividad a aula | Docente |
| CU-017 | Actividades | Quitar actividad de aula | Docente |
| CU-018 | Actividades | Realizar actividad | Estudiante |
| CU-019 | Actividades | Ver actividades asignadas | Estudiante |
| CU-020 | Actividades | Ver historial de actividades | Estudiante |
| CU-021 | Biblioteca | Ver actividades de biblioteca | Docente |
| CU-022 | Biblioteca | Copiar actividad de biblioteca | Docente |
| CU-023 | Biblioteca | Puntuar actividad | Docente |
| CU-024 | Logros y Tienda | Ver logros conseguidos | Docente/Estudiante |
| CU-025 | Logros y Tienda | Conseguir logro | Docente/Estudiante |
| CU-026 | Logros y Tienda | Ingresar a tienda | Docente/Estudiante |
| CU-027 | Logros y Tienda | Adquirir artículo cosmético | Docente/Estudiante |
| CU-028 | Moderación | Reportar actividad de aula | Docente/Estudiante |
| CU-029 | Moderación | Reportar actividad de biblioteca | Docente |
| CU-030 | Moderación | Ver reportes de usuarios | Moderador |
| CU-031 | Moderación | Ocultar contenido | Moderador |
| CU-032 | Moderación | Suspender usuario | Moderador |

---

Este documento consolida la información clave suministrada para futuras iteraciones del proyecto. Mantenerlo actualizado garantizará que los equipos de desarrollo, QA y negocio trabajen sobre una visión compartida.
