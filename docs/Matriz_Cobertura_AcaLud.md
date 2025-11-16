# Matriz de Cobertura AcaLud

Generada: 2025-11-06 (branch `e2e-walkthrough-ajustes`)

Como leer la matriz:
- Cada fila conecta requerimientos funcionales (RF), casos de uso (CU) e historias de usuario (HU) con la implementacion actual y la evidencia de pruebas detectada en el repositorio.
- Estado usa la escala `Completo`, `Parcial`, `Pendiente`.
- Las brechas listan riesgos tecnicos o dependencias externas a cubrir en el siguiente paso del plan secuencial.

## Autenticacion

| RF | CU | HU | Implementacion actual | Pruebas | Estado | Brechas / dependencias |
| --- | --- | --- | --- | --- | --- | --- |
| RF001 | CU-002 | HU-03 | Registro docente via `POST /auth/register` con validacion de dominio (`backend/src/modules/auth/auth.controller.ts`, `auth.service.ts`, `institution-credential.service.ts`) y formulario `RegisterForm` en `src/components/Auth/RegisterForm.tsx`. | Unit: `backend/src/modules/auth/services/institution-credential.service.spec.ts`; E2E: `backend/test/walkthrough.e2e-spec.ts`. | Parcial | Falta documentar dominios permitidos en despliegues reales y cubrir casos negativos en frontend; no hay auditoria de alta docente en base de datos.
| RF002 | CU-002 | HU-04 | Flujo de invitacion a estudiantes no existe; registro actual permite rol estudiante sin token previo. | N/D | Pendiente | Requiere generar tokens de invitacion y endpoints dedicados; ajustar UI para validar invitacion obligatoria.
| RF003 | CU-003 | HU-06 | Endpoints `POST /auth/password/*` implementados en `auth.controller.ts` con servicio `password-recovery.service.ts`; componentes `PasswordRecovery.tsx` y `PasswordRecoverySimple.tsx`. | Unit: `backend/src/modules/auth/services/password-recovery.service.spec.ts`. | Parcial | Falta enrutar pantallas de recuperacion en `App.tsx`, agregar pruebas E2E y wiring real de email (`email.service.ts` depende de configuracion SMTP). |
| RF004 | CU-001 | HU-05 | Login consolidado (`POST /auth/login`, `LoginForm.tsx`, `useAuth`) con bloqueo por intentos. | E2E: `backend/test/walkthrough.e2e-spec.ts`; unit parcial en `auth.service` (sin archivo dedicado). | Parcial | No hay pruebas unitarias sobre bloqueo por intentos o expiracion de token; falta medicion de telemetria de login exitoso/fallo. |

### Observaciones clave (Autenticacion)
- El helper de pruebas permite dominios docentes configurando `TEACHER_ALLOWED_DOMAINS`, pero el valor no esta versionado en configuracion de ambientes.
- Frontend carece de rutas dedicadas para recuperar contraseña; el componente existe pero nunca se renderiza.
- La validacion de tokens ya existe en frontend via `AcceptInvitationPage`, pero el registro de estudiantes sigue sin exigir invitacion previa; RF002 permanece pendiente hasta ajustar onboarding.

## Perfil de usuario

| RF | CU | HU | Implementacion actual | Pruebas | Estado | Brechas / dependencias |
| --- | --- | --- | --- | --- | --- | --- |
| RF004 | CU-004 | HU-09 | Roles separados (`UserRole` en `backend/src/modules/users/user.entity.ts`; `AuthContext` diferencia permisos en `App.tsx`). | E2E: `walkthrough.e2e-spec.ts`. | Completo | Mantener sincronizadas constantes de roles para evitar divergencias entre front y back. |
| RF005 | CU-004 | HU-10 | Actualizacion de perfil via `PATCH /users/profile` (`users.controller.ts`, `users.service.ts`) y vista `UserProfile.tsx` con `profile.service`. | Unit: `backend/src/modules/users/__tests__/profile.service.spec.ts`. | Parcial | Falta prueba E2E sobre edicion con validaciones negativas; UI aun no muestra auditoria de cambios ni mensajes para campos rechazados por back. |
| RF006 | CU-005 | HU-11 | Endpoint `PATCH /users/profile/avatar` maneja upload con `FileInterceptor`; `UserProfile.tsx` incluye panel de avatar pero sin flujo de subida finalizado. | N/D | Parcial | Requiere integrar carga multipart en `profile.service` y validar limites de tamanio/formatos en frontend; agregar pruebas de almacenamiento en S3/local realizados por scripts. |

### Observaciones clave (Perfil)
- El servicio `ProfileAuditService` registra cambios pero la UI no expone el historial (HU-10 pide transparencia).
- No existen pruebas que cubran limites (longitud de bio, redes sociales). Validar con `class-validator` negativo.

## Gestion de aulas

| RF | CU | HU | Implementacion actual | Pruebas | Estado | Brechas / dependencias |
| --- | --- | --- | --- | --- | --- | --- |
| RF007 | CU-007 | HU-14 | Crear aula mediante `ClassroomsController.create`; formulario `CreateClassroomForm.tsx`; DTO con sanitizacion fuerte (`create-classroom.dto.ts`). | Unit: `backend/src/modules/classrooms/__tests__/classrooms.service.spec.ts`; E2E: `backend/test/classroom.e2e-spec.ts`. | Completo | Revisar mensajes de error localizados en frontend (actualmente genericos). |
| RF008 | CU-010 | HU-17 | Invitar estudiantes via lista `invitedStudentEmails` y servicio dedicado `ClassroomInvitationService` que genera tokens y enlaces firmados; frontend consume tokens con `AcceptInvitationPage` y panel docente `ClassroomDetail.tsx` lista, envía, reenvía y revoca invitaciones. | Unit: `backend/src/modules/classrooms/services/classroom-invitation.service.spec.ts`; Front: `AcceptInvitationPage.test.tsx` valida flujos felices/errores. | Parcial | Faltan métricas de entrega, feedback granular de reenvíos y pruebas E2E que cubran aceptación, reintentos fallidos y revocación; sin seguimiento de correos caídos. |
| RF009 | CU-006, CU-015 | HU-13, HU-21 | Estudiantes acceden a aulas (`StudentClassrooms.tsx`, `ActivityPlayer.tsx`); servicio `getStudentClassrooms`. | E2E: `walkthrough.e2e-spec.ts` (join + actividad). | Parcial | Falta vista previa de invitacion (`preview` endpoint sin UI); no hay manejo de aulas archivadas. |
| RF010 | CU-011 | HU-16 | Endpoint `DELETE /classrooms/:id/leave` permite abandonar aula; UI `JoinClassroom.tsx` contiene stub para abandonar pero no esta enlazado. | N/D | Parcial | Implementar boton de abandono y pruebas negativas (no inscrito). |
| RF011 | CU-008, CU-009, CU-022 | HU-18, HU-19, HU-22 | Actualizar/eliminar aulas y gestionar actividades (`ClassroomManagement.tsx`, `ClassroomDetail.tsx`). | Unit: `classrooms.service.spec.ts`; E2E: `classroom.e2e-spec.ts` (crear/get/join). | Parcial | No hay E2E para editar/eliminar ni para quitar actividades; validacion de ownership en frontend depende de estado local. |

### Observaciones clave (Aulas)
- Falta integracion con servicio de notificaciones al regenerar codigos de invitacion.
- Los DTO aceptan hasta 20 correos pero no existe cola de envios ni verificacion de entrega.
- El nuevo `classroom-invitation.service.spec.ts` garantiza la generacion/consumo de tokens; la UI acepta invitaciones pero aun no expone gestion docente avanzada ni reenvio desde el panel.
- El componente `ClassroomManagement` mezcla logica de permisos y UI, rompiendo principio SRP (refactor programado en paso 2 del plan).

## Actividades y progreso

| RF | CU | HU | Implementacion actual | Pruebas | Estado | Brechas / dependencias |
| --- | --- | --- | --- | --- | --- | --- |
| RF012 | CU-013 | HU-24 | Creacion de actividades (`activities.controller.ts`, `activities.service.ts`, formulario `CreateActivityForm.tsx`). | Unit: `backend/src/modules/activities/activities.service.spec.ts`. | Completo | Alinear validaciones de contenido rich text entre front y back. |
| RF013, RF015 | CU-016, CU-017 | HU-20, HU-22 | Asignar/quitar actividades a aulas (`ClassroomsController.addActivityToClassroom`, `removeActivityFromClassroom`). | Unit parcial en `classrooms.service.spec.ts`. | Parcial | No existe vista docente para publicar/ocultar desde UI; falta confirmacion en front al quitar actividades. |
| RF014 | CU-018 | HU-28 | `POST /activities/:id/complete` marca finalizacion con recompensas; `ActivityPlayer.tsx` consume. | Unit: `activities.service.spec.ts`; E2E: `walkthrough.e2e-spec.ts`. | Completo | Agregar pruebas de limites de intentos y validacion de puntajes negativos. |
| RF016 | CU-020, CU-021 | HU-29, HU-30, HU-31 | Estadisticas `GET /activities/:id/stats`; historial por estudiante planeado. | Unit parcial en `activities.service.spec.ts` (estadisticas basicas). | Pendiente | No existe endpoint ni UI para historial individual ni dashboard docente consolidado; faltan pruebas. |

### Observaciones clave (Actividades)
- No hay servicio que consolide progreso por estudiante (RF016); dependera del modulo de analytics.
- Publicar actividad (`PATCH /activities/:id/publish`) existe pero UI no llama y falta test E2E.

## Biblioteca de actividades

| RF | CU | HU | Implementacion actual | Pruebas | Estado | Brechas / dependencias |
| --- | --- | --- | --- | --- | --- | --- |
| RF017 | CU-021, CU-024 | HU-32, HU-33 | Compartir actividades (`ActivityLibraryController.shareActivity`, servicio `activity-library.service.ts`); vista `ActivityRepository.tsx`. | Unit: `backend/src/modules/activity-library/controllers/activity-library.controller.spec.ts`. | Parcial | Falta control docente en frontend para gestionar visibilidad y tags avanzadas; sin pruebas E2E. |
| RF018 | CU-022 | HU-33 | Copiar actividades `POST /activity-library/:id/copy`. | Unit parcial (controller spec). | Parcial | Endpoint depende de aula destino pero UI no muestra selector; no se auditan copias realizadas. |
| RF019 | CU-023 | HU-35 | Valoraciones `POST /activity-library/:id/rate`. | Unit parcial. | Parcial | Falta limite de valoraciones por usuario y pruebas de promedio; `getActivityDetails` devuelve placeholder (no filtra por id). |

### Observaciones clave (Biblioteca)
- Metodo `getActivityDetails` en `activity-library.controller.ts` ignora `id` y retorna primer resultado de busqueda (bug critico).
- No existen pruebas de integracion para asegurar sincronizacion con modulo `activities` al publicar/copiar.

## Gamificacion y tienda

| RF | CU | HU | Implementacion actual | Pruebas | Estado | Brechas / dependencias |
| --- | --- | --- | --- | --- | --- | --- |
| RF020 | CU-024, CU-025 | HU-36, HU-37 | Logros gestionados via `GamificationController` y `gamification.service.ts`; front `Achievements.tsx`. | N/D | Parcial | No hay definicion formal de reglas de desbloqueo ni scheduler que evalue eventos; faltan pruebas unitarias. |
| RF021 | CU-026 | HU-38 | Inventario y tienda expuestos por `Store` module (`backend/src/modules/store`), UI `Store.tsx`. | E2E: `backend/test/store.e2e-spec.ts` (creacion item, compra). | Parcial | Catalogo inicial se carga desde servicio mock en front (`storeService`); falta sincronizar precios reales y agotamiento de stock. |
| RF022 | CU-027 | HU-39 | Compras con monedas (`StoreController.purchase`, `store.service.ts` en front). | E2E: `store.e2e-spec.ts`. | Parcial | No hay reglas de canje por logros ni devoluciones; faltan reportes de fraude y limites diarios. |

### Observaciones clave (Gamificacion/Tienda)
- Modulo de gamificacion no expone eventos para otros modulos (clase `GamificationService` no publica hooks). Revisar durante refactor del paso 2.
- Las recompensas de actividades (`completeActivity`) aumentan `coins` pero no registran auditoria de logro.

## Moderacion y reportes

| RF | CU | HU | Implementacion actual | Pruebas | Estado | Brechas / dependencias |
| --- | --- | --- | --- | --- | --- | --- |
| RF023 | CU-028, CU-029 | HU-41, HU-42 | Creacion de reportes `POST /moderation/reports` con limites anti spam (`moderation.service.ts`); UI estudiante aun no existe. | E2E: `walkthrough.e2e-spec.ts` (crear y listar mis reportes). | Parcial | Falta componente frontend para reportar/bandeja; no hay pruebas de rate limit ni de multiples severidades. |
| RF024 | CU-030 | HU-40 | Listar reportes `GET /moderation/reports` protegido por `RolesGuard`. | N/D | Parcial | Guard utiliza roles literales pero no hay asignacion real de rol moderador/admin en seeds; falta UI. |
| RF025 | CU-031, CU-032 | HU-40 | Endpoints `PUT /moderation/reports/:id` y `DELETE` implementados. | N/D | Pendiente | No existen pruebas ni workflow de suspension de usuarios; falta integracion con modulo `users` para bloquear cuentas y ocultar contenido. |

### Observaciones clave (Moderacion)
- `moderation.service.ts` depende de relaciones con actividades y aulas; revisar integridad referencial antes de aplicar suspensiones.
- No hay dashboard de administracion; se requiere en paso posterior.

## Vacios transversales detectados
- Documentacion dispersa: generar README maestro que enlace esta matriz, `Instrucciones_Acalud.md` y guias de despliegue.
- Falta medicion de cobertura (frontend sin jest tests; backend con suites parciales). Incorporar reporte en CI antes de mover a paso 2.
- Seguridad: no se aplican cabeceras `helmet` ni rate limiting en `main.ts` de backend (los paquetes estan en `package.json` pero no se usan aun).
- Observabilidad/logging: la mayoria de servicios usan `Logger`, pero sin traza correlacionada ni export a destino (pendiente para paso 6 del plan).

> Documento generado automaticamente como insumo para el punto 1 del plan secuencial (`Plan_Secuencial.md`).