# 2. Tres flujos de punta a punta

Acá seguimos una acción desde que el usuario toca un botón hasta que queda guardada en la
base, archivo por archivo. Son los tres flujos que mejor muestran cómo está hecho el sistema:

1. **Iniciar sesión**: seguridad.
2. **Comprar y pagar**: el flujo con plata, que es el más delicado.
3. **Cargar una sesión de juego**: la acción principal del lado escuela, que alimenta los reportes.

---

## Flujo 1: Iniciar sesión (CU-02)

### En criollo

Es como entrar a un edificio con portero. Mostrás tu DNI (email + contraseña). El portero
lo chequea y te da una **tarjeta magnética** (el token de sesión). De ahí en adelante, cada
vez que querés pasar una puerta, mostrás la tarjeta y no el DNI. El edificio guarda en su
registro qué tarjetas están activas: si la dan de baja, deja de abrir puertas al instante.

### Paso a paso

**1. La pantalla** (`apps/web/app/login/page.tsx`)
El usuario completa el formulario. La página llama a `api.login(email, contrasena)` de
`apps/web/lib/api.ts`.

**2. El cliente HTTP** (`lib/api.ts` → función `pedir()`)
Arma un `POST /api/v1/auth/sesion` con `credentials: 'include'`, que le dice al navegador
"mandá y guardá cookies".

**3. Vercel reenvía** (`apps/web/vercel.json`)
La web vive en `acalud-web.vercel.app`. La petición va a `acalud-web.vercel.app/api/...` y
Vercel la **reenvía** a Render. Para el navegador es el mismo sitio, y eso hace que la cookie
funcione sin pelear con las restricciones entre dominios (CORS, cookies de terceros).

**4. El controller** (`modules/identidad/infrastructure/http/auth.controller.ts`)
NestJS recibe la petición. Antes de que llegue a la lógica, **Zod** valida el cuerpo
(`loginSchema`: que `email` sea un email y que `contrasena` no esté vacía). Si no cumple,
responde 422 ("entrada inválida") sin tocar nada más.

**5. El caso de uso** (`modules/identidad/application/iniciar-sesion.ts`, clase `IniciarSesion`)
Acá está la lógica de verdad:

1. **Normaliza el email** (minúsculas, sin espacios), así `Ana@X.com` y `ana@x.com` son la misma cuenta.
2. **¿Está bloqueada?** Cuenta los intentos fallidos recientes en la tabla `login_attempts`.
   Con 3 fallos en 15 minutos, la cuenta queda bloqueada (RN-007). Esto frena a quien prueba
   contraseñas al azar (ataque de **fuerza bruta**).
3. **Busca la cuenta.** Si **no existe**, igual calcula un hash con una contraseña "dummy"
   antes de responder. ¿Por qué? Si respondiera más rápido cuando el email no existe, un
   atacante podría medir el tiempo y descubrir qué emails están registrados. A eso se le dice
   **anti-enumeración**.
4. **Verifica la contraseña** con **argon2id** (`Argon2Hasher`). La contraseña nunca se
   guarda; se guarda un **hash**, una "huella" de la que no se puede volver atrás.
5. Si falla: anota el intento fallido. Si con este fallo se llega al bloqueo, deja encolado un
   email de aviso al dueño de la cuenta. El mensaje de error es **genérico** ("credenciales
   inválidas"): nunca dice si lo que falló fue el email o la contraseña.
6. Si anda: en **una sola transacción** (todo o nada):
   - guarda la fecha de último login,
   - genera un **token opaco**: 32 bytes aleatorios (`token-opaco.crypto.ts`),
   - guarda en la tabla `sessions` **el hash SHA-256 del token**, nunca el token en sí,
     con vencimiento a 7 días,
   - registra el evento en la auditoría.

**6. La respuesta** (de vuelta en el controller)
El mismo token sale por **dos caminos** a la vez:
- como **cookie `httpOnly`**, para la web (JavaScript no puede leerla, y eso protege contra
  robo por XSS);
- en el **cuerpo** de la respuesta, para la app Android, que lo guarda y lo manda como
  `Authorization: Bearer <token>`.

**7. Las peticiones siguientes** (`platform/auth/auth.guard.ts`)
Cada endpoint protegido tiene el `AuthGuard` (el "portero"). El guard:
- toma el token de la cookie o del header Bearer,
- le calcula el SHA-256,
- busca en `sessions` una fila con ese hash que no esté vencida (`JOIN users`),
- si existe, **renueva** el vencimiento (sesión **deslizante**: mientras la uses, no se vence),
- si no existe, responde 401.

Cerrar sesión (`DELETE /auth/sesion`) **borra la fila**. Por eso la revocación es inmediata.

### Qué podría salir mal (y cómo está cubierto)

| Riesgo | Defensa |
|---|---|
| Alguien prueba miles de contraseñas | Bloqueo por 3 intentos en 15 min |
| Alguien quiere saber si un email está registrado | Mensaje genérico + tiempo constante (hash dummy) |
| Roban la base de datos | Solo hay hashes: argon2id para contraseñas, SHA-256 para tokens |
| Un script malicioso en la página quiere robar la sesión | Cookie `httpOnly`: JavaScript no la ve |

---

## Flujo 2: Comprar y pagar (CU-10, CU-12)

### En criollo

Es como comprar en un local con tarjeta, pero en dos tiempos. Primero el cajero **congela
el ticket** (anota precios y total, y nadie puede tocarlos después). Después te manda al
posnet de Mercado Pago. Cuando el posnet confirma, el local **descuenta el stock, vacía tu
carrito y te manda el comprobante**, todo junto. Y si el posnet manda la confirmación dos
veces (pasa), el local se da cuenta y no cobra ni descuenta dos veces.

### Parte A: Iniciar el checkout

**1. Pantalla** `app/checkout/page.tsx`: el docente ya tiene su carrito, calcula el envío
(`POST /shipping/calculate`), elige modalidad y completa la dirección.

**2. API** `POST /api/v1/checkout` → `checkout.controller.ts` (con `AuthGuard` + Zod).

**3. Caso de uso** `modules/compras/application/iniciar-checkout.ts` (`IniciarCheckout`):

- **Dentro de una transacción:**
  1. Lee el carrito. Si está vacío, error.
  2. **Calcula los precios en el servidor** (`calcularCarrito` en `domain/precio.ts`, con
     descuentos por cantidad). **El cliente jamás manda precios ni totales.** Si los mandara,
     cualquiera podría editar la petición y pagar $1 por un juego.
  3. Chequea que haya stock.
  4. Crea el pedido en estado `pending` con una **"foto" (snapshot)** de cada precio. Si
     después el admin cambia el precio, este pedido no se entera.
  5. Hay un índice único que permite **un solo pedido pendiente por carrito**. Así, si el
     usuario hace doble clic, no se crean dos pedidos.
- **Fuera de la transacción:** le pide a Mercado Pago una **preferencia de pago**
  (`MercadoPagoAdapter.crearPreferencia`). Si Mercado Pago no responde → error "pago no
  disponible".
  *Interpretación mía:* la llamada externa queda fuera de la transacción para no tener la
  base "trabada" esperando a un servicio lento. Es la práctica habitual, pero el código no lo
  dice explícitamente.
- Guarda el id de la preferencia y devuelve el `init_point` (la URL de pago de Mercado Pago).

**4. Frontend** redirige al usuario a Mercado Pago.

### Parte B: El pago se confirma (webhook)

**5.** El usuario paga en Mercado Pago. Mercado Pago le **avisa al servidor** con un
`POST /api/v1/webhooks/mercadopago`. Eso es un **webhook**: en vez de que nosotros
preguntemos todo el tiempo "¿ya pagó?", el otro sistema nos llama cuando pasa algo.

**6. ¿Es realmente Mercado Pago?** (`platform/security/mp-webhook-signature.ts`)
Cualquiera podría mandar un POST a esa URL diciendo "pagó". Por eso se verifica una **firma
HMAC-SHA256**: Mercado Pago firma el aviso con un secreto que solo comparten ellos y
nosotros (`MP_WEBHOOK_SECRET`). Si la firma no coincide → 401 y se descarta.

**7. Caso de uso** `procesar-pago.ts` (`ProcesarPago`), "el corazón transaccional del sistema":

1. **No le cree al aviso:** le pregunta a Mercado Pago directamente el estado y el monto
   del pago (`consultarPago`). Eso es **reconciliación**.
2. **Una sola transacción** con todo esto:
   - Registra el pago en `processed_payments`. El `payment_id` es **UNIQUE**: si el mismo
     aviso llega dos veces, el segundo choca contra la restricción y se ignora
     (`already_processed`). Eso es la **idempotencia**.
   - Si el pago fue **rechazado**: el pedido queda `pending` y el carrito intacto, para que
     pueda reintentar.
   - Si el **monto no coincide** con la "foto" del pedido: pasa a `under_review`. Nunca se
     aprueba en silencio.
   - Si está **aprobado**:
     - Cambia el pedido a `paid` **solo si sigue en `pending`**
       (`UPDATE ... WHERE status = 'pending'`). Si dos avisos llegan al mismo tiempo, solo
       uno gana.
     - Descuenta el stock línea por línea **de forma condicional** ("restá 2 solo si hay al
       menos 2"). Si alguna línea no alcanza, se tira un error y **se deshace TODO**
       (rollback): no queda stock descontado a medias.
     - Si es una compra de escuela (B2B): suma las licencias al inventario institucional.
     - Vacía el carrito.
     - **Encola** el email de confirmación (no lo manda en el momento, ver Outbox).
     - Registra auditoría.
3. Si faltó stock: en otra transacción aparte, registra el pago y deja el pedido
   `under_review` con alerta para el admin.

**8.** Mientras tanto, el usuario vuelve de Mercado Pago a `/checkout/resultado`, que
**consulta cada tantos segundos** (polling) el estado del pedido hasta verlo pagado.

**9.** El worker del outbox (`platform/outbox/outbox-worker.ts`) encuentra el email
pendiente y lo manda por Gmail. Si falla, reintenta hasta 6 veces.

### Qué podría salir mal (y cómo está cubierto)

| Riesgo | Defensa |
|---|---|
| Alguien manipula el precio desde el navegador | Precios calculados en el servidor + snapshot |
| Mercado Pago avisa dos veces | `payment_id` UNIQUE → idempotencia |
| Dos avisos llegan en el mismo milisegundo | `UPDATE ... WHERE status = 'pending'` (guard de estado) |
| Dos personas compran la última unidad | Decremento condicional + rollback total |
| Un atacante simula un aviso de pago | Firma HMAC + reconciliación con Mercado Pago |
| Falla el email justo después de pagar | Outbox: el email queda guardado y se reintenta |

---

## Flujo 3: Cargar una sesión de juego (CU-29)

### En criollo

La escuela compró licencias de un juego y le asignó algunas a una docente. La docente usa el
juego en clase y después completa una **ficha**: fecha, grupo, cuántos chicos, cuánto duró,
qué tan conforme quedó (1 a 5), qué aprendieron. Esas fichas son la materia prima de los
reportes y del dashboard que ve la escuela.

### Paso a paso

**1. Pantalla** `app/mis-juegos/page.tsx`: lista los juegos que la docente tiene asignados
(`GET /api/v1/docentes/me/asignaciones`). Elige uno y completa el formulario. El cliente
ya valida lo básico para dar feedback rápido, pero **la validación que cuenta es la del
servidor**.

**2. API** `POST /api/v1/docentes/me/sesiones-juego` → `docentes.controller.ts`, protegido
por `AuthGuard`. El "me" de la ruta significa "yo, el que tiene la sesión": el id del docente
**sale de la sesión**, no de lo que mande el cliente. Así nadie puede cargar fichas a nombre
de otro.

Antes de entrar al caso de uso, **Zod** valida el formulario (`docentes.esquemas.ts`): por
ejemplo, al menos 1 estudiante y una satisfacción entera entre 1 y 5. Si no cumple → 422 con
el detalle.

**3. Caso de uso** `modules/institucional/application/cargar-sesion-juego.ts`
(`CargarSesionJuego`), todo en una transacción:

1. **¿Este docente está vinculado a una escuela y tiene ese juego asignado?**
   (`buscarMembresiaConJuegoAsignado`). Si no → error `JuegoNoAsignado`.
2. **Arma un "comando" desde el dominio** (`SesionJuego.crear(...)` en
   `domain/sesion-juego.ts`). Ojo: hoy este objeto **no valida nada**, solo arma la orden
   "insertar esta sesión en estado `completada`". La idea de diseño (ADR-002) es que los
   cambios de estado pasen siempre por comandos y nunca por un `UPDATE` suelto. En este caso
   esa idea está aplicada de forma muy liviana.
3. Ejecuta el comando contra la base (`repos.sesiones.ejecutarComando`).
4. Registra auditoría.

**4. Para qué sirve después:** `ver-reporte-institucional.ts` y `ver-dashboard-pedagogico.ts`
agrupan estas fichas con SQL (`GROUP BY`) para mostrar sesiones por juego, satisfacción
promedio, nube de palabras de aprendizajes y evolución en el tiempo. Además
`generar-pdf-*.ts` y `generar-excel-*.ts` las exportan.

### Qué muestra este flujo

- **Autorización por propiedad:** no alcanza con estar logueado; tenés que tener *ese* juego
  asignado.
- **Validación en el borde:** los datos se chequean con Zod apenas entran (en el controller),
  así el caso de uso trabaja siempre con datos que ya tienen la forma correcta.
- **Una debilidad honesta:** el objeto de dominio `SesionJuego` es casi un "cascarón". Si te
  preguntan qué mejorarías, un buen ejemplo es mover las reglas de negocio de la ficha al
  dominio, para que se puedan testear sin HTTP.

---

## Cómo explicarlo en una entrevista

> "En el login uso sesiones opacas guardadas en el servidor: el token viaja como cookie
> httpOnly en la web y como Bearer en la app, y en la base solo guardo su hash. Hay bloqueo por
> intentos y respuestas en tiempo constante para que no se puedan enumerar emails.
>
> En el pago, el precio se congela del lado del servidor al iniciar el checkout. El webhook de
> Mercado Pago se verifica por firma HMAC, se reconcilia consultando el pago, y todo se procesa
> en una sola transacción: idempotencia por payment_id único, cambio de estado condicional y
> descuento de stock atómico. Si algo falla, rollback total."
