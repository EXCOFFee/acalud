# ADR-003 · Base de datos: PostgreSQL gestionado (Supabase)

| Campo | Valor |
|---|---|
| **Estado** | ✅ Aceptada (2026-07-04) |
| **Decide** | Datastore principal y storage de archivos |
| **Trazabilidad** | R-01, NFR-C3, NFR-R1/R2, NFR-F2, checklist de lote CU-012/024 |

## Contexto

El flujo crítico exige atomicidad multi-línea con rollback total e idempotencia por
constraint (1.1-B). El modelo es fuertemente relacional (docentes, membresías, pedidos,
líneas, movimientos de stock, sesiones — ~15+ relaciones). Escala declarada: 5 000 pedidos,
10 000 sesiones, 5 RPS (NFR-C). Presupuesto $0 sin tarjeta (R-01). El equipo ya opera
Supabase como herramienta conectada.

## Decisión

**PostgreSQL gestionado en Supabase (free tier)** como único datastore transaccional +
**Supabase Storage** para archivos (recursos, comprobantes PDF, adjuntos, imágenes; en la BD
solo metadatos). Acceso **exclusivamente desde el backend** (ADR-002) vía el pooler de
conexiones de Supabase; **RLS no es la capa primaria de autorización** (esa vive en el
backend según 1.1) — se activa como defensa en profundidad con política deny-all salvo el
rol de servicio.

## ANÁLISIS CAP/PACELC — PostgreSQL mononodo gestionado

```
POSICIÓN CAP:        CA en operación normal (nodo único: no hay partición interna que
                     tolerar). Ante partición cliente↔BD el sistema se comporta CP:
                     rechaza operaciones (indisponible) antes que responder inconsistente.
POSICIÓN PACELC:     PC/EC — prioriza consistencia siempre; sin réplicas en free tier,
                     no existe el trade-off de latencia por replicación (EL).
MODELO CONSISTENCIA: Linearizable a nivel transacción sobre el primario único;
                     Read-Your-Writes trivial (una sola fuente).
GARANTÍAS NATIVAS:   ACID completo; aislamiento READ COMMITTED por defecto + guards
                     condicionales por Aggregate (ADR-002).
WAF/RAF/SAF:         B+Tree (InnoDB-like heap + índices): WAF típico 2–4×; workload
                     read-heavy (catálogo/reportes) lo favorece frente a LSM.

JUSTIFICACIÓN OPERACIONAL:
  CU-012/024 exigen exactamente lo que un RDBMS ACID da nativo: transacción multi-línea
  con rollback total, UNIQUE constraints como mecanismo de idempotencia (payment_id,
  docente+encuesta, email+institución) y agregaciones SQL para CU-031/033. La escala
  NFR-C está órdenes de magnitud por debajo del techo de un PG mononodo.

COMPENSACIÓN EXPLÍCITA:
  Disponibilidad ante fallo del nodo único (sin HA en free tier). Cubierta y aceptada por
  NFR-D1 (SLO 99,5 %) y NFR-R2 (RTO ≤ 4 h con restore ensayado). Elegir un datastore
  distribuido para evitar esta compensación violaría R-01 y agregaría consistencia
  eventual justo donde el negocio exige lo contrario.

MODO DE FALLO BAJO PARTICIÓN (cliente↔BD):
  Fail-fast: la API responde 503 Problem Details en lecturas y escrituras (sin colas
  locales ni escrituras diferidas que inventarían un modo AP no diseñado); el frontend
  muestra error recuperable; el monitor sintético lo registra contra el error budget.

ALTERNATIVAS EVALUADAS Y DESCARTADAS:
  1. MongoDB Atlas free (AP-lean, BASE): el modelo es relacional con integridad
     referencial fuerte; las transacciones multi-documento existen pero con más fricción
     y sin CHECK/FK nativos como red de seguridad; los reportes CU-031/033 son GROUP BY
     naturales en SQL. Beneficio de esquema flexible: nulo aquí (esquema estable y
     conocido).
  2. SQLite/Turso: escritor único global serializa las escrituras concurrentes del
     checkout + separación proceso-hosting (Render) lo vuelve operacionalmente frágil;
     sin pooler ni backups gestionados equivalentes.
  3. MySQL (PlanetScale): free tier discontinuado (violaría R-01 o exigiría migrar);
     sin ventaja técnica sobre PG para este dominio; PlanetScale además no soporta FKs
     clásicas en su modo branching.
```

## Consecuencias

- ✅ Idempotencia y unicidad **por constraint de BD** (los tests de 1.1 lo exigen contra BD
  real); backups diarios gestionados (NFR-R1); Storage y BD en un solo proveedor ya
  conectado al flujo de trabajo del equipo.
- ⚠️ **Riesgo free tier: pausa por inactividad** (proyectos free se pausan tras días sin
  tráfico). Mitigación: el monitor sintético (NFR-D1) consulta `/ready`, que toca la BD —
  keep-alive y monitoreo son el mismo mecanismo.
- ⚠️ Límites free (orden de magnitud: ~500 MB BD, ~1 GB storage) **se verifican al alta**
  y completan la tabla NFR-F2 con umbrales al 80 %. La escala NFR-C3 estimada entra con
  margen amplio (~10× según estimación de tamaño de filas; se valida con el seed).
- ⚠️ Sin HA: aceptado y documentado arriba. Plan B ante cambio de condiciones del free
  tier: Neon (PG serverless free) detrás del mismo repositorio — migración = connection
  string, no reescritura.

## Registro de cambios
| Versión | Fecha | Cambio |
|---|---|---|
| 1.0.0 | 2026-07-04 | Decisión aceptada con análisis CAP/PACELC |
