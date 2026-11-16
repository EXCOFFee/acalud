# 4. Glosario

## En criollo

Cada término trae una definición corta y, cuando ayuda, dónde aparece en Acalud. Están
agrupados por tema, y dentro de cada tema van de lo más básico a lo más avanzado.

---

## Lo básico de una aplicación web

| Término | Qué es | En Acalud |
|---|---|---|
| **Frontend** | La parte que ve y toca el usuario (pantallas, botones). Corre en el navegador. | `apps/web` |
| **Backend** | El servidor: recibe pedidos, aplica reglas y guarda datos. El usuario no lo ve. | `apps/api` |
| **API** | El "menú" de cosas que el backend sabe hacer y cómo pedírselas. | `/api/v1/...` |
| **Endpoint** | Una "ventanilla" concreta de la API: un método + una ruta. | `POST /api/v1/checkout` |
| **HTTP / métodos** | El idioma de la web. `GET` lee, `POST` crea, `PUT` reemplaza, `PATCH` modifica algo, `DELETE` borra. | — |
| **Código de estado** | El número con el que responde el servidor: 200 OK, 201 creado, 401 no autenticado, 403 sin permiso, 404 no existe, 409 conflicto, 422 datos inválidos, 503 servicio caído. | — |
| **JSON** | El formato de texto con el que viajan los datos (`{"email": "..."}`). | — |
| **snake_case / camelCase** | Dos formas de escribir nombres: `monto_total` / `montoTotal`. | La API responde en snake_case (salvo `docentes.controller`). |

## Herramientas y estructura

| Término | Qué es | En Acalud |
|---|---|---|
| **Monorepo** | Un solo repositorio que contiene varias aplicaciones. | `apps/web` + `apps/api` + `packages/` |
| **pnpm** | Instalador de paquetes (librerías) de JavaScript. Más rápido y ahorrativo que npm. | Siempre `pnpm`, nunca `npm`. |
| **TypeScript** | JavaScript con **tipos**: le decís al código "esto es un número" y te avisa si te equivocás antes de correrlo. | Todo el proyecto. |
| **Next.js** | Framework para hacer webs con React. | Frontend. |
| **React** | Librería para armar interfaces con "componentes" reutilizables. | `components/ui/` |
| **Export estático** | Compilar la web a archivos fijos (HTML/JS/CSS) que no necesitan un servidor propio. | `output: 'export'` |
| **Capacitor** | Herramienta que mete una web adentro de una app nativa (Android/iOS). | Carpeta `apps/web/android` |
| **APK** | El archivo instalable de una app Android. | Se compila local con Gradle y Java 17. |
| **NestJS** | Framework de Node.js para hacer backends ordenados en módulos. | Backend. |
| **Decorador** | Una etiqueta con `@` que le agrega comportamiento a una clase o función. | `@Post('checkout')`, `@UseGuards(AuthGuard)` |
| **Zod** | Librería para validar datos: "esto tiene que ser un email, esto un número entre 1 y 5". | `esquemas.ts` de cada módulo |

## Arquitectura

| Término | Qué es | En Acalud |
|---|---|---|
| **Monolito** | Toda la aplicación backend en un solo programa y un solo deploy. | Un solo servicio en Render. |
| **Monolito modular** | Monolito dividido internamente en módulos con fronteras claras. | `modules/identidad`, `compras`, etc. |
| **Microservicios** | Lo opuesto: cada parte es un programa separado que se comunica por red. | No se usa. |
| **Bounded context** (contexto acotado) | Una parte del negocio con su propio vocabulario y reglas. | Cada módulo. |
| **Arquitectura hexagonal** (puertos y adaptadores) | Organizar el código para que la lógica de negocio no dependa de detalles técnicos (base, proveedores). | ADR-002 |
| **Dominio** | Las reglas del negocio puras, sin nada técnico. | `domain/` |
| **Caso de uso** (capa de aplicación) | Una acción completa del sistema que orquesta el dominio y los puertos. | `application/iniciar-checkout.ts` |
| **Infraestructura** | El código que toca el mundo real: SQL, HTTP, APIs externas. | `infrastructure/` |
| **Puerto** | Una interfaz: "necesito algo que sepa cobrar". Dice *qué*, no *cómo*. | `PaymentProvider`, `ShippingProvider` |
| **Adapter** (adaptador) | La implementación concreta de un puerto. | `MercadoPagoAdapter`, `MercadoPagoFakeAdapter` |
| **Fake** | Un adapter falso, que se comporta como el real pero sin conectarse a nada. Sirve para desarrollar y testear. | Envíos, comprobantes |
| **Repositorio** | La clase que lee y escribe una "cosa" en la base, escondiendo el SQL. | `*.repository.pg.ts` |
| **Controller** | La clase que recibe la petición HTTP, la valida y llama al caso de uso. | `*.controller.ts` |
| **Guard** | Un "portero" que decide si la petición puede pasar. | `AuthGuard`, `AdminGuard` |
| **Inyección de dependencias** (DI) | En vez de que una clase cree sus herramientas, se las pasan desde afuera. Así se pueden cambiar por fakes. | Constructores de los casos de uso |
| **dependency-cruiser** | Herramienta que revisa los `import` y rompe el build si se cruzan capas o módulos prohibidos. | `apps/api/.dependency-cruiser.cjs` |
| **ADR** | *Architecture Decision Record*: documento corto que registra una decisión, el contexto y lo descartado. | ADR-001 a 006 |

## Base de datos

| Término | Qué es | En Acalud |
|---|---|---|
| **PostgreSQL** | Base de datos relacional: tablas con filas y columnas relacionadas entre sí. | Supabase |
| **Supabase** | Servicio que te da un PostgreSQL gestionado + almacenamiento de archivos. | Región São Paulo |
| **SQL** | El lenguaje para consultar y modificar la base. | Escrito a mano con la librería `pg`. |
| **ORM** | Librería que traduce objetos del código a tablas automáticamente. | **No se usa**. |
| **Migración** | Un archivo SQL numerado que cambia la estructura de la base. Se aplican en orden y nunca se editan las ya aplicadas. | `infra/migrations/0001` a `0019` |
| **Constraint** (restricción) | Una regla que la base hace cumplir sí o sí. | `UNIQUE`, `CHECK`, `NOT NULL` |
| **UNIQUE** | Restricción: no puede haber dos filas con el mismo valor. | `payment_id`, email |
| **Índice parcial** | Un índice que aplica solo a algunas filas. | "un pedido `pending` por carrito" |
| **Trigger** | Código que la base ejecuta sola ante un evento (ej. antes de un `DELETE`). | Impide modificar o borrar la auditoría y el kardex. |
| **Append-only** | "Solo agregar": se puede insertar pero nunca modificar ni borrar. | Auditoría, movimientos de stock |
| **Kardex** | Registro histórico de cada entrada y salida de stock. | `stock_movements` |
| **Transacción** | Un grupo de operaciones que se aplican **todas o ninguna**. | `uow.transaccion(...)` |
| **Commit / Rollback** | Confirmar la transacción / deshacerla entera. | — |
| **ACID** | Las 4 garantías de una transacción: Atomicidad (todo o nada), Consistencia (respeta las reglas), Aislamiento (no se pisan entre sí), Durabilidad (lo confirmado no se pierde). | — |
| **Unit of Work** | Patrón que agrupa todo lo de un caso de uso en una transacción. | `unidad-de-trabajo.pg.ts` |
| **Condición de carrera** (race condition) | Error que aparece cuando dos cosas pasan "al mismo tiempo" y se pisan. | Dos compras de la última unidad |
| **Guard de estado** | `UPDATE ... WHERE status = 'pending'`: solo cambia si sigue en el estado esperado. | Pedidos, encuestas |
| **Máquina de estados** | Lista cerrada de estados posibles y de qué transiciones valen. | `pending → paid → shipped → delivered` |
| **Snapshot** | Una "foto" de un dato en un momento, que no cambia después. | Precio en `order_items` |
| **RLS** | *Row Level Security*: reglas en la propia base sobre quién ve qué fila. | Deny-all de respaldo (migración `0003`) |
| **Connection pooler** | Intermediario que reparte pocas conexiones a la base entre muchas peticiones. | Session Pooler de Supabase |

## Seguridad

| Término | Qué es | En Acalud |
|---|---|---|
| **Autenticación** | Saber **quién sos** (login). | `AuthGuard` |
| **Autorización** | Saber **qué podés hacer**. | `AdminGuard`, chequeo de dueño |
| **Autorización por propiedad** | Solo podés tocar lo que es tuyo. Si pedís algo ajeno, responde **404** (no 403), para no revelar que existe. | En todo el proyecto |
| **Hash** | "Huella" de un dato: de la huella no se puede volver al original. | Contraseñas, tokens |
| **argon2id** | Algoritmo de hash **lento a propósito**, pensado para contraseñas (hace caro probar millones). | `Argon2Hasher` |
| **SHA-256** | Hash rápido. Sirve para tokens aleatorios largos, que no se pueden adivinar. | Hash del token de sesión |
| **Token opaco** | Un valor aleatorio sin información adentro; solo sirve para buscar la sesión en la base. | 32 bytes, base64url |
| **JWT** | Token que lleva datos firmados adentro. No necesita base, pero es difícil de revocar. | **No se usa** |
| **Cookie httpOnly** | Cookie que JavaScript no puede leer: protege contra robo por XSS. | Sesión web |
| **Bearer token** | Mandar el token en el header `Authorization: Bearer ...`. | Sesión en la APK |
| **Sesión deslizante** | El vencimiento se corre hacia adelante cada vez que usás la sesión. | 7 días desde el último uso |
| **Fuerza bruta** | Probar contraseñas una tras otra hasta acertar. | Bloqueo: 3 intentos en 15 min |
| **Enumeración de usuarios** | Descubrir qué emails están registrados mirando diferencias en las respuestas. | Mensajes genéricos + tiempo constante |
| **XSS** | Inyectar un script malicioso en una página. | Prohibido `dangerouslySetInnerHTML` |
| **CORS** | Reglas del navegador sobre qué sitio puede llamar a qué API. | Evitado con el rewrite de Vercel |
| **Webhook** | Un sistema externo te llama a vos cuando pasa algo. | Mercado Pago avisa los pagos |
| **HMAC** | Firma hecha con un secreto compartido, para probar que un mensaje viene de quien dice. | Firma del webhook de Mercado Pago |
| **Idempotencia** | Hacer lo mismo 2 veces tiene el mismo efecto que hacerlo 1 vez. | Webhook por `payment_id` UNIQUE |
| **Reconciliación** | No creerle al aviso: consultar directamente la fuente oficial. | `consultarPago` a Mercado Pago |
| **Secreto** | Contraseña o clave de un sistema. Solo va en variables de entorno, nunca en el repo. | `.env` (ignorado por git) |
| **gitleaks** | Herramienta que escanea el repo buscando secretos filtrados. | CI |
| **Defensa en profundidad** | Varias capas de protección: si falla una, queda otra. | Trigger + (pendiente) rol con permisos mínimos |

## Integraciones y operación

| Término | Qué es | En Acalud |
|---|---|---|
| **Mercado Pago Checkout Pro** | La página de pago de Mercado Pago a la que se redirige al usuario. | `init_point` |
| **Preferencia de pago** | El "pedido de cobro" que se crea en Mercado Pago antes de redirigir. | `crearPreferencia` |
| **Outbox** | Tabla "bandeja de salida": los mensajes se guardan en la misma transacción y se mandan después. | `outbox_emails` |
| **Worker** | Proceso que trabaja en segundo plano, repetidamente. | `outbox-worker.ts` |
| **Polling** | Preguntar cada tantos segundos "¿ya está?". | `/checkout/resultado` |
| **Problem Details (RFC 9457)** | Formato estándar de errores en JSON (`title`, `detail`, `status`). | `problem-details.filter.ts` |
| **Rewrite** | Regla que reenvía una URL a otro destino sin que el navegador se entere. | `vercel.json` |
| **Cold start** | La demora del primer pedido cuando el servidor estaba "dormido". | Render free: 30-60 s |
| **Variables de entorno** | Configuración que se pasa al programa desde afuera (no está en el código). | `DATABASE_URL`, `MP_WEBHOOK_SECRET` |

## Testing y calidad

| Término | Qué es | En Acalud |
|---|---|---|
| **Test unitario** | Prueba una pieza chica, aislada, con fakes. Es rápido. | `test/unit/` |
| **Test de integración** | Prueba varias piezas juntas, con una base real. | `test/integration/` |
| **Testcontainers** | Levanta un PostgreSQL real en Docker para cada corrida de tests. | `vitest.integration.config.ts` |
| **Vitest** | El framework de tests. | — |
| **Mock** | Un objeto falso programado para un test. Regla del proyecto: no mockear el dominio ni la base en tests de idempotencia. | — |
| **CI** | *Integración continua*: en cada push, GitHub Actions corre lint, typecheck, tests, scanner de secretos y de vulnerabilidades, y el build. | `.github/workflows/ci.yml` |
| **Gate** | "Portón": no se avanza si no pasa todo (tests + lint + typecheck). | Regla de trabajo |
| **Lint** | Revisión automática de estilo y errores comunes. | ESLint |
| **Typecheck** | Verificación de que los tipos de TypeScript cierren. | `pnpm typecheck` |
| **OpenAPI** | Documento estándar que describe todos los endpoints de una API. | Atrasado (pendiente de Fase 2) |

## Del proceso de la tesis

| Término | Qué es |
|---|---|
| **CU** | Caso de uso: la especificación de una funcionalidad. Hay 34 (más los CU-E). Son la **fuente de verdad**. |
| **RN / RNF** | Regla de negocio / Requisito no funcional (rendimiento, seguridad, etc.) dentro de un CU. |
| **A1, A2…** | Flujos alternativos de un CU (qué pasa si algo sale distinto). |
| **B2B / B2C** | Venta a empresas (escuelas) / venta a personas (docentes). |
| **ABM** | Alta, Baja y Modificación (el CRUD en criollo). |

## Cómo explicarlo en una entrevista

> Si te preguntan una palabra y no estás seguro, una respuesta honesta y buena es: "No lo
> tengo fresco para definirlo exacto, pero en mi proyecto lo usé para X". Siempre sumá un
> ejemplo de Acalud: muestra que lo aplicaste, no que lo memorizaste.
