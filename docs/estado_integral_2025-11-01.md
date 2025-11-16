# Estado Integral del Proyecto AcaLud (01-11-2025)

## Alcance de Esta Iteración
- Se consolida un inventario base que mapea Requerimientos Funcionales (RF), No Funcionales (RNF), Historias de Usuario (HU) y Casos de Uso (CU) con la evidencia disponible en el repositorio.
- Se validaron de forma directa los módulos de **Activities**, **Users** y **Classrooms** mediante suites unitarias (`npm run test`).
- Resto de módulos (auth, gamificación, moderación, tienda, monitoreo, frontend) permanecen **pendientes de verificación técnica**; se citan rutas y documentación existente como punto de partida.
- Próximos pasos: auditoría técnica módulo por módulo, validación de requisitos no funcionales, verificación en frontend/mobile y reporte final.

> **Leyenda de estados**
> - `Implementado (verificado)` → validado mediante tests o revisión directa de código.
> - `Implementado (pendiente verificación)` → documentado/implementado según código o docs, falta validación independiente.
> - `Parcial` → hay avances pero se identifican huecos.
> - `No verificado` → sin evidencia durante esta iteración.

## Matriz de Requerimientos Funcionales
| Código | Estado | Evidencia/localización | Observaciones |
| --- | --- | --- | --- |
| RF001 | Implementado (pendiente verificación) | backend/src/modules/auth/ | Registro docente con validación institucional descrito en `docs/Analisis_Requerimientos_AcaLud.md`; falta repasar flujos y tests.
| RF002 | Implementado (pendiente verificación) | backend/src/modules/auth/ | Invitación alumnos mencionada en `docs/...`; revisar endpoints `invite` y su cobertura.
| RF003 | Implementado (pendiente verificación) | backend/src/modules/auth/password-recovery.* | Recuperación por email documentada; validar entrega de correo y tokens.
| RF004 | Implementado (pendiente verificación) | backend/src/modules/users/ | Perfiles separados docentes/estudiantes en entidad `User.role`; revisar vistas frontend.
| RF005 | Implementado (pendiente verificación) | backend/src/modules/users/users.controller.ts | Actualización de datos expuesta; falta probar formularios front.
| RF006 | Implementado (verificado) | backend/src/modules/users/users.controller.ts | Avatar/estética cubierta por CU-11, unit tests recientes (`users.controller.spec.ts`).
| RF007 | Implementado (verificado) | backend/src/modules/classrooms/classrooms.service.ts | Crear aulas verificado por suite `classrooms.service.spec.ts`.
| RF008 | Implementado (pendiente verificación) | backend/src/modules/classrooms/ dto/invite | Invitaciones por enlace/email documentadas; sin tests revisados.
| RF009 | Implementado (pendiente verificación) | backend/src/modules/classrooms/queries | Visualización aulas estudiantes documentada; falta test llenar.
| RF010 | Implementado (verificado) | backend/src/modules/classrooms/classrooms.service.ts | `leaveClassroom` probado en suite nueva.
| RF011 | Implementado (verificado) | backend/src/modules/classrooms/ | Update/delete aula cubiertos en suite.
| RF012 | Implementado (pendiente verificación) | backend/src/modules/activities/ | Crear actividades implementado; revisar coverage adicional.
| RF013 | Implementado (verificado) | backend/src/modules/classrooms/classrooms.service.ts | `addActivity` validado en tests.
| RF014 | Implementado (pendiente verificación) | backend/src/modules/activities/activities.controller.ts | Completar actividad doc `ESTADO_TESTING.md`; falta repasar pruebas e2e.
| RF015 | Implementado (pendiente verificación) | backend/src/modules/activities/ | Publicar/ocultar actividades (CU-27) documentado; tests parciales.
| RF016 | Implementado (pendiente verificación) | backend/src/modules/activities/activities.service.ts | Historial completado/`ActivityCompletion`; falta validar consultas.
| RF017 | Implementado (pendiente verificación) | backend/src/modules/activity-library/ | Repositorio público; sin validación actual.
| RF018 | Implementado (pendiente verificación) | backend/src/modules/activity-library/ | Copiar actividades; revisar tests existentes.
| RF019 | Implementado (pendiente verificación) | backend/src/modules/activity-library/ratings | Puntuaciones descritas; falta validación funcional.
| RF020 | Implementado (pendiente verificación) | backend/src/modules/gamification/ | Sistema logros descrito en docs; revisar endpoints/tests.
| RF021 | Implementado (pendiente verificación) | backend/src/modules/store/ | Tienda cosmos; flujos en `ESTADO_TESTING.md`; falta test completo.
| RF022 | Implementado (pendiente verificación) | backend/src/modules/store/ | Compras via puntos; validar con seed y endpoints reales.
| RF023 | Implementado (pendiente verificación) | backend/src/modules/moderation/ | Reportes implementados según docs; revisar integraciones.
| RF024 | Implementado (pendiente verificación) | backend/src/modules/moderation/ | Historial reportes; confirmar endpoints UI.
| RF025 | Implementado (pendiente verificación) | backend/src/modules/moderation/ | Ocultar contenido/bloqueos; requiere pruebas.

## Matriz de Requerimientos No Funcionales
| Código | Estado | Evidencia/localización | Observaciones |
| --- | --- | --- | --- |
| RNF001 | Parcial | Frontend (React Router) | Navegación requiere inspección UX; no se midieron clics.
| RNF002 | Implementado (pendiente verificación) | frontend responsive (`tailwind`, `index.css`) | Necesita pruebas en dispositivos.
| RNF003 | No verificado | - | Sin métricas de performance tomadas.
| RNF004 | No verificado | - | Requiere pruebas con usuarios/documentación.
| RNF005 | No verificado | - | Se debe ejecutar pruebas de carga.
| RNF006 | No verificado | - | Igual a RNF005; sin benchmarks.
| RNF007 | No verificado | - | Falta evaluar capacidad almacenamiento.
| RNF008 | Implementado (pendiente verificación) | bcrypt/hashers en auth | Revisar políticas y fortaleza.
| RNF009 | Implementado (pendiente verificación) | NestJS pipes/TypeORM | Verificar auditoría de seguridad.
| RNF010 | Implementado (pendiente verificación) | Roles en entidades y guards | Debe probarse con e2e.
| RNF011 | Parcial | HTTPS recomendado en docs | Falta confirmación de cifrado en reposo.
| RNF012 | No verificado | - | Requiere monitoreo real.
| RNF013 | No verificado | - | Validar scripts de backup.
| RNF014 | No verificado | - | Falta plan DR formal.
| RNF015 | Implementado (pendiente verificación) | Vite target + testing manual | Ensayos cross-browser pendientes.
| RNF016 | Implementado (pendiente verificación) | CSS responsive | Validar 320px.
| RNF017 | Implementado (pendiente verificación) | Documentación mobile | Requiere testing real en Android.
| RNF018 | Implementado (pendiente verificación) | Documentación extensa (`docs/`) | Revisar vigencia.
| RNF019 | Implementado (pendiente verificación) | Estructura modular Nest/React | Auditoría de estilo pendiente.
| RNF020 | Implementado (pendiente verificación) | Logger backend/frontend (`docs/RESUMEN_FINAL_IMPLEMENTACION.md`) | Validar almacenamiento/log rotation.
| RNF021 | Implementado (pendiente verificación) | Docker + arquitectura modular | Revisar escalabilidad en práctica.
| RNF022 | Implementado (pendiente verificación) | APIs REST backend | Confirmar versionado y documentación.

## Historias de Usuario (HU)
| Código | Estado | Evidencia/localización | Observaciones |
| --- | --- | --- | --- |
| HU-01 a HU-02 | Implementado (pendiente verificación) | frontend/pages/home.* | Revisar contenido y formularios de contacto.
| HU-03 a HU-06 | Implementado (pendiente verificación) | auth screens + backend auth | Validar flujos completos.
| HU-07 a HU-11 | Implementado (pendiente verificación) | dashboards + perfil | Confirmar funcionalidad front.
| HU-12 a HU-19 | Implementado (parcial verificado) | `classrooms` backend + componentes UI | Servicios verificados vía tests; UI sin validar.
| HU-20 a HU-27 | Implementado (parcial verificado) | Activities/Store modules | Backend probado parcialmente; revisar UI/UX.
| HU-28 a HU-31 | Implementado (pendiente verificación) | Dashboard estudiante | Confirmar vistas estadísticas.
| HU-32 a HU-35 | Implementado (pendiente verificación) | Biblioteca actividades | Faltan pruebas funcionales.
| HU-36 a HU-39 | Implementado (pendiente verificación) | Gamification/Store | Requiere walkthrough completo.
| HU-40 a HU-42 | Implementado (pendiente verificación) | Moderation module | Validar flujos y permisos.

## Casos de Uso (CU)
| Código | Estado | Evidencia/localización | Observaciones |
| --- | --- | --- | --- |
| CU-001 a CU-006 | Implementado (pendiente verificación) | Auth + Perfil modules | Revisar suites e2e.
| CU-007 a CU-011 | Implementado (verificado parcial) | `classrooms.service.spec.ts` | Cobertura backend confirmada; UI pendiente.
| CU-012 a CU-017 | Implementado (pendiente verificación) | Activities module | Revisar coverage (solo CU-016/017 verificados).
| CU-018 a CU-023 | Implementado (pendiente verificación) | Activities/Library | Confirmar vía pruebas funcionales.
| CU-024 a CU-027 | Implementado (pendiente verificación) | Gamification/Store | Revisar `ESTADO_TESTING.md` y ejecutar flujos.
| CU-028 a CU-032 | Implementado (pendiente verificación) | Moderation module | Faltan tests dedicados.

## Siguientes Pasos Propuestos
1. **Auditoría técnica por módulo** (auth, gamificación, tienda, moderación, biblioteca, frontend) con checklist de endpoints, componentes y tests.
2. **Validación RNF** mediante mediciones (performance, seguridad, compatibilidad). Preparar scripts de carga y revisar configuraciones DevOps.
3. **Walkthrough funcional end-to-end** en frontend/mobile, generando evidencia (capturas, logs) para cada HU/CU crítico.
4. **Actualizar documentación** con hallazgos, abrir tickets para brechas detectadas y planificar la automatización de casos faltantes (e2e/frontend tests).

---
Este documento será la base para las siguientes iteraciones de verificación integral del proyecto.
