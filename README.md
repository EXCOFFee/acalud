[![CI](https://github.com/EXCOFFee/acalud/actions/workflows/ci.yml/badge.svg)](https://github.com/EXCOFFee/acalud/actions/workflows/ci.yml)

# Acalud

Este repositorio contiene el desarrollo de la tesis final de carrera de **Santiago Tomas Excofier**, **Ignacia Cassandra Sagnella** e **Elizabeth Sanchez Teran**, cuyo objetivo es digitalizar la gestión pedagógica de juegos de mesa educativos para docentes e instituciones, midiendo su uso real en el aula.

Plataforma **web y mobile de juegos educativos** de una editorial que vende a docentes e instituciones y **mide el uso pedagógico real** de los juegos en el aula.

### Entornos y accesos
- **Web (Producción):** [https://acalud-web.vercel.app](https://acalud-web.vercel.app)
- **Android (APK):** Las versiones compiladas (`app-release.apk`) se publican en los [Releases de este repositorio](https://github.com/EXCOFFee/acalud/releases). El binario generado localmente queda en `apps/web/android/app/build/outputs/apk/release/`.
- **API (Producción):** Alojada en Render (`https://acalud-api.onrender.com`).

> **La fuente de verdad de este proyecto es [`docs/`](docs/).** Ante cualquier conflicto entre el código y la documentación, gana la documentación. Empezá por [`docs/README.md`](docs/README.md) (tablero de control) y el plan de etapas [`docs/05-implementacion/5.2-plan-etapas.md`](docs/05-implementacion/5.2-plan-etapas.md).

## Estado del proyecto

**MVP Funcional (En Producción).** El scaffolding inicial concluyó y la plataforma cuenta con módulos estables:
- Autenticación JWT y control de accesos (Admin, Institución, Docente).
- Catálogo e-commerce (carrito, checkout, integración de pagos).
- Panel de encuestas y medición pedagógica.
- Dashboard institucional para seguimiento.
- Generación funcional de APK Android mediante Capacitor.

## Arquitectura (resumen)

Monolito modular **hexagonal** (Ports & Adapters, [ADR-002](docs/02-arquitectura/2.2-adrs/ADR-002-estilo-arquitectonico.md)) con una **única base de UI** ([ADR-001](docs/02-arquitectura/2.2-adrs/ADR-001-stack-ui.md)) que produce web y APK, sobre **PostgreSQL/Supabase** ([ADR-003](docs/02-arquitectura/2.2-adrs/ADR-003-base-de-datos.md)), hospedado en free tiers ([ADR-005](docs/02-arquitectura/2.2-adrs/ADR-005-hosting-topologia.md)).

```text
acalud/
├─ CLAUDE.md                 # instrucciones permanentes del agente
├─ docs/                     # documentación — FUENTE DE VERDAD
├─ apps/
│  ├─ web/                   # Next.js (static export) + Capacitor (APK)
│  └─ api/                   # NestJS — hexagonal, 1 módulo por bounded context
├─ packages/
│  └─ contracts/             # openapi.yaml (fuente en docs) + tipos generados
├─ infra/                    # migraciones SQL, seed, scripts
└─ .github/workflows/ci.yml  # 8 gates de calidad
```

## Stack

| Capa | Tecnología |
|---|---|
| Web / Mobile | Next.js (React + TypeScript), static export + Capacitor |
| Backend | NestJS + TypeScript, arquitectura hexagonal |
| Base de datos | PostgreSQL (Supabase) + Prisma (query builder) |
| Migraciones | SQL versionado a mano en `infra/migrations/` |
| Gestor de paquetes | pnpm (workspaces) |
| Testing | Vitest + Testcontainers + Playwright + k6 |

## Requisitos del entorno

- **Node.js**: `>=22` (ver [`.nvmrc`](.nvmrc))
- **pnpm**: `10` (`corepack enable`)
- **Android SDK + Java 17**: Necesarios para compilar la APK. Configurar `JAVA_HOME` apuntando a JDK 17 y `ANDROID_HOME` al SDK. Capacitor sobrescribe la versión de Java a 21 en cada sync; el paso de compilación requiere verificar que `apps/web/android/app/capacitor.build.gradle` mantenga `VERSION_17`.
- **Postman**: La colección de API se puede generar automáticamente desde el workspace de Postman importando `packages/contracts/openapi.yaml`.

## Puesta en marcha (desarrollo)

```bash
pnpm install            # instalar dependencias del workspace
cp .env.example .env    # completar variables (ver comentarios del archivo)
```

Variables mínimas para levantar en local:

```bash
# Base de datos
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase Storage
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# Autenticación
SESSION_SECRET=un-secreto-largo-y-aleatorio
SESSION_COOKIE_NAME=acalud_sesion

# Frontend apuntando al backend local
NEXT_PUBLIC_API_BASE=http://localhost:3000

# Email (ver opciones en .env.example)
EMAIL_PROVIDER=gmail-api
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
```

```bash
pnpm --filter @acalud/api start:dev    # API en http://localhost:3000
pnpm --filter @acalud/web dev          # Web en http://localhost:3001
```

Endpoints de salud del backend: `GET /health` (liveness) y `GET /ready` (readiness — toca la BD).

### Compilación Android (Release)

```bash
# 1. Build de estáticos apuntando a producción
NEXT_PUBLIC_API_BASE=https://acalud-api.onrender.com pnpm --filter @acalud/web build

# 2. Sincronización Capacitor
pnpm --filter @acalud/web exec cap sync android
# IMPORTANTE: cap sync sobreescribe la versión de Java a 21.
# Verificar manualmente que apps/web/android/app/capacitor.build.gradle
# tenga VERSION_17 antes de compilar.

# 3. Ensamblado del APK
cd apps/web/android
./gradlew assembleRelease
# Salida: app/build/outputs/apk/release/app-release.apk
```

## Calidad (los 8 gates de CI)

```bash
pnpm lint               # ESLint + regla de fronteras hexagonales
pnpm deps:boundaries    # dependency-cruiser: domain no importa infrastructure
pnpm typecheck          # tsc --noEmit (strict)
pnpm contract:lint      # lint del contrato OpenAPI
pnpm test               # unit + integración
pnpm test:unit          # solo tests unitarios
pnpm test:integration   # solo tests de integración (requiere Docker para Testcontainers)
pnpm test:e2e           # Playwright end-to-end
pnpm build              # build de web y api
```

La regla de dependencias hexagonal es **inviolable**: si un import ilegal (`domain → infrastructure`, o cruce entre módulos) rompe el build, está mal el código, no el linter ([ADR-002](docs/02-arquitectura/2.2-adrs/ADR-002-estilo-arquitectonico.md)).

## Contribuciones

El repositorio es público con fines académicos y de transparencia. Se aceptan issues con sugerencias o correcciones. Para contribuir con código, abrir un PR con una descripción clara del cambio; los mismos gates de CI aplican a los PRs.

## Licencia

Todos los derechos reservados. Pendiente de definición formal por el equipo.
