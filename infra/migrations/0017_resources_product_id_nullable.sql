-- ════════════════════════════════════════════════════════════════════════════
--  0017 · resources.product_id admite nulo                              (CU-19)
-- ════════════════════════════════════════════════════════════════════════════
-- CU-19 A9.4 declara "Producto relacionado" como campo OPCIONAL del alta de un recurso.
-- docs/00-analisis/F0-06-analisis-administracion.md §2.2/§3 relevó esa misma cardinalidad
-- (products — resources = 1 : 0..N, "la relación admite nulo") y docs/01-modelo-datos/F1-DER.md
-- lo fijó como decisión D-19: "existen recursos sin producto asociado".
--
-- La migración 0001 nunca se corrigió: `juego_id`/`product_id` quedó NOT NULL desde el esquema
-- original. El esquema es un artefacto DERIVADO de los CU (CLAUDE.md): ante la discrepancia gana
-- el CU (+ el DER que lo consolida), y el esquema se corrige.
--
-- Recurso.productoId pasa a `string | null` en el dominio (catalogo/domain/ports/recursos.repository.ts).
-- Un recurso licenciado sin producto nunca puede autorizarse por compra/asignación (no hay qué
-- verificar): DescargarRecurso lo trata como no autorizado sin consultar el puerto.

ALTER TABLE resources ALTER COLUMN product_id DROP NOT NULL;
