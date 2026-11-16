# 6. Guía de respuestas

> ⚠️ Leela **después** de intentar responder [las preguntas](05-preguntas-de-entrevista.md).

## En criollo

No son respuestas para memorizar palabra por palabra. Son los **puntos clave** que tu
respuesta debería tocar. Si tu versión los cubre con otras palabras, está bien, e incluso
mejor, porque suena tuya. Cada una trae un "plus" opcional, para mostrar que vas un paso más
allá.

---

### 1. ¿Qué es Acalud y cómo está organizado?

**Puntos clave:**
- Plataforma de juegos educativos: docentes compran (B2C), escuelas compran licencias en
  lote y las reparten (B2B), los docentes registran sesiones de uso y la escuela ve reportes.
  Suma comunidad (encuestas y propuestas) y un panel de admin.
- Monorepo con pnpm: `apps/web` (Next.js) y `apps/api` (NestJS).
- Web en Vercel, API en Render, base PostgreSQL en Supabase. Todo en planes gratuitos.
- Backend dividido en módulos: identidad, catálogo, compras, institucional, comunidad.

**Plus:** mencionar que los 34 casos de uso de la documentación son la fuente de verdad, y que
cuando el esquema de la base los contradecía, se corregía el esquema.

### 2. ¿Por qué web y Android comparten código?

**Puntos clave:**
- Next.js exportado como estático + Capacitor, que envuelve esa web en una app Android.
- **Gané:** un solo código, paridad de funciones garantizada, un solo lenguaje, menos
  trabajo para una sola persona.
- **Perdí:** sensación menos nativa; sin renderizado en servidor (SSR), así que menos SEO, y
  no hay rutas dinámicas generadas (por eso se usan modales y query params).
- Alternativas: Flutter, React Native o dos frontends. Se descartaron porque la app es de
  formularios y listados, y la web es la plataforma principal.

**Plus:** contar el problema de las cookies en la APK (la web corre en `localhost`, la API en
otro dominio), y que por eso en la app el token viaja como Bearer.

### 3. ¿Qué es la arquitectura hexagonal? Ejemplo.

**Puntos clave:**
- La lógica de negocio no depende de detalles técnicos. Define **puertos** (interfaces) y el
  mundo real se conecta mediante **adaptadores**.
- Tres capas por módulo: dominio, aplicación (casos de uso) e infraestructura.
- **Ejemplo:** `PaymentProvider` tiene dos adaptadores, uno falso y otro real de Mercado Pago.
  El caso de uso `ProcesarPago` es el mismo con los dos. Pasar de pagos simulados a reales
  no tocó la lógica del checkout.
- Lo verifica `dependency-cruiser` en el CI: si alguien rompe las capas, falla el build.

**Plus:** contar la anécdota de que el linter bloqueó usar el puerto de envíos desde otro
módulo, y que se movió a `compras`. Muestra que la regla se cumple de verdad.

### 4. ¿Qué se guarda al iniciar sesión? ¿Por qué no JWT?

**Puntos clave:**
- Se genera un **token opaco aleatorio** (32 bytes). En la tabla `sessions` se guarda **su
  hash SHA-256**, nunca el token, con vencimiento a 7 días deslizante.
- El usuario recibe el token como cookie `httpOnly` (web) y en el cuerpo de la respuesta (APK).
- **No JWT** porque se necesitaba **revocación inmediata**: logout, cambio de contraseña,
  "cerrar todas las sesiones". Con sesiones en la base, revocar es borrar la fila. Con JWT
  habría que mantener una lista negra, que es reinventar las sesiones.

**Plus:** si roban la base, los tokens no sirven, porque solo hay hashes.

### 5. ¿Cómo protegés el login?

**Puntos clave:**
- **Fuerza bruta:** cada intento queda en `login_attempts`; con 3 fallos en 15 minutos, la
  cuenta se bloquea y se le avisa al dueño por email.
- **Enumeración:** el mensaje de error es siempre el mismo, y si el email no existe igual se
  calcula un hash "dummy". Así la respuesta tarda lo mismo y no revela nada.
- Contraseñas con **argon2id**, un hash lento a propósito.

**Plus:** explicar por qué argon2id para contraseñas (lento = caro de atacar) y SHA-256 para
tokens (el token ya es aleatorio y largo, no se puede adivinar; no hace falta que sea lento).

### 6. ¿Por qué el frontend no manda precios?

**Puntos clave:**
- Todo lo que viene del navegador se puede manipular. Si el cliente mandara el precio,
  cualquiera podría editar la petición y pagar $1.
- El servidor calcula los precios y descuentos (`calcularCarrito`) y guarda un **snapshot**
  en el pedido. Si el admin cambia el precio después, el pedido no cambia.
- Además, el webhook compara el monto pagado con ese snapshot. Si no coincide, el pedido
  pasa a `under_review`.

### 7. Mercado Pago avisa dos veces el mismo pago

**Puntos clave:**
- **Idempotencia:** el `payment_id` se guarda en `processed_payments` con restricción
  `UNIQUE`. El segundo aviso choca, se detecta como "ya procesado" y no hace nada.
- **Guard de estado:** el pedido pasa a `paid` con `UPDATE ... WHERE status = 'pending'`. Si
  dos avisos llegan a la vez, solo uno logra el cambio.
- **Stock condicional:** `UPDATE products SET stock = stock - n WHERE id = ... AND stock >= n`.
- Antes de todo eso, se verifica la **firma HMAC** del webhook y se **reconcilia**
  consultando el pago a Mercado Pago.

**Plus:** la idempotencia la garantiza la **base** (constraint), no un `if` en el código. Un
`if` puede fallar si dos peticiones lo evalúan al mismo tiempo; un `UNIQUE`, no.

### 8. ¿Qué es una transacción y dónde la usaste?

**Puntos clave:**
- Un grupo de operaciones que se aplican **todas o ninguna**. Analogía: una transferencia
  bancaria, donde no puede salir la plata de una cuenta sin entrar en la otra.
- En `ProcesarPago`, todo va en **una** transacción: registrar el pago, cambiar el estado,
  descontar el stock de cada línea, sumar al inventario de la escuela, vaciar el carrito,
  encolar el email y auditar.
- Si falla en la mitad (por ejemplo, una línea sin stock) → **rollback total**. No queda
  stock descontado a medias. Después, en otra transacción, el pedido se marca `under_review`
  para que lo revise un admin.
- Se implementa con el patrón **Unit of Work** (`uow.transaccion(...)`).

**Plus:** un detalle fino aprendido en el proyecto. El contador de intentos fallidos del
login **no** puede ir en la misma transacción que termina en error, porque el rollback
también lo borraría. Por eso se guarda aparte.

### 9. ¿Por qué el email no se manda en el momento?

**Puntos clave:**
- Si se manda directo, hay dos riesgos: que el pago se guarde y el email falle (cliente sin
  confirmación), o que el email salga y la transacción se deshaga (confirmación de algo
  que no pasó).
- **Outbox:** el email se **guarda en una tabla** dentro de la misma transacción. Existe si
  y solo si el pago se confirmó.
- Un **worker** dentro del mismo servidor lo manda después, con hasta 6 reintentos. Si sigue
  fallando, lo marca como fallido.
- No hay cola externa porque el plan gratis de Render permite un solo servicio.

### 10. Testing y mejoras

**Puntos clave sobre testing:**
- **Unitarios** (Vitest) para la lógica con fakes: rápidos y deterministas.
- **Integración** con **Testcontainers**: un PostgreSQL real en Docker. Las reglas
  críticas viven en la base (`UNIQUE`, triggers, `UPDATE` condicionales), así que
  simularla no probaría nada. Un mock "dice que sí" aunque el SQL esté mal.
- El CI corre lint, typecheck, tests unitarios y de integración, fronteras hexagonales,
  scanner de secretos (gitleaks) y de vulnerabilidades (osv-scanner), y el build.

**Mejoras honestas (elegí una o dos):**
- Actualizar el contrato OpenAPI, que está atrasado respecto del código.
- Unificar los nombres al inglés (hoy hay rutas en español y en inglés).
- Crear un rol de base con permisos mínimos y revocar UPDATE/DELETE sobre la auditoría
  (defensa en profundidad).
- Implementar el MFA para admin que promete el ADR-004.
- Darle reglas reales al objeto de dominio `SesionJuego`, que hoy es casi un cascarón.
- Sumar tests automáticos de frontend (hoy se verifica con typecheck, lint y build).

**Plus:** decir una mejora con su *por qué*. Muestra criterio, no solo conocimiento.

## Cómo explicarlo en una entrevista

> El hilo conductor que conviene que se note en todas tus respuestas: **"las reglas que
> importan las garantiza algo que no se puede saltear"**. Los precios los calcula el servidor,
> la idempotencia la garantiza un UNIQUE, las capas las controla un linter y los secretos los
> bloquea un scanner. Esa idea, dicha con tus palabras, te deja muy bien parado.
