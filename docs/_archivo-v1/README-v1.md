# Acalud — Documentación de Arquitectura

**Tablero de control de artefactos** · Proyecto de tesis final de carrera
**Última actualización:** 2026-07-04 · **Mantenido por:** Arquitecto (Claude) + Equipo Acalud

---

## Cómo usar este documento

Este README es el **índice vivo** de toda la documentación. Cada artefacto tiene un estado:

| Símbolo | Estado | Significado |
|---------|--------|-------------|
| ⬜ | Pendiente | No iniciado |
| 🟡 | Borrador | Producido, esperando ratificación del equipo |
| ✅ | Ratificado | Aprobado por el equipo; cambiarlo requiere nueva versión |

**Protocolo de cambio:** la documentación del equipo está en desarrollo; se espera que estos
artefactos se modifiquen. Para cambiar algo ya producido: (1) identificar el supuesto o
sección afectada, (2) consultar la matriz de trazabilidad (1.3) para ver qué otros artefactos
dependen de ella, (3) actualizar versión y registro de cambios del documento afectado.

---

## Índice MECE de artefactos

Profundidad estimada por bloque: **Bajo / Medio / Alto / Crítico** (a mayor profundidad,
más esfuerzo y más revisión requiere).

### Bloque 0 · Fundacionales — Profundidad: Baja
| # | Artefacto | Estado | Depende de |
|---|-----------|--------|------------|
| 0.1 | Visión y Alcance | 🟡 | — |
| 0.2 | Glosario / Lenguaje ubicuo | 🟡 | 0.1 |

### Bloque 1 · Requisitos — Profundidad: Alta
| # | Artefacto | Estado | Depende de |
|---|-----------|--------|------------|
| 1.1 | Casos de uso detallados (Gherkin/BDD) | 🟡 completo (A..E: 38 CU) | 0.1, 0.2 |
| 1.2 | Requisitos no funcionales cuantificados | 🟡 (31 NFR en 8 categorías) | 0.1 |
| 1.3 | Matriz de trazabilidad bidireccional | 🟡 esqueleto (Componente/Tests pendientes de Bloques 2 y 5) | 1.1, 1.2 |

### Bloque 2 · Arquitectura — Profundidad: Crítica
| # | Artefacto | Estado | Depende de |
|---|-----------|--------|------------|
| 2.1 | Diagramas C4 (contexto, contenedores, componentes) | 🟡 | 1.1 |
| 2.2 | ADRs 001–006 (stack UI, estilo, BD, auth, hosting, integraciones) | 🟡 | 1.1, 1.2 |
| 2.3 | Modelo de dominio (bounded contexts) + modelo de datos | 🟡 | 1.1, 2.2 |
| 2.4 | Contratos OpenAPI | 🟡 (spec validada: 64 operaciones) | 2.3 |

### Bloque 3 · Seguridad — Profundidad: Alta (vitrina: Crítica)
| # | Artefacto | Estado | Depende de |
|---|-----------|--------|------------|
| 3.1 | Threat model STRIDE (vectores expuestos) | 🟡 (9 vectores + Zero Trust L2) | 2.1, 2.4 |
| 3.2 | Vitrina L3: checkout con STRIDE+LINDDUN + interrogación de fallo | 🟡 (DFD + 5 preguntas) | 3.1 |
| 3.3 | Checklist ASVS aplicable + política de datos personales | 🟡 (52 controles) | 3.1 |

### Bloque 4 · Confiabilidad — Profundidad: Media
| # | Artefacto | Estado | Depende de |
|---|-----------|--------|------------|
| 4.1 | SLOs de flujos críticos + análisis de fallo de integraciones | 🟡 (SLO + FMEA 14 modos + runbook) | 2.2, 2.3 |

### Bloque 5 · Plan de Implementación para Claude Code — Profundidad: Crítica
| # | Artefacto | Estado | Depende de |
|---|-----------|--------|------------|
| 5.1 | Setup del repositorio (estructura, CLAUDE.md, convenciones, CI) | 🟡 (8 gates CI + CLAUDE.md) | 2.2 |
| 5.2 | Etapas con compuertas de calidad y modelo recomendado por tarea | 🟡 (5 etapas + ruteo modelos) | Todo lo anterior |
| 5.3 | Estrategia de testing y deploy (web free tier + APK firmada) | 🟡 (pirámide + APK local) | 2.2, 5.1 |

---

## Mapeo al catálogo de artefactos de la metodología

Para la defensa: correspondencia entre estos artefactos y el catálogo estándar de 23
artefactos de documentación de arquitectura.

| Catálogo estándar | Cubierto por |
|---|---|
| 1 Introducción y contexto · 3 Visión general | 0.1 |
| 2 Criterios de aceptación | 1.1 (por caso de uso) |
| 4 Diagrama de casos de uso + actores | 1.1 (actores integrados, no artefacto aparte) |
| 5 Componentes principales (resumen ejecutivo) | 0.1 §6 (audiencia no técnica) |
| 6 Flujo de datos · 11 Diagrama de actividades | 2.1 / 2.3 (flujos críticos) |
| 7 Requisitos Gherkin/BDD · 8 RF con trazabilidad | 1.1 |
| 9 RNF cuantificados | 1.2 |
| 10 Arquitectura C4 | 2.1 |
| 12 Diagrama de clases · 15 SOLID · 16 Repository/UoW | 2.3 y 5.1 (con ejemplos del código real) |
| 13 Interfaces (OpenAPI) | 2.4 |
| 14 Modelo entidad-relación | 2.3 |
| 17 Patrón arquitectónico (≥3 alternativas) | 2.2 (ADR de estilo arquitectónico) |
| 18 Threat modeling | 3.1 + 3.2 |
| 20 Mapeo DDD | 2.3 |
| 21 Resiliencia operativa | 4.1 |
| 22 Matriz de trazabilidad | 1.3 |
| 23 Glosario | 0.2 |

*Nota: el artefacto 19 (vistas TOGAF) se omite con justificación: para un sistema único de
alcance acotado, el C4 responde las preguntas de estructura; TOGAF agrega valor en
portafolios de sistemas empresariales, que no es el caso.*

---

## Decisiones de calibración registradas

- **Criticidad declarada: L2 + vitrina L3.** Rigor de producción estándar en todo el sistema;
  un análisis de profundidad máxima (3.2) sobre el flujo de checkout como demostración de
  método. Ver justificación en 0.1 §4.
- **Ruteo de modelos para implementación:** Sonnet 5 por defecto; Opus 4.8/Fable 5 pre-asignados
  a módulos críticos (pagos, auth, cliente ARCA). Detalle por etapa en 5.2.
