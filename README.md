# Acalud

Plataforma **web y mobile de juegos educativos** de una editorial que vende a docentes e
instituciones y **mide el uso pedagógico real** de los juegos en el aula. Proyecto de tesis
final de carrera.

> **La fuente de verdad de este proyecto es [`docs/`](docs/).** Ante cualquier conflicto
> entre el código y la documentación, gana la documentación. Empezá por
> [`docs/README.md`](docs/README.md) (tablero de control) y el plan de etapas
> [`docs/05-implementacion/5.2-plan-etapas.md`](docs/05-implementacion/5.2-plan-etapas.md).

## Estado del proyecto

🔄 **Etapa 0 — Fundación (en curso).** Scaffolding del monorepo, CLAUDE.md y CI. El resto de
las etapas (esqueleto E2E, valor por módulo, integraciones reales, hardening) está descripto
en el plan 5.2 y **todavía no implementado**. Este README se irá completando a medida que cada
funcionalidad exista de verdad — no se marca como hecho lo que no está.

## Arquitectura (resumen)

Monolito modular **hexagonal** (Ports & Adapters, [ADR-002](docs/02-arquitectura/2.2-adrs/ADR-002-estilo-arquitectonico.md))
con una **única base de UI** ([ADR-001](docs/02-arquitectura/2.2-adrs/ADR-001-stack-ui.md))
que produce web y APK, sobre **PostgreSQL/Supabase** ([ADR-003](docs/02-arquitectura/2.2-adrs/ADR-003-base-de-datos.md)),
hospedado en free tiers ([ADR-005](docs/02-arquitectura/2.2-adrs/ADR-005-hosting-topologia.md)).

```
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

## Requisitos

- Node.js `>=22` (ver [`.nvmrc`](.nvmrc))
- pnpm `10` (`corepack enable`)

## Puesta en marcha (desarrollo)

```bash
pnpm install            # instalar dependencias del workspace
cp .env.example .env    # completar variables (ver comentarios del archivo)

pnpm --filter @acalud/api start:dev    # API en http://localhost:3000
pnpm --filter @acalud/web dev          # Web en http://localhost:3001
```

Endpoints de salud del backend: `GET /health` (liveness) y `GET /ready` (readiness — toca la BD).

## Calidad (los 8 gates de CI)

```bash
pnpm lint               # ESLint + regla de fronteras hexagonales
pnpm deps:boundaries    # dependency-cruiser: domain no importa infrastructure
pnpm typecheck          # tsc --noEmit (strict)
pnpm contract:lint      # lint del contrato OpenAPI
pnpm test               # unit + integración
pnpm build              # build de web y api
```

La regla de dependencias hexagonal es **inviolable**: si un import ilegal
(`domain → infrastructure`, o cruce entre módulos) rompe el build, está mal el código, no el
linter ([ADR-002](docs/02-arquitectura/2.2-adrs/ADR-002-estilo-arquitectonico.md)).

## Licencia

Pendiente de definir por el equipo.
