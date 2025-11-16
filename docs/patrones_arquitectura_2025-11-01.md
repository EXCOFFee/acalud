# Informe de Patrones de Arquitectura y Diseño – Proyecto AcaLud (01/11/2025)

## 1. Visión General de la Arquitectura
AcaLud adopta una arquitectura multi-módulo que diferencia claramente frontend, backend y scripts operativos. El proyecto sigue principios de modularidad, separación de responsabilidades y aplicación de patrones de diseño tanto en NestJS (backend) como en React (frontend). A continuación se resumen los patrones claves para informar a equipos de desarrollo, QA y operación.

---

## 2. Backend (NestJS)
### 2.1 Arquitectura en Capas + Modularización
- **Módulos de Dominio** (`src/modules/*`): cada dominio (auth, classrooms, activities, store, moderation, etc.) expone su propio módulo NestJS con controller, service, entidades y DTOs.
- **Capas Lógicas**:
  - **Controller** → recibe peticiones HTTP, gestiona rutas y delega la lógica.
  - **Service** → contiene reglas de negocio y orquesta repositorios/servicios externos.
  - **Repository/Entity** → persistencia con TypeORM (entidades mapear tables; repos extienden `Repository<T>`).
- **Cross-cutting**: módulos comunes (`src/common`) proveen excepciones personalizadas, interceptores y guardas reutilizables.

### 2.2 Patrones de Diseño Aplicados
| Patrón | Ubicación | Propósito |
| --- | --- | --- |
| **Dependency Injection** | Todos los módulos Nest (`@Injectable`, `@InjectRepository`) | Permite sustituir repositorios/servicios en tests y promueve inversión de dependencias (SOLID - DIP). |
| **DTO (Data Transfer Object)** | `src/modules/**/dto/*.ts` | Asegura límites claros entre dominio y transporte, aplicando validaciones (`class-validator`). |
| **Repository Pattern** | TypeORM repositories (`@InjectRepository`) | Abstrae acceso a la base de datos, habilita mocks en pruebas. |
| **Service Layer** | `*.service.ts` | Concentración de reglas de negocio respetando SRP. |
| **Guard Pattern** | `auth/guards`, `classrooms/guards` | Control de acceso basado en roles tokens (RF010, RNF010). |
| **Strategy Pattern** | `auth/strategies` (JWT, Local) | Passport strategies permiten múltiples mecanismos de autenticación. |
| **Factory/Builder Pattern (lightweight)** | Utilización de `create()` en repositorios y constructor de entidades para normalizar datos previos a persistencia. |
| **Observer-like Hooks** | Entidades con `@BeforeInsert/@BeforeUpdate` (p.ej. `Classroom`, `User`) | Validan y normalizan datos previa persistencia. |
| **Decorator Pattern** | Uso de decorators Nest (`@Controller`, `@Get`, `@UseGuards`), class-validator, Swagger | Encapsulan metadatos para rutas, validaciones y documentación. |
| **Command Pattern (implícito)** | Servicios que encapsulan acciones (e.g., `ActivitiesService.completeActivity`) | Acciones con efecto en gamificación; facilitan auditoría y extensión. |

### 2.3 Principios SOLID y Buenas Prácticas
- **SRP**: servicios enfocados (AuthService gestiona autenticación, ClassroomsService gestiona aulas, etc.).
- **OCP**: estructura modular facilita extender funcionalidades sin modificar código existente (nuevos DTO/Strategies/Guards).
- **LSP**: dependencias se inyectan vía interfaces/contracts (`OperationResult`, tokens Nest).
- **ISP**: DTOs específicos evitan interfaces monolíticas; controllers exponen endpoints segmentados.
- **DIP**: servicios dependen de abstracciones inyectadas (repositorios TypeORM, servicios auxiliares) permitiendo mocks en tests.

### 2.4 Otros Elementos Arquitectónicos
- **Configuración**: centralizada en `config/` y `.env`, con soporte para diferentes ambientes.
- **Monitoreo**: módulo de monitoring (health checks, logging estructurado) siguiendo patrón de Cross-Cutting Concerns.
- **Testing**: estructura AAA (Arrange-Act-Assert) en suites Jest; uso de builders/mocks para aislar dependencias.
- **CI/CD Ready**: scripts y configuraciones (docker-compose, scripts de instalación) siguen patrón Infrastructure-as-Code ligero.

---

## 3. Frontend (React + Vite)
### 3.1 Arquitectura de Presentación
- **Component-Based Architecture**: componentes reutilizables en `src/components`, organizados por dominio (Auth, Activities, Gamification, Moderation).
- **Routing Architecture**: React Router v6 con rutas anidadas, lazy loading y error boundaries.
- **State Management**: contextos (`contexts/`) y hooks (`hooks/`) controlan autenticación, aulas, gamificación.
- **Service Layer**: `src/services/*.ts` encapsulan llamadas HTTP, siguiendo patrón Repository/Facade en frontend.

### 3.2 Patrones Relevantes
| Patrón | Ubicación | Propósito |
| --- | --- | --- |
| **Container-Presentational** | `RouterComponents`, `NavigationWrappers` | Contenedores conectan servicios y pasan props a componentes presentacionales. |
| **Custom Hooks** | `hooks/useAuth`, `useClassrooms`, etc. | Encapsulan lógica reutilizable y side effects (Separation of Concerns). |
| **Context Provider Pattern** | `contexts/AuthContext`, etc. | Inyección global de estado (equivalente DI frontend). |
| **Lazy Loading + Code Splitting** | `React.lazy` en `router/index.tsx` | Mejora performance cargando componentes bajo demanda (RNF003). |
| **Guard Pattern (frontend)** | `AuthGuard`, `RoleGuard` | Protegen rutas y generan UX consistente con backend. |
| **Error Boundary** | `components/ErrorBoundary.tsx` | Manejo de fallos UI siguiendo patrón Retry/Fallback. |
| **Service Object Pattern** | `services/store.service.ts`, etc. | Capa de acceso a API centralizada (fácil de mockear en tests). |
| **State Reducer (parcial)** | Componentes complejos (Store.tsx) usan reducers implícitos via `useState` + objetos; se recomienda evaluar `useReducer` para mayor claridad. |

### 3.3 Principios de Diseño
- **KISS/DRY**: abstracción de UI repetitiva en layouts, wrappers y servicios.
- **Atomic Design (tendencia)**: desde componentes base hasta secciones completas.
- **Responsiveness**: Tailwind CSS proporciona utilidades para breakpoints, facilitando RNF002/RNF016.

---

## 4. Scripts y DevOps
- **Infrastructure as Code (lightweight)**: scripts `install-improvements.*` automatizan setup; `docker-compose.yml` orquesta servicios.
- **Template Method**: scripts establecen secuencia fija (verificar pre-requisitos → instalar → configurar → validar), permitiendo personalización.
- **Convention over Configuration**: estructura consistente para dev-start, testing, monitoreo.

---

## 5. Integración y Cross-Cutting
- **API Contracts**: Documentados via Swagger (`/api/docs`), siguiendo patrón de contrato abierto.
- **Logging & Monitoring**: Logger estructurado en backend y frontend (logger.ts) con enfoque centralizado.
- **Security Layers**: Guards + Passport strategies + validaciones DTO; complementado con interceptores de error.
- **Testing Strategy**: combinación de unit tests (Jest backend/frontend) y e2e documentados (`test/communications/*`).

---

## 6. Recomendaciones para Equipos
1. **Mantener modularidad**: nuevos módulos deben seguir patrón controller/service/dto/entity para consistencia.
2. **Extender tests aprovechando DI**: utilizar mocks de repositorios gracias al patrón Repository/DIP.
3. **Alinear frontend/backend**: conservar service layers y guardas sincronizadas para evitar duplicidad de lógica.
4. **Documentar variaciones arquitectónicas**: si se incorporan microservicios o nuevas estrategias, agregar al repositorio de docs para evitar desalineaciones.

---

## 7. Referencias Clave
- `backend/src/modules/**` – estructura modular NestJS.
- `backend/src/common/**` – patrones cross-cutting (excepciones, interceptores, pipes).
- `frontend/src/router/index.tsx` – ejemplo de guards, lazy loading, layouts.
- `frontend/src/services/` – implementación de Service Object Pattern en cliente.
- `docs/RESUMEN_FINAL_IMPLEMENTACION.md`, `docs/MEJORAS_IMPLEMENTADAS.md` – resumen de arquitectura y mejoras. 

Este informe puede compartirse con equipos técnicos, QA y stakeholders para comprender la base arquitectónica de AcaLud y facilitar nuevas colaboraciones o auditorías.
