Analiza profundamente el proyecto actual
Aplicar principios SOLID, DRY y KISS, cometar cada linea de codigo, modulo, funcion y/o archivo general en español como si no supiera que es cada cosa, Validar cada cosa que se pueda validar para saber donde y como es el error para abordarlo correctamente. Aplica la arquitectura y patron de diseño implementado actualmente y si no hay definido ningun patron y/o arquitectura aplicar las que mejor consideres apto para este proyecto





Actualiza lo que falte actualizar del proyecto actual en base a la informacion que te dare:

AcaLud
Objetivo del proyecto
AcaLud es una herramienta digital multi plataformas (Web, Mobile) con orientación
académica cuyo objetivo es mejorar y fomentar prácticas pedagógicas fuera del horario
escolar. Permite a Estudiantes acceder a Aulas Virtuales y realizar tareas creadas y gestionadas por los Docentes. Motivar a los alumnos a través de logros, recompensas y actividades. Garantizar el acceso gratuito desde cualquier dispositivo con conexión a internet, y facilitar la colaboración entre docentes para compartir actividades.
Alcance del proyecto
AcaLud es una plataforma educativa interactiva que:
Permite a los Docentes crear, gestionar y compartir Aulas Virtuales con tareas y juegos educativos.
Facilita a los Estudiantes la realización de tareas y la obtención de logros y recompensas.
Incluye una Tienda de Recompensas para personalizar perfiles.
Ofrece un repositorio de Tareas compartidas entre docentes.
Implementa un sistema de moderación de contenido basado en denuncias de usuarios.
Se monetiza mediante anuncios, asegurando el acceso gratuito a los usuarios.
Límites del proyecto
No gestiona documentación académica institucional, como registros de asistencia, boletines o actas.
No reemplaza métodos de evaluación tradicionales, sino que actúa como una herramienta complementaria y extraescolar.
No integra sistemas externos de autenticación de identidad.
No incluye pagos ni microtransacciones dentro de la plataforma.
La moderación de contenido es manual, asistida por las denuncias de usuarios.
Casos de Uso
Diagrama de Casos de Uso

Especificación de Casos de Uso

CU-007
Crear Nueva Aula
Actores:
Docente
Precondiciones:
El Docente ha iniciado sesión en la plataforma con éxito.

El Docente accede al apartado “Mis Aulas” de la plataforma.
Postcondiciones:
Éxito: El aula es creada, guardada en la base de datos, y el Docente es redirigido a la vista de gestión del nuevo aula.

Fracaso: Se muestra un mensaje de error al Instructor y se le permite corregir los datos. El aula no se crea en base de datos.
Flujo Básico:
El Docente selecciona la opción "Crear Nueva Aula".

El Sistema muestra un formulario con los campos: Título del Aula, Descripción (opcional), Imagen de portada y lista de mails de Estudiantes Invitados(Opcional).

El Docente completa los campos obligatorios y configura los opcionales según sus necesidades.

El Docente hace clic en el botón "Crear Aula".

El Sistema valida que todos los datos obligatorios sean correctos.

El Sistema guarda el nuevo aula en la base de datos y asigna al Docente como propietario.
El Sistema envía un correo de invitación a los estudiantes listados.

El Sistema redirige al Docente a la página principal del aula recién creada, mostrando un mensaje de confirmación: "Aula creada exitosamente".
Flujo Alternativo:
A. Cancelar Creación:
En cualquier momento antes del paso 4, el Instructor puede hacer clic en "Cancelar".

El Sistema descarta toda la información ingresada y redirige al Instructor a su Dashboard sin crear el aula.

B. Datos Inválidos:

Si en el paso 5 el Sistema detecta datos inválidos (ej. título vacío, código ya en uso), muestra un mensaje de error específico al lado de cada campo afectado.

El caso de uso se reanuda en el paso 2, permitiendo al Instructor corregir la información. Los datos previamente ingresados se mantienen.
Requisitos Especiales:
El sistema debe registrar la fecha y hora de creación del aula.

Casos de Prueba
Identificación de los casos de prueba asociados a los requerimientos o al caso de uso.
Caso de Prueba: CU-007 –Crear Nueva Aula

ID del Caso de Prueba
CU-007
Título
Crear Nueva Aula
Descripción
Verificar que un docente pueda crear una nueva aula virtual desde su cuenta, completando los campos requeridos y guardando los datos correctamente.
Precondiciones

El docente debe tener una cuenta registrada y haber iniciado sesión en la plataforma.
Debe existir conexión estable a internet.
La interfaz de “Mis Aulas” debe estar disponible.
Datos de Prueba
Nombre del aula: “Lengua 2°A”.
Descripción: “Actividades de comprensión lectora”.
Nivel educativo: “Primario”.
Asignatura: “Lengua”.
Pasos
Ingresar a la plataforma como Docente.
Acceder a la sección “Mis Aulas”.
Seleccionar la opción “Crear Nueva Aula”.
Completar los campos obligatorios (nombre, descripción, nivel, asignatura).
Presionar el botón “Guardar” o “Crear Aula”.
Resultado Esperado
El sistema guarda la información y muestra un mensaje de confirmación (“Aula creada con éxito”). La nueva aula aparece listada en la sección “Mis Aulas”.
Postcondiciones
El aula queda registrada en la cuenta del docente.
Se genera un identificador único para el aula.
El docente puede invitar estudiantes o crear tareas dentro del aula.
Prioridad
lta
Resultado Real
(Se completa tras la ejecución de la prueba, por ejemplo: “El aula se creó correctamente y aparece en la lista de aulas del docente”).
Estado
(Se marca como “Aprobado”, “Falló” o “Pendiente” luego de la prueba).
Caso de Prueba: CU-008 – Editar Información de Aula

ID del Caso de Prueba
CU-008
Título
Editar Información de Aula
Descripción
Verificar que el docente pueda modificar correctamente los datos de un aula existente, como su nombre, descripción, nivel educativo o asignatura y que los cambios se guarden y visualicen adecuadamente.
Precondiciones
El docente debe tener una cuenta activa y haber iniciado sesión.
Debe existir al menos un aula creada previamente.
El aula a editar debe ser de propiedad del docente autenticado.
Datos de Prueba

Aula existente: “Lengua 2°A”
Nuevos datos:
• Nombre: “Lengua y Literatura 2°A”
• Descripción: “Aula actualizada para actividades de lectura y redacción”
• Nivel educativo: “Secundario”
Pasos
Ingresar a la plataforma como Docente.
Acceder a la sección “Mis Aulas”.
Seleccionar el aula “Lengua 2°A”.
Hacer clic en la opción “Editar Aula”.
Modificar los campos deseados (nombre, descripción, nivel, etc.).
Presionar el botón “Guardar Cambios”.
Resultado Esperado
El sistema actualiza correctamente la información del aula y muestra un mensaje de confirmación (“Los cambios se guardaron exitosamente”). La vista de “Mis Aulas” muestra los nuevos datos.
Postcondiciones
Los datos del aula quedan actualizados en la base de datos.
Las nuevas modificaciones son visibles para los estudiantes vinculados.
El historial o versión anterior no se conserva (según diseño del sistema).
Prioridad
Media (función importante pero secundaria respecto a la creación del aula).
Resultado Real
(Se completa al ejecutar la prueba, por ejemplo: “Los cambios se guardaron correctamente y se reflejan en la vista del aula”).
Estado
(Aprobado / Falló / Pendiente)
Caso de Prueba: CU-009 – Eliminar Aula

ID del Caso de Prueba
CU-009
Título
Eliminar Aula
Descripción
Verificar que el docente pueda eliminar un aula existente de su cuenta, confirmando la acción y comprobando que el aula deje de estar visible en la lista de “Mis Aulas”.
Precondiciones

El docente debe tener una cuenta registrada e iniciar sesión correctamente.
Debe existir al menos un aula previamente creada.
El aula seleccionada debe pertenecer al docente autenticado.
Datos de Prueba
Aula a eliminar: “Lengua y Literatura 2°A”.
Pasos
Ingresar a la plataforma como Docente.
Acceder a la sección “Mis Aulas”.
Seleccionar el aula “Lengua y Literatura 2°A”.
Hacer clic en la opción “Eliminar Aula”.
Confirmar la acción en el mensaje emergente (“¿Desea eliminar esta aula?”).
Resultado Esperado
El sistema elimina el aula seleccionada, muestra un mensaje de confirmación (“El aula fue eliminada correctamente”) y la lista de “Mis Aulas” se actualiza sin mostrarla.
Postcondiciones
El aula eliminada ya no figura en la cuenta del docente.
Las tareas y logros asociados al aula también se eliminan o quedan inaccesibles (según diseño del sistema).
Los alumnos vinculados pierden acceso al aula.
Prioridad
Alta (funcionalidad crítica que afecta los datos del usuario).
Resultado Real
(Se completa tras la ejecución de la prueba, por ejemplo: “El aula fue eliminada correctamente y ya no figura en la lista”).
Estado
(Aprobado / Falló / Pendiente)
Lista de Requerimientos
Requerimientos Funcionales

Código
Módulo
Título
RF001
Autenticación
El sistema debe permitir el registro de docentes con validación de credenciales institucionales
RF002
Autenticación
El sistema debe permitir el registro de alumnos mediante invitación
RF003
Autenticación
El sistema debe implementar recuperación de contraseña mediante email
RF004
Gestión de Perfil
El sistema debe mantener perfiles separados para docentes y estudiantes
RF005
Gestión de Perfil
Los usuarios deben poder modificar sus datos personales
RF006
Gestión de Perfil
Los usuarios deben poder modificar el avatar y estetica de su cuenta
RF007
Gestión de Aulas
Los docentes deben poder crear aulas con información básica (nombre, descripción, materia)
RF008
Gestión de Aulas
Los docentes deben poder invitar estudiantes a aulas mediante enlaces o invitaciones
RF009
Gestión de Aulas
Los estudiantes deben poder visualizar y acceder a las aulas que fueron invitados
RF010
Gestión de Aulas
Los estudiantes deben poder abandonar aulas voluntariamente
RF011
Gestión de Aulas
Los docentes deben poder editar y eliminar aulas creadas por ellos
RF012
Gestión de Actividades
Los docentes deben poder crear actividades educativas y ludicas con diversos tipos de contenido y guardarlas en su carpeta personal
RF013
Gestión de Actividades
Las actividades deben poder asignarse a aulas específicas
RF014
Gestión de Actividades
Los estudiantes deben poder realizar actividades asignadas
RF015
Gestión de Actividades
Los docentes deben poder publicar/ocultar actividades
RF016
Gestión de Actividades
El sistema debe registrar el historial de actividades realizadas por estudiantes
RF017
Repositorio de Actividades
El sistema debe mantener un repositorio de actividades públicas creadas por los docentes
RF018
Repositorio de Actividades
Los docentes deben poder copiar actividades de la biblioteca a su carpeta personal
RF019
Repositorio de Actividades
Los usuarios deben poder puntuar actividades de la biblioteca
RF020
Logros y Tienda
El sistema debe implementar un sistema de logros para estudiantes y docentes
RF021
Logros y Tienda
Debe existir una tienda de cosméticos para personalización de avatares
RF022
Logros y Tienda
Los usuarios deben poder adquirir cosméticos usando puntos o logros
RF023
Moderación de Contenido
Los usuarios deben poder reportar contenido inapropiado de las Aulas y el Repositorio
RF024
Moderación de Contenido
Los moderadores deben poder acceder al historial de reportes
RF025
Moderación de Contenido
Los moderadores deben poder ocultar el contenido reportado y bloquear acceso a usuarios suspendidos

Requerimientos No Funcionales

Código
Tipo
Descripción
RNF001
Usabilidad
La interfaz debe ser intuitiva y requerir menos de 3 clics para funciones principales
RNF002
Usabilidad
El sistema debe ser responsive y funcionar en dispositivos móviles y desktop
RNF003
Usabilidad
Tiempo de carga de páginas menor a 3 segundos
RNF004
Usabilidad
Curva de aprendizaje no mayor a 30 minutos para funciones básicas
RNF005
Rendimiento
El sistema debe soportar hasta 1000 usuarios concurrentes
RNF006
Rendimiento
Tiempo de respuesta para operaciones críticas menor a 2 segundos
RNF007
Rendimiento
Capacidad de almacenamiento para 50,000 usuarios y sus datos
RNF008
Seguridad
Autenticación mediante hash seguro de contraseñas
RNF009
Seguridad
Protección contra ataques XSS y SQL injection
RNF010
Seguridad
Control de acceso basado en roles (docente/estudiante/administrador)
RNF011
Seguridad
Encriptación de datos sensibles en tránsito y en reposo
RNF012
Fiabilidad
Disponibilidad del 99.5% del sistema
RNF013
Fiabilidad
Backup automático diario de la base de datos
RNF014
Fiabilidad
Sistema de recuperación ante fallos con tiempo máximo de 4 horas
RNF015
Compatibilidad
Compatibilidad con los navegadores Chrome, Firefox, Safari y Edge (últimas 2 versiones)
RNF016
Compatibilidad
Soporte para resoluciones desde 320px hasta 1920px
RNF017
Compatibilidad
Compatibilidad con sistema Android (modernos, revisar version)
RNF018
Mantenibilidad
Documentación técnica completa del sistema
RNF019
Mantenibilidad
Código modular con estándares de desarrollo
RNF020
Mantenibilidad
Sistema de logging para auditoría y debugging
RNF021
Escalabilidad
Arquitectura que permita escalado horizontal
RNF022
Escalabilidad
API RESTful para futuras integraciones

Historias de Usuarios:

Codigo Epica Titulo Actor Descripcion
HU-01 Home Institucional Ingresar a Home Usuario Ingresar a la Home de la Web Institucional
HU-02 Home Institucional Contacto Usuario Ver datos de contacto, poder realizar un reclamo
HU-03 Registro de Usuarios Registracion de Docente Docente Registro de usuario con rol Docente
HU-04 Registro de Usuarios Registracion de Alumno Estudiante Registro de Usuario con rol Estudiante
HU-05 Inicio de Sesion Inicio de Sesion Docente/Estudiante/Admin Iniciar sesion en Plataforma
HU-06 Inicio de Sesion Recuperar Contaseña Docente/Estudiante Proceso de recuperar contraseña por mail
HU-07 Panel Principal/Menu Ver panel principal Docente/Estudiante Menu principal con accesos directos a las funcionalidades de plataforma
HU-08 Panel Principal/Menu Navegar Menu Lateral Docente/Estudiante Menu lateral de navegacion
HU-09 Mi Cuenta/Perfil Ingresar a "Mi Cuenta" Docente/Estudiante Datos y configuracion de la cuenta de usuario
HU-10 Mi Cuenta/Perfil Modificar Datos de Cuenta Docente/Estudiante Modificar la informacion de Cuenta
HU-11 Mi Cuenta/Perfil Modificar Avatar Docente/Estudiante Modificar las caracteristicas del Avatar del perfil que se muestra en el resto de plataforma
HU-12 Mis Aulas Ver "Mis Aulas" Docente Docente
HU-13 Mis Aulas Ver "Mis Aulas" Estudiante Estudiante
HU-14 Mis Aulas Crear Nueva Aula Docente
HU-15 Mis Aulas Ingresar Aula Docente/Estudiante
HU-16 Mis Aulas Abandonar Aula Estudiante
HU-17 Mis Aulas Invitar Alumno a Aula Docente
HU-18 Mis Aulas Editar Informacion de Aula Docente
HU-19 Mis Aulas Eliminar Aula Docente
HU-20 Mis Aulas Agregar Actividad Docente
HU-21 Mis Aulas Seleccionar Actividad Estudiante
HU-22 Mis Aulas Quitar Actividad Docente
HU-23 Mis Actividades Ver "Mis Actividades" Docente
HU-24 Mis Actividades Crear Actividad Docente
HU-25 Mis Actividades Editar Actividad Docente
HU-26 Mis Actividades Eliminar Actividad Docente
HU-27 Mis Actividades Publicar Actividad Docente
HU-28 Mis Actividades Realizar actividad Estudiante
HU-29 Mis Actividades Ver Actividades Asignadas Estudiante
HU-30 Mis Actividades Ver Historial de Actividades Realizadas Estudiante
HU-31 Mis Actividades Ver Estadisticas de Actividad Docente
HU-32 Biblioteca de Actividades Ingresar a Biblioteca Docente
HU-33 Biblioteca de Actividades Copiar Actividad de Biblioteca Docente
HU-34 Biblioteca de Actividades Ver Actividad de Biblioteca Docente
HU-35 Biblioteca de Actividades Puntuar actividad? Docente
HU-36 Logros Ingresar a vista de Logros de Estudiante Estudiante
HU-37 Logros Ingresar a vista de Logros de Docente Docente
HU-38 Tienda Ingresar a Tienda de cosmeticos Docente/Estudiante
HU-39 Tienda Adquirir Cosmetico Docente/Estudiante
HU-40 Moderacion Vista de Reportes Moderador
HU-41 Moderacion Reportar Actividad de Aula Estudiante
HU-42 Moderacion Reportar Actividad de Biblioteca Docente

Casos de Uso

Codigo Modulo Titulo Actor
CU-001 Acceso y Autenticacion Iniciar Sesión Todos
CU-002 Acceso y Autenticacion Registracion Docente-Estudiante
CU-003 Acceso y Autenticacion Recuperar Contraseña Docente-Estudiante
CU-004 Configuracion de Perfil Modificar Datos de Cuenta Docente-Estudiante
CU-005 Configuracion de Perfil Modificar Avatar Docente-Estudiante
CU-006 Aulas Virtuales Ver Aulas Docente-Estudiante
CU-007 Aulas Virtuales Crear Nueva Aula Docente
CU-008 Aulas Virtuales Editar Informacion de Aula Docente
CU-009 Aulas Virtuales Eliminar Aula Docente
CU-010 Aulas Virtuales Invitar Estudiante a Aula Docente
CU-011 Aulas Virtuales Abandonar Aula Estudiante
CU-012 Actividades Carpeta de Actividades Docente
CU-013 Actividades Crear Nueva Actividad Docente
CU-014 Actividades Editar Actividad Docente
CU-015 Actividades Eliminar Actividad Docente
CU-016 Actividades Agregar Actividad a Aula Docente
CU-017 Actividades Quitar Actividad de Aula Docente
CU-018 Actividades Realizar Actividad Estudiante
CU-019 Actividades Ver Actividades Asignadas Estudiante
CU-020 Actividades Ver Historial de Actividades Realizadas Estudiante
CU-021 Biblioteca Ver Actividades de Biblioteca Docente
CU-022 Biblioteca Copiar Actividad de Biblioteca Docente
CU-023 Biblioteca Puntuar Actividad Docente
CU-024 Logros y Tienda Ver Logros Conseguidos Docente-Estudiante
CU-025 Logros y Tienda Conseguir Logro Docente-Estudiante
CU-026 Logros y Tienda Ingresar a Tienda Docente-Estudiante
CU-027 Logros y Tienda Adquirir Articulo Cosmetico Docente-Estudiante
CU-028 Moderacion Reportar Actividad de Aula Docente-Estudiante
CU-029 Moderacion Reportar Actividad de Biblioteca Docente-Estudiante
CU-030 Moderacion Ver Reportes de usuarios Moderador
CU-031 Moderacion Ocultar Contenido Moderador
CU-032 Moderacion Suspender Usuario Moderador

Analiza todo el proyecto a detalle antes de comenzar,
Aplica los princpios SOLID, KISS y DRY , Valida todo lo que se pueda validar para saber en donde y como solucionar los errores y comenta todo lo que se pueda comentar para saber que hace cada cosa (En español)

🚀 Revisión de Cobertura de Requerimientos y Plan de Acción (100% Objetivo)
Fecha: 5 de Noviembre de 2025
Este documento detalla los Huecos Principales encontrados al contrastar el estado actual del desarrollo contra los Requerimientos Funcionales (RF), Casos de Uso (CU) e Historias de Usuario (HU), junto con un Plan de Acción detallado para alcanzar la cobertura total y la robustez técnica.

🛑 Huecos Principales vs. Requerimientos Funcionales (RF/HU/CU)
Los siguientes puntos destacan las áreas críticas que requieren atención inmediata para cumplir con la totalidad de los requisitos funcionales definidos:
1. 🔑 Autenticación (RF001–RF003, HU-03/04/06)
Falta: Prueba y documentación de la “validación institucional”.
Incompleto: Proceso completo de recuperación de contraseña (flujo de e-mail, expiración de token).
2. 👤 Perfil (RF004–RF006, HU-09/10/11)
Falta: Validación de campos obligatorios/longitudes.
Falta: Implementación y pruebas de logs de auditoría.
Falta: Tests específicos para el perfil de ambos roles (docente/alumno).
3. 🏫 Gestión de Aulas (RF007–RF011, CU-007…22)
Cubierto (Parcial): CU-20/11 cubiertos.
Falta: Pruebas automatizadas y validaciones para crear/editar/eliminar (CU-007/008/009).
Falta: Funcionalidad y pruebas de invitar alumnos y abandono voluntario de aula.
Falta: Flujo de invitaciones por e-mail y gestión de tokens únicos.
4. 📝 Actividades (RF012–RF017, CU-012…021, HU-23…31)
Falta: Cobertura de publicar/ocultar actividades.
Falta: Desarrollo de historial por estudiante y estadísticas para docentes.
Falta: Funcionalidad de Biblioteca (copiar/puntuar actividades).
5. 📚 Repositorio/Biblioteca (RF017–RF019, HU-32…35, CU-021…023)
Incompleto: Módulo “activity-library” existe, pero sin pruebas ni endpoints documentados para puntuación y copia.
Falta: Validaciones de permisos exhaustivas.
6. 🏆 Gamificación y Tienda (RF020–RF022, HU-36…39, CU-024…027)
Falta: Reglas claras y documentadas para el desbloqueo de logros.
Falta: Catálogo completo de cosméticos.
Falta: Pruebas completas para canjes con puntos/logros.
7. 🛡️ Moderación (RF023–RF025, HU-40…42, CU-028…032)
Falta: Pruebas para ocultar contenido y suspender usuarios.
Falta: Implementación y pruebas del Dashboard de moderador.
8. 💰 Monetización por Anuncios
Estatus: Integración no real (solo idea).
Requerido: Definición e implementación de módulo de ads/configuración y controles de privacidad.
9. 📱 Mobile/Web Multiplataforma (RNF002/015/016/017)
Falta: Empaquetado específico (Android/iOS) o guía oficial de uso PWA.
Falta: Tests de responsive en dispositivos clave.
10. 📄 Documentación Funcional
Problema: Información dispersa.
Falta: Guía centralizada que trace HU ↔ CU ↔ RF ↔ pruebas ejecutadas.

🚨 Huecos en Requerimientos No Funcionales (RNF)
El proyecto presenta deficiencias significativas en los aspectos de calidad, seguridad y mantenimiento.
1. 📊 Rendimiento y Escalamiento (RNF005–RNF007, RNF021–RNF022)
Falta: Métricas de rendimiento.
Falta: Pruebas de carga (stress testing).
Falta: Comprobaciones de escalabilidad horizontal y contratos públicos/SDK.
2. 🔒 Seguridad (RNF008–RNF011)
Falta: Auditorías de seguridad.
Falta: Sanitización exhaustiva de entradas.
Falta: Implementación de cabeceras de seguridad (CSP/helmet).
Falta: Rotación de tokens y cifrado en reposo.
3. 💾 Fiabilidad y Backup (RNF012–RNF014)
Falta: Jobs automáticos de backup.
Falta: Guías y scripts para recuperación de desastres (DR) en $\le 4\text{h}$.
4. 🌐 Compatibilidad (RNF015–017)
Falta: Matriz de pruebas / CI cross-browser.
Falta: Builds móviles verificados.
5. 🛠️ Mantenibilidad (RNF018–RNF020)
Falta: Medición de cobertura de código.
Falta: Linting completo de todo el monorepo.
Falta: Implementación de logging estructurado y observability (trazas, métricas).

📝 Validaciones y Calidad de Código
1. Validación de Inputs
Problema: Hay huecos en la validación de inputs (ejemplo: CreateClassroomDto no valida longitud/formato de mails).
Acción: Implementar class-validator de forma rigurosa y sumar tests negativos a todos los endpoints.
2. Comentarios en Código
Problema: Código carece de comentarios explicativos en secciones complejas (gamificación/tienda/moderación).
Acción: Añadir comentarios cortos en español sobre decisiones de negocio o lógica compleja.
3. Principios de Diseño (KISS/DRY/SOLID)
Problema: Duplicación en generadores de códigos, validaciones manuales.
Acción: Factorizar helpers y aplicar principios SOLID (ejemplo: delegar validación de permisos en policies reusables).

✅ Plan de Acción Detallado para Cobertura 100%
Este plan se centra en la priorización de flujos críticos, robustez RNF y calidad de código:
I. 🧩 Cobertura Funcional y Pruebas
Auditoría y Matriz: Crear matriz HU/CU ↔ endpoints ↔ tests ↔ estado para seguimiento.
Flujos Críticos:
Cubrir CU-007/008/009 (Creación/Edición/Eliminación de Aulas) con pruebas E2E/Unitarias.
Implementar y probar flujos completos de recuperación de contraseña, invitaciones docentes y abandono de aula.
Completar y testear módulo Actividad-Biblioteca (copia/puntuación).
Añadir pruebas para suspensión/ocultar contenido en Moderación.
Monetización: Definir estrategia (placeholder o real) e implementar controles de desactivación.
II. 🛡️ Robustez No Funcional (RNF)
Rendimiento: Ejecutar Pruebas de Carga (k6/JMeter) y establecer monitoreo de respuesta.
Seguridad (Hardening):
Implementar helmet y rate limit.
Revisar sanitización exhaustiva y activar cifrado en reposo.
Establecer rotación de tokens y registro de logs de seguridad.
Fiabilidad (DR): Crear procesos de backup y DR (scripts automáticos/documentación).
Compatibilidad: Desarrollar matriz de compatibilidad y ejecutar pruebas responsive/móviles.
III. 💻 Mantenibilidad y Calidad de Código
Observabilidad: Instrumentar Winston/Pino con trazas y correlación de requests; crear panel de auditoría para moderadores/admin.
Refactor:
Revisar servicios complejos (gamificación/moderación).
Extraer lógica duplicada (DRY).
Añadir comentarios breves en español donde la intención no sea obvia.
Implementar policies para validación de permisos.
Validación: Integrar class-validator exhaustivamente en DTOs y añadir tests negativos.
IV. 📄 Documentación Integral
Consolidación: Consolidar en un README maestro los enlaces, resultados de pruebas y guías de despliegue.
Detalle: Documentar cada módulo y sus casos de uso (HU ↔ CU ↔ RF).

