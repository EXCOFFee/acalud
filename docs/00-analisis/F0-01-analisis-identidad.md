|  | **Sistema ACALUD** |
| --- | --- |
|  | Análisis Transversal — Módulo 01: Identidad y Acceso |
|  | Versión: 00 | Fecha: 24/07/2026 | Página: 1 de 6 |

| Información del Documento |
| --- |
| Nombre del Proyecto | Sistema Acalud |
| Tipo de documento | Análisis transversal de especificaciones funcionales (documento de trabajo) |
| Casos de uso analizados | CU-01, CU-02, CU-03, CU-04, CU-05 |
| Propósito | Consolidar entidades, atributos, relaciones, reglas de negocio y requerimientos no funcionales dispersos en las especificaciones funcionales, como insumo para el Diagrama Entidad-Relación y el documento de requerimientos. |

---

## 1. Alcance del análisis

Se relevaron las cinco especificaciones funcionales correspondientes al módulo de Identidad
y Acceso. De cada documento se extrajeron las secciones 2 (Precondiciones), 3
(Poscondiciones), 4 (Flujo Principal), 5 (Flujos Alternativos), 6 (Reglas de Negocio) y 7
(Requerimientos No Funcionales).

La sección 8 (Modelo Conceptual de Datos) se encuentra sin completar en los cinco
documentos, por lo que el modelo de datos se deriva íntegramente del texto de las
restantes secciones.

**Observación de agrupamiento.** CU-05 (Ver Historial de Compras) fue relevado junto a este
módulo por tratarse de una consulta sobre datos propios del docente, pero sus entidades
(`orders`, `order_items`, `products`) corresponden al módulo de Compras. Se documentan aquí
únicamente sus referencias; su definición completa se consolida en el análisis de ese módulo.

---

## 2. Catálogo de entidades

### 2.1 Entidades identificadas

| Entidad | Origen (CU / sección) | Naturaleza |
| --- | --- | --- |
| `users` | CU-01 §3, CU-02 §2, CU-04 §2 | Transaccional — núcleo |
| `teacher_profiles` | CU-01 §3, CU-04 §3 | Transaccional — extensión opcional de `users` |
| `levels` | CU-04 §6 RN-002 | Maestro |
| `subjects` | CU-04 §6 RN-002 | Maestro |
| `user_preferences` | CU-04 §4 paso 12 | **A confirmar** — mencionada con "ej:" |
| `carts` | CU-02 §4 paso 16 | **A confirmar** — mencionada como alternativa |
| `orders` | CU-05 §2, §4 | Transaccional — módulo Compras |
| `order_items` | CU-05 §4 paso 4 | Transaccional — módulo Compras |

### 2.2 Atributos relevados

**`users`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `user_id` | CU-02 §4 paso 13 (payload JWT) | Identificador |
| `email` | CU-01 RN-001, CU-02 RN-001 | Único. Identificador de acceso |
| *(hash de contraseña)* | CU-01 RN-003, CU-02 RN-002 | Nombre de columna no especificado en ningún CU |
| `full_name` | CU-01 §4 paso 3, CU-04 §3 | Obligatorio (CU-04 RN-001) |
| `role` | CU-01 RN-002, CU-02 §4 paso 13 | Valores relevados: `docente`, `admin`, `estudiante` |
| `last_login` | CU-02 §3, RN-003 | Se actualiza en cada login exitoso |
| `created_at` | Inferido de CU-05 RN-002 (usado en `orders`) | No mencionado explícitamente para `users` |
| `updated_at` | CU-04 §3, RN-005 | |

**`teacher_profiles`**

| Atributo | Origen | Notas |
| --- | --- | --- |
| `user_id` | CU-04 §4 pasos 10-11 | Relación con `users` |
| `level_id` | CU-04 §3, RN-002 | FK a `levels` |
| `subject_id` | CU-04 §3, RN-002 | FK a `subjects` |
| `school_name` | CU-04 §3 | Opcional |
| `updated_at` | CU-04 RN-005 | |

**`levels`** — Valores enumerados en CU-04 §4 paso 3: Inicial, Primaria, Secundaria.

**`subjects`** — Presentada como selector desplegable (CU-04 §4 paso 3). No se enumeran
valores en ninguna especificación.

---

## 3. Relaciones detectadas

| Relación | Cardinalidad | Origen | Notas |
| --- | --- | --- | --- |
| `users` — `teacher_profiles` | 1 : 0..1 | CU-01 §3, CU-04 A3 | Opcional al registro; se crea al primer guardado de perfil (CU-04 RN-004) |
| `teacher_profiles` — `levels` | 0..1 : 1 | CU-04 RN-002 | Opcional |
| `teacher_profiles` — `subjects` | 0..1 : 1 | CU-04 RN-002 | Opcional |
| `users` — `orders` | 1 : 0..N | CU-05 §2, RN-001 | Un docente puede no tener órdenes |
| `orders` — `order_items` | 1 : 1..N | CU-05 §4 paso 4 | |

---

## 4. Reglas de negocio consolidadas

> **Nota de numeración.** Las reglas se identifican en origen como RN-001, RN-002, etc.,
> reiniciando la numeración en cada especificación. En consecuencia, el identificador RN-001
> designa cinco reglas distintas dentro de este módulo. Para el documento de requerimientos
> se requiere una numeración unívoca; ver decisión D-01.

| ID propuesto | Origen | Regla |
| --- | --- | --- |
| RN-ID-01 | CU-01 RN-001, CU-02 RN-001 | El email es único por usuario y constituye el identificador de acceso |
| RN-ID-02 | CU-01 RN-002 | El rol por defecto de un registro nuevo es `docente`. El rol `admin` solo puede asignarlo otro administrador |
| RN-ID-03 | CU-01 RN-003, CU-02 RN-002 | La contraseña se almacena y verifica únicamente como hash. Nunca en texto plano |
| RN-ID-04 | CU-01 §5 A2 | La contraseña debe tener 8 caracteres como mínimo, con al menos un número y una mayúscula |
| RN-ID-05 | CU-01 RN-004 | El perfil docente es opcional al registro y puede completarse posteriormente |
| RN-ID-06 | CU-01 RN-005, CU-02 RN-005 | El carrito anónimo se migra automáticamente a la cuenta al registrarse o iniciar sesión |
| RN-ID-07 | CU-02 RN-003 | `last_login` se actualiza en cada inicio de sesión exitoso |
| RN-ID-08 | CU-02 RN-004 | El token de sesión expira a las 8 horas, o a los 30 días si el usuario marcó "Recordarme" |
| RN-ID-09 | CU-02 RN-006 | Los usuarios con rol `estudiante` no pueden iniciar sesión en esta versión |
| RN-ID-10 | CU-02 RN-007 | Se registran los intentos fallidos por email. Al superar 3, el email se bloquea 15 minutos |
| RN-ID-11 | CU-03 RN-002, RN-003 | El cierre de sesión elimina el token del almacenamiento local y limpia el estado de autenticación |
| RN-ID-12 | CU-03 RN-004 | Al cerrar sesión, el carrito pasa a anónimo sin perder productos |
| RN-ID-13 | CU-03 RN-005 | El registro del cierre de sesión en el servidor es opcional; su falla no debe bloquear el cierre local |
| RN-ID-14 | CU-04 RN-001 | El nombre completo es obligatorio |
| RN-ID-15 | CU-04 RN-002 | Nivel y materia son opcionales; de informarse, deben existir en las tablas maestro |
| RN-ID-16 | CU-04 RN-003 | El email no se modifica desde el perfil. Requiere un flujo separado con verificación |
| RN-ID-17 | CU-04 RN-004 | Si no existe registro en `teacher_profiles`, se crea al guardar por primera vez |
| RN-ID-18 | CU-05 RN-001 | El historial muestra únicamente las órdenes del usuario autenticado |
| RN-ID-19 | CU-05 RN-002 | Las órdenes se ordenan por defecto de más reciente a más antigua |
| RN-ID-20 | CU-05 RN-004 | El código de seguimiento se muestra solo con estado Enviado o Entregado |
| RN-ID-21 | CU-01 RN-006, CU-02 RN-008, CU-03 RN-007, CU-04 RN-007, CU-05 RN-008 | Toda operación del módulo emite un evento de analítica con datos anonimizados |

**Reglas duplicadas detectadas:** 6 de las 38 reglas relevadas expresan el mismo requisito en
más de un documento (analítica, unicidad de email, hash de contraseña, migración de carrito).

---

## 5. Requerimientos no funcionales consolidados

### 5.1 Transversales al módulo (aparecen en más de una especificación)

| ID propuesto | Categoría | Requerimiento | Origen |
| --- | --- | --- | --- |
| RNF-ID-01 | Seguridad | Todo tráfico con credenciales o datos personales viaja sobre HTTPS (TLS 1.2 o superior) | CU-01, CU-02, CU-04 |
| RNF-ID-02 | Rendimiento | El tiempo de respuesta de las operaciones del módulo es inferior a 2 segundos | CU-01, CU-02, CU-04, CU-05 |
| RNF-ID-03 | Compatibilidad | Las pantallas son adaptables, con ancho mínimo soportado de 320 px | CU-01, CU-02 |
| RNF-ID-04 | Seguridad | Los endpoints de datos propios requieren token de sesión válido | CU-04, CU-05 |

### 5.2 Específicos

| ID propuesto | Categoría | Requerimiento | Origen |
| --- | --- | --- | --- |
| RNF-ID-05 | Seguridad | El hash de contraseña utiliza bcrypt con factor de costo 10 o superior | CU-01 RNF-002 |
| RNF-ID-06 | Usabilidad | El formulario de registro no expone más de 5 campos simultáneos | CU-01 RNF-003 |
| RNF-ID-07 | Disponibilidad | Registro: máximo 5 intentos por IP cada 15 minutos | CU-01 RNF-005 |
| RNF-ID-08 | Seguridad | El token se almacena en cookie con marcas HttpOnly y Secure, o en almacenamiento local con protección contra XSS | CU-02 RNF-002 |
| RNF-ID-09 | Seguridad | Login: máximo 5 intentos por IP por minuto | CU-02 RNF-003 |
| RNF-ID-10 | Usabilidad | El formulario de login expone enlaces visibles a recuperación de contraseña y registro | CU-02 RNF-005 |
| RNF-ID-11 | Disponibilidad | La sesión persiste al cerrar el navegador cuando se marcó "Recordarme" | CU-02 RNF-007 |
| RNF-ID-12 | Seguridad | De implementarse invalidación en servidor, el endpoint de cierre de sesión requiere autenticación e incorpora el token a una lista de revocación hasta su expiración natural | CU-03 RNF-002 |
| RNF-ID-13 | Usabilidad | El cierre de sesión no requiere más de 2 clics y solicita confirmación | CU-03 RNF-003, RNF-004 |
| RNF-ID-14 | Rendimiento | El cierre de sesión local se completa en menos de 500 ms | CU-03 RNF-005 |
| RNF-ID-15 | Compatibilidad | El cierre de sesión se propaga entre pestañas abiertas del mismo dominio | CU-03 RNF-007 |
| RNF-ID-16 | Usabilidad | El formulario de perfil precarga los datos vigentes del usuario | CU-04 RNF-004 |
| RNF-ID-17 | Seguridad | La consulta de una orden verifica la propiedad del recurso y responde 403 ante un tercero | CU-05 RNF-002 |
| RNF-ID-18 | Rendimiento | El listado de órdenes se pagina para evitar sobrecarga | CU-05 RNF-004 |

**Requerimientos duplicados detectados:** 11 de los 33 relevados. La consolidación reduce el
conjunto a 18 requerimientos unívocos para este módulo.

---

## 6. Inconsistencias detectadas y decisiones requeridas

Las siguientes situaciones no pueden resolverse desde la documentación: o bien dos
especificaciones se contradicen, o bien una misma especificación deja una opción abierta.
Cada una requiere una definición antes de elaborar el modelo de datos.

| ID | Situación | Origen | Definición requerida |
| --- | --- | --- | --- |
| **D-01** | La numeración RN/RNF se reinicia en cada especificación: RN-001 identifica cinco reglas distintas dentro de este módulo, y 33 en el proyecto completo | Todos | Adoptar numeración correlativa global (RN-001 a RN-267) o numeración por caso de uso (RN-CU01-001) |
| **D-02** | El cierre de sesión no invalida el token en el servidor. La especificación indica que el registro en servidor es opcional y admite que el token siga siendo válido hasta su expiración natural. Combinado con la vigencia de 30 días de "Recordarme", un token comprometido permanece activo un mes después de que el usuario cierre sesión | CU-03 objetivo vs. RN-005 vs. A2.6 vs. CU-02 RN-004 | Definir si la lista de revocación es obligatoria u opcional. La especificación se contradice a sí misma: el objetivo declara invalidación, RN-005 la declara opcional |
| **D-03** | El rol `estudiante` es bloqueado en el login, pero ninguna especificación describe cómo se crea un usuario con ese rol | CU-02 RN-006, A4 vs. CU-01 RN-002 | Definir si el dominio de roles incluye `estudiante` como previsión, o si se retira y con él el flujo A4 de CU-02 |
| **D-04** | Coexisten dos representaciones del rol: un atributo `role` incluido en el token, y un indicador booleano `is_admin` presente en otras especificaciones del proyecto | CU-02 §4 paso 13 vs. corpus general (27 apariciones) | Definir una única representación |
| **D-05** | La sincronización del carrito anónimo admite dos destinos alternativos: una tabla `carts` o registros de `orders` en estado pendiente | CU-02 §4 paso 16 | Definir el destino. Son modelos de datos incompatibles entre sí |
| **D-06** | La tabla de preferencias de notificación se menciona a título de ejemplo ("ej: `user_preferences`"), sin definirse | CU-04 §4 paso 12 | Definir si es entidad propia o atributo de `users` |
| **D-07** | El algoritmo de hash aparece como "bcrypt/argon2" en los flujos y fijado en bcrypt en el requerimiento no funcional | CU-01 §4 paso 10 vs. CU-01 RNF-002 | Definir el algoritmo. Ambos flujos admiten argon2; solo el RNF restringe a bcrypt |
| **D-08** | Conviven dos mecanismos de contención de intentos fallidos con parámetros distintos: bloqueo por email (3 intentos, 15 minutos) y limitación por IP (5 intentos por minuto) | CU-02 RN-007 vs. RNF-003 | Confirmar si ambos mecanismos son concurrentes por diseño |
| **D-09** | El nombre de la columna que almacena el hash de contraseña no aparece en ninguna especificación | Todos | Definir denominación |
| **D-10** | El cambio de email se declara fuera del alcance de CU-04 y se remite a "un flujo separado que requiere verificación", inexistente entre los 33 casos de uso | CU-04 RN-003, A8 | Definir si se incorpora al alcance o se documenta como funcionalidad diferida |
| **D-11** | La verificación de email se menciona como condición para acciones críticas, con la salvedad "opcional, si se implementa" | CU-01 RN-007 | Definir si integra el alcance |
| **D-12** | La sincronización entre pestañas es un mecanismo propio de navegador y no tiene equivalente en la aplicación móvil empaquetada | CU-03 A5, RNF-007 | Confirmar que el requerimiento aplica exclusivamente a la plataforma web |

---

## 7. Trazabilidad

| Caso de uso | Entidades referidas | Reglas relevadas | RNF relevados | Flujos alternativos |
| --- | --- | --- | --- | --- |
| CU-01 Registrar Docente | `users`, `teacher_profiles`, carrito anónimo | 7 | 6 | 7 |
| CU-02 Login Docente | `users`, `carts`/`orders` | 8 | 7 | 9 |
| CU-03 Logout Docente | *(sin persistencia obligatoria)* | 7 | 7 | 5 |
| CU-04 Actualizar Perfil | `users`, `teacher_profiles`, `levels`, `subjects`, `user_preferences` | 8 | 6 | 8 |
| CU-05 Historial de Compras | `orders`, `order_items`, `products` | 8 | 7 | 9 |
| **Total** | **8 entidades** | **38** | **33** | **38** |

---

## 8. Registro de revisiones

| Revisión | Fecha | Ítem | Descripción | Intervino |
| --- | --- | --- | --- | --- |
| 00 | 24/07/2026 | Documento total | Versión inicial |  |

## 9. Participantes y Aprobaciones

| **Confecciona** | **Revisa** | **Aprueba** |
| --- | --- | --- |
|  |  |  |
