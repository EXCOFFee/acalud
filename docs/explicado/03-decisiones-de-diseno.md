# 3. Las 5 decisiones de diseño más importantes

## En criollo

Toda decisión técnica es **elegir qué perder**. No hay opción perfecta: hay una que encaja
mejor con *este* proyecto. Las restricciones de Acalud explican casi todas las elecciones:

- **Presupuesto $0**: todo tiene que entrar en planes gratuitos, sin tarjeta.
- **Un solo desarrollador** (con ayuda de IA).
- **Hay plata en juego**: los pagos no pueden quedar a medias.
- **Web y Android con las mismas funciones.**
- **Es una tesis**: se valora poder demostrar y explicar seguridad y arquitectura.

Las decisiones formales están en los ADR (`docs/_archivo-v1/02-arquitectura/2.2-adrs/`).
Acá van resumidas, con lo que se descartó.

---

## Decisión 1: Una sola interfaz para web y Android (ADR-001)

**Qué se eligió:** Next.js compilado como sitio estático. El mismo resultado se publica en
Vercel (web) y se empaqueta como APK con **Capacitor**, que mete la web adentro de una app
Android, como una ventana de navegador sin barra.

| Opción | Qué se gana | Qué se pierde | Por qué se descartó |
|---|---|---|---|
| **Next.js + Capacitor** ✅ | Un solo código para web y app. Paridad de funciones "gratis". Un solo lenguaje (TypeScript). Build de la APK 100 % local. | Una app que es "web adentro" no se siente tan nativa. Sin SSR (se pierde algo de SEO y de carga inicial). | Es la elegida. |
| Flutter | Mejor rendimiento y sensación nativa. | Otro lenguaje (Dart). Flutter Web es flojo para SEO y Lighthouse. | La app es de formularios y listados: no necesita ese rendimiento, y la web es la plataforma principal. |
| React Native + Expo | App más nativa con React. | La web queda como ciudadana de segunda. Los builds empujan al servicio en la nube de Expo. | Rompe la paridad web/app y suma dependencias externas. |
| Dos frontends separados | Lo mejor de cada plataforma. | El doble de código, de pruebas y de bugs. | Inviable para una sola persona. |

**Cuándo convendría otra opción:** si la app necesitara animaciones pesadas, cámara o
sensores todo el tiempo, o funcionar offline, Flutter o React Native ganarían.

**Consecuencia que tenés que saber:** como el sitio es **estático**, no hay rutas dinámicas
tipo `/pedidos/123` generadas en el servidor. Por eso el detalle de un ítem se muestra en un
modal o con query params (`/catalogo/juego?id=...`).

---

## Decisión 2: Monolito modular con arquitectura hexagonal (ADR-002)

**Qué se eligió:** **un solo servidor** (monolito) dividido en módulos por tema. Cada módulo
usa **puertos y adaptadores** (hexagonal): la lógica de negocio define "enchufes"
(interfaces) y el mundo real (base, Mercado Pago, email) se "enchufa" desde afuera.

**Analogía:** un enchufe de pared. Tu heladera no sabe si la luz viene de la red o de un
generador; solo sabe que necesita 220V. Así, `ProcesarPago` no sabe si habla con el Mercado
Pago real o con uno falso para tests: solo conoce el puerto `PaymentProvider`.

| Opción | Qué se gana | Qué se pierde | Por qué se descartó |
|---|---|---|---|
| **Monolito modular hexagonal** ✅ | Un solo deploy (entra en el plan gratis). Las transacciones entre partes son simples. Las integraciones se cambian por configuración (fake ↔ real). Se testea sin servicios externos. | Más archivos e interfaces: hay "ceremonia". Hay que respetar la disciplina de capas. | Es la elegida. |
| Microservicios | Escalar y desplegar cada parte por separado. | Muchos servidores (no entran en el plan gratis). Transacciones distribuidas, que son muy difíciles. Más operación. | Render gratis permite **un solo** servicio siempre prendido. Y el checkout necesita atomicidad. |
| MVC clásico en capas, sin puertos | Más simple y rápido de escribir. | La lógica termina mezclada con el SQL y con el SDK de Mercado Pago. Es difícil testear y cambiar de proveedor. | Hay 4 integraciones externas con "falso" obligatorio para desarrollar y testear. |

**Cómo se hace cumplir:** `dependency-cruiser` corre en el CI y **rompe el build** si, por
ejemplo, el dominio importa algo de infraestructura o si un módulo importa el interior de
otro. Ya pasó en la práctica: al hacer CU-13 se quiso usar el puerto de envíos desde otro
módulo, el linter lo bloqueó y el puerto se movió a `compras`.

**Cuándo convendría otra opción:** con un equipo grande, partes que escalan muy distinto o
deploys independientes por equipo, convendrían microservicios. Para un CRUD chico sin
integraciones, alcanzaría con MVC simple.

---

## Decisión 3: Sesiones opacas en el servidor, con transporte dual (ADR-004)

**Qué se eligió:** autenticación **propia**. Al loguearte se genera un token aleatorio. En la
base se guarda **su hash** en la tabla `sessions`. Viaja como cookie `httpOnly` en la web y
como `Bearer` en la APK, pero los dos usan **la misma tabla**.

| Opción | Qué se gana | Qué se pierde | Por qué se descartó |
|---|---|---|---|
| **Sesión opaca server-side** ✅ | Revocación **inmediata**: borrás la fila y listo. Logout y "cerrar todas las sesiones" son triviales. El token no lleva datos adentro. | Cada petición consulta la base (una query más). | Es la elegida. |
| JWT stateless | No consulta la base en cada petición. Escala horizontalmente fácil. | **No se puede revocar** antes de que venza, salvo con una "lista negra" que se consulta en cada petición. Y eso es volver a tener sesiones, con pasos extra. | Los CU exigen invalidar sesiones al instante (logout, cambio de contraseña). |
| Supabase Auth (servicio armado) | Mucho menos código y menos riesgo de errores propios. | Menos control sobre las reglas (bloqueo, mensajes). Menos material de seguridad para la tesis. | Decisión del equipo por la variante propia. Queda como plan B. |
| Cookie también en la APK | Un solo mecanismo. | En la APK la web corre en `localhost` y la API en otro dominio: la cookie sería "de terceros", y esas cookies son frágiles. | Descartada por diseño. |

**El truco de Vercel:** para que la cookie de la web funcione sin problemas entre dominios,
Vercel reenvía `/api/*` a Render. Así el navegador cree que todo es el mismo sitio.

**Ojo, dato honesto:** el ADR-004 también promete **MFA (doble factor) para el admin**, y eso
**no está implementado**.

---

## Decisión 4: PostgreSQL, y que la base misma garantice la consistencia (ADR-003)

**Qué se eligió:** PostgreSQL gestionado en Supabase, accedido **solo desde el backend**, con
**SQL escrito a mano** (librería `pg`) y migraciones SQL numeradas (`infra/migrations/0001`
a `0019`). Además, las reglas críticas se apoyan en la **base**, no solo en el código:

- `UNIQUE` en `payment_id` → el webhook es idempotente.
- `UPDATE ... WHERE status = 'pending'` → no hay transiciones dobles.
- `UPDATE stock ... WHERE cantidad >= n` → no se vende stock que no hay.
- Índice único "un pedido pendiente por carrito" → no hay pedidos duplicados por doble clic.
- Triggers que impiden borrar o modificar la auditoría (append-only).

**Analogía:** confiar solo en el código para no vender de más es como confiar en que dos
cajeros se avisen a los gritos. Que lo controle la base es como tener **un solo talonario
numerado**: es físicamente imposible usar el mismo número dos veces.

| Opción | Qué se gana | Qué se pierde | Por qué se descartó |
|---|---|---|---|
| **PostgreSQL relacional** ✅ | Transacciones ACID (todo o nada). Constraints. Joins y `GROUP BY` para reportes. Gratis en Supabase. | Un solo nodo, sin alta disponibilidad en el plan gratis. Hay que diseñar el esquema con cuidado. | Es la elegida. |
| Base NoSQL (ej. MongoDB) | Esquema flexible. | Las transacciones multi-documento y las restricciones son más débiles. El modelo es muy relacional (pedidos ↔ líneas ↔ stock ↔ instituciones). | El checkout exige atomicidad y unicidad nativas. |
| Que el frontend hable directo con Supabase (con RLS) | Menos backend que escribir. | La lógica de negocio y la autorización quedarían repartidas en políticas de base. Es más difícil razonar sobre el checkout. | La autorización vive en el backend. RLS quedó como "deny-all" de respaldo (migración `0003`). |

**SQL a mano vs ORM:** el código usa `pg` con SQL escrito a mano. **No encontré en los ADR una
comparación explícita contra un ORM** (como Prisma), así que no te voy a inventar el motivo.
Lo que sí se ve: con SQL a mano se controla exactamente cada `UPDATE ... WHERE` condicional,
que es justo lo crítico acá. La contra es más código repetitivo y que los errores de columna
se descubren recién al correr (de ahí la importancia de los tests de integración).

**Precedencia (regla del proyecto):** si el esquema contradice un caso de uso, **gana el caso
de uso** y el esquema se corrige con una migración nueva. Ejemplo: la migración `0017` hizo
opcional el producto de un recurso.

---

## Decisión 5: Outbox para emails + hosting gratis con un solo servicio (ADR-002, ADR-005)

**Qué se eligió:** cuando algo tiene que mandar un email (confirmación de compra, verificar
cuenta), **no lo manda en el momento**. Lo **guarda en la tabla `outbox_emails` dentro de la
misma transacción** que el cambio de negocio. Después, un **worker** que corre adentro del
mismo servidor (`setInterval`) lee los pendientes y los manda, con hasta 6 reintentos.

**Analogía:** en vez de ir corriendo al correo cada vez que hay que mandar una carta, la dejás
en la **bandeja de salida** de la oficina. El cadete pasa cada tanto y se lleva todo. Si el
correo está cerrado, vuelve a intentar más tarde. Y como la carta se escribió junto con el
pedido, nunca hay un pedido sin carta ni una carta sin pedido.

| Opción | Qué se gana | Qué se pierde | Por qué se descartó |
|---|---|---|---|
| **Outbox + worker in-process** ✅ | Consistencia: el email existe si y solo si el cambio se guardó. Reintentos automáticos. No frena la respuesta al usuario. Un solo servicio. | El email llega unos segundos tarde. Si el servidor está dormido, el worker también. | Es la elegida. |
| Mandar el email directo en el caso de uso | Simple e inmediato. | Si el email falla después del commit, se pierde. Si falla antes, ¿se deshace la compra? Y además la respuesta se vuelve lenta. | No garantiza consistencia. |
| Cola externa (Redis, RabbitMQ, SQS) + worker separado | Escala y es robusto. | Otro servicio más, que no entra en el plan gratis. Más operación. | Render gratis permite un solo servicio siempre prendido. |

**El hosting que lo condiciona (ADR-005):** Vercel (web) + Render (API) + Supabase (base),
todo gratis. La contra conocida es que **Render se duerme** tras 15 minutos sin uso, y la
primera petición puede tardar 30 a 60 segundos ("cold start"). Está declarado y aceptado.

---

## Cómo explicarlo en una entrevista

> "Las decisiones salieron de las restricciones: presupuesto cero, una sola persona y pagos
> reales. Por eso un monolito modular hexagonal en vez de microservicios: un solo deploy,
> transacciones simples e integraciones intercambiables. Sesiones opacas en vez de JWT, porque
> necesitaba revocación inmediata. PostgreSQL con constraints como red de seguridad para la
> idempotencia y la concurrencia. Y outbox para que los emails sean consistentes con la
> transacción sin necesitar una cola externa."
