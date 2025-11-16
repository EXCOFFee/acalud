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

