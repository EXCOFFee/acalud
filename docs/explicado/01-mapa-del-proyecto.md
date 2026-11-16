# 1. Mapa del proyecto

## En criollo

Pensá el proyecto como un **restaurante**:

- El **salón** es el frontend (`apps/web`): lo que ve el cliente. Tiene mesas, carta y mozos,
  pero no cocina nada.
- La **cocina** es el backend (`apps/api`): recibe pedidos, controla que sean válidos, cocina
  y anota todo.
- La **despensa** es la base de datos (PostgreSQL en Supabase): donde queda guardado todo,
  aunque se apaguen las luces.
- Los **proveedores** son los servicios externos: Mercado Pago (cobra), el correo (manda
  emails), el servicio de envíos.

El salón **nunca entra a la despensa**: siempre le pide a la cocina. Esa regla es la que
protege los datos.

## La estructura de carpetas

Todo vive en un solo repositorio con varias "apps" adentro. Eso se llama **monorepo**, y se
administra con **pnpm** (el instalador de paquetes; en este proyecto nunca se usa npm).

```
AcaludFinalv2/
├─ apps/
│  ├─ web/          ← el salón: la página web + la app Android
│  └─ api/          ← la cocina: el servidor
├─ packages/
│  └─ contracts/    ← chequea que el documento de la API (OpenAPI) esté bien escrito
├─ infra/
│  ├─ migrations/   ← los 19 archivos SQL que construyen la base, en orden
│  └─ seed/         ← (casi vacío) idea de datos ficticios de demo
├─ docs/            ← la documentación de la tesis (casos de uso = fuente de verdad)
├─ .github/workflows/ci.yml   ← el "control de calidad automático" en cada push
└─ render.yaml      ← cómo se despliega el servidor en Render
```

## `apps/web`: el frontend

**Qué es:** una aplicación **Next.js** (un framework para hacer páginas con React).

**Particularidad clave:** se compila como **sitio estático** (`output: 'export'`). Es decir, al
compilar salen archivos HTML/JS/CSS fijos, sin servidor propio. Los datos se piden después,
desde el navegador, a la API. Gracias a eso, **los mismos archivos** sirven para:

- La web, publicada en **Vercel**.
- La app Android (APK), empaquetada con **Capacitor** (carpeta `android/`).

| Carpeta | Qué hay |
|---|---|
| `app/` | Una carpeta por pantalla: `login/`, `catalogo/`, `carrito/`, `checkout/`, `cuenta/`, `institucion/`, `mis-juegos/`, `encuestas/`, `admin/`, etc. La ruta de la carpeta es la URL. |
| `components/ui/` | La "librería de piezas" propia: `Boton`, `Tabla`, `Dialogo` (modal), `Tabs`, `Toast`, `Paginacion`, estados de carga, vacío y error. No se usa ninguna librería de componentes de terceros. |
| `components/` | Piezas que ya conocen la lógica de la app: la barra de navegación (`site-nav`), el botón de favorito, el modal de exportar. |
| `lib/api.ts` | **El único lugar que habla con el servidor.** Cada función (`login`, `verCarrito`, `iniciarCheckout`…) termina llamando a `pedir()`, que arma la petición HTTP. |
| `app/globals.css` | El sistema de diseño: colores (modo claro y oscuro), tipografías, espaciados. CSS plano, sin Tailwind. |
| `vercel.json` | Una regla de "reenvío": todo lo que vaya a `/api/...` en Vercel se manda al servidor de Render. |

## `apps/api`: el backend

**Qué es:** un servidor **NestJS** (un framework de Node.js para hacer APIs ordenadas). Corre en
**Render**.

Adentro de `src/` hay tres zonas:

| Carpeta | Qué hay | Analogía |
|---|---|---|
| `modules/` | La lógica del negocio, dividida por tema. | Las estaciones de la cocina: parrilla, pastas, postres. |
| `platform/` | Lo que comparten todos los módulos: autenticación, conexión a la base, envío de emails, manejo de errores, almacenamiento de archivos. | Las instalaciones del edificio: luz, gas, agua. |
| `shared/` | Utilidades chicas comunes. | El cajón de los cubiertos. |

### Los módulos (los "temas" del negocio)

Cada módulo es un **contexto acotado**: una parte del negocio con sus propias reglas y su
propio vocabulario.

| Módulo | De qué se ocupa | Casos de uso principales |
|---|---|---|
| `identidad` | Cuentas: registro, login, logout, perfil, verificar email, recuperar contraseña, cambiar correo. | CU-01 a 04, CU-34, CU-E01/E02 |
| `catalogo` | Los juegos y recursos: listado, ficha, demos, descargas, editoriales, favoritos y todo el ABM del admin. | CU-06 a 09, 17, 18, 19, 22 |
| `compras` | Carrito, cálculo de envío, checkout, pago con Mercado Pago, historial y seguimiento de pedidos. | CU-05, 10 a 13, 24 |
| `institucional` | Escuelas: registrarlas, inventario de licencias, asignar y revocar, sesiones de juego, reportes, dashboard, exportar a Excel/PDF. | CU-23, 25 a 33 |
| `comunidad` | Encuestas, propuestas de docentes, catálogo de niveles y materias. | CU-14 a 16, 20, 21 |
| `comprobantes` | Facturación (ARCA). Hoy es casi solo el esqueleto. | — |

### Adentro de cada módulo: las tres capas

Este es el corazón de la **arquitectura hexagonal**. Cada módulo se divide así:

```
modules/compras/
├─ domain/          ← las REGLAS del negocio, puras. Ej.: cómo se calcula un descuento.
│  └─ ports/        ← "enchufes": interfaces que dicen QUÉ necesito, no CÓMO se hace.
├─ application/     ← los CASOS DE USO: un archivo por acción (iniciar-checkout.ts, procesar-pago.ts).
└─ infrastructure/  ← el mundo real: SQL, HTTP, Mercado Pago.
   ├─ http/         ← los controllers: reciben la petición web y la validan.
   ├─ persistencia/ ← los repositorios: el SQL que lee y escribe la base.
   └─ (adapters)    ← los "aparatos" que se enchufan en los ports: MercadoPagoAdapter, etc.
```

**La regla de oro:** `domain` no conoce a nadie; `application` solo conoce a `domain`;
`infrastructure` conoce a todos. Además, **ningún módulo puede importar el interior de otro**.
Esto no queda librado a la buena voluntad: lo verifica una herramienta
(`dependency-cruiser`, config en `apps/api/.dependency-cruiser.cjs`) en cada push.

### `platform/`: lo compartido

| Carpeta | Qué hace |
|---|---|
| `auth/` | Los **guards** (porteros): `AuthGuard` (¿hay sesión válida?), `AdminGuard` (¿es admin?), `OpcionalAuthGuard` (sesión opcional). |
| `db/` | La conexión a PostgreSQL (`pg`), el SSL y el **migrador** que aplica los SQL de `infra/migrations`. |
| `outbox/` | El **worker** que manda los emails pendientes cada tantos segundos, con reintentos. |
| `email/` | El "enchufe" de email y sus adapters (Gmail API, SMTP, Resend, fake). |
| `storage/` | Dónde se guardan archivos (imágenes, PDFs): Supabase Storage. |
| `http/` | El formato de errores estándar (RFC 9457) y la validación con Zod. |
| `security/` | La verificación de la firma de los webhooks de Mercado Pago. |
| `health/` | `/health` y `/ready`: endpoints para saber si el servidor está vivo. |

### `test/`

- `test/unit/`: pruebas rápidas de casos de uso con piezas falsas (fakes).
- `test/integration/`: pruebas contra un **PostgreSQL real** que se levanta en Docker con
  **Testcontainers**. Son las que garantizan que el SQL y las reglas de la base funcionen.

## Dónde corre cada cosa (producción)

```
 Navegador / App Android
        │
        ▼
 Vercel  (acalud-web.vercel.app)  ── sirve la web estática
        │   /api/*  se reenvía ▼
 Render  (acalud-api.onrender.com) ── NestJS, plan gratis (se "duerme" sin uso)
        │
        ▼
 Supabase (PostgreSQL + Storage, región São Paulo)
        │
 Servicios externos: Mercado Pago · Gmail API · (envíos: adapter fake/tabla local)
```

## Qué podría confundirte

- **Hay nombres en español y en inglés mezclados.** Las tablas de la base están en inglés
  (`users`, `orders`), pero muchas rutas y clases siguen en español (`/carrito`,
  `IniciarCheckout`). La "Fase 2" pendiente es justamente pasar todo a inglés.
- **`docs/_archivo-v1/`** es documentación vieja (histórica). Igual los ADR que hay ahí siguen
  vigentes.

## Cómo explicarlo en una entrevista

> "Es un monorepo con pnpm: un frontend Next.js exportado como estático, que reutilizo para la
> web y la APK con Capacitor, y un backend NestJS dividido en módulos por contexto de negocio:
> identidad, catálogo, compras, institucional y comunidad. Cada módulo tiene tres capas
> (dominio, aplicación e infraestructura), y una herramienta en el CI impide que se crucen
> dependencias prohibidas."
