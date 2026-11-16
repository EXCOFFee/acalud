-- ════════════════════════════════════════════════════════════════════════════
--  0021 · polls.closed_at + retiro de columnas sin respaldo           (CU-16, CU-20)
-- ════════════════════════════════════════════════════════════════════════════
-- Decisiones aceptadas el 2026-11-16 (documento "Encuestas: decisiones pendientes", matriz F6
-- §5.6):
--   D5: la fecha de cierre se guarda en `closed_at`. CU-16 la nombra literalmente: el listado
--       devuelve "closed_at (si está finalizada)".
--   D6: se retiran `description`, `valid_from` y `valid_until`. Ningún CU las pide y ningún
--       código las usa (F6 §8: "CU-20 gobierna la visibilidad con el estado, no con fechas").
--       El cierre es manual (D2: botón "Finalizar"), no por fecha.

ALTER TABLE polls ADD COLUMN closed_at timestamptz;

-- Datos previos: una encuesta ya cerrada sin fecha recibe la de esta migración (en producción
-- había 0 encuestas). Va ANTES del CHECK para que la migración no falle con datos existentes.
UPDATE polls SET closed_at = now() WHERE status = 'closed' AND closed_at IS NULL;

-- Coherencia: tiene fecha de cierre si y solo si está finalizada. Evita estados contradictorios
-- ("activa con fecha de cierre", "finalizada sin fecha").
ALTER TABLE polls ADD CONSTRAINT ck_polls_closed_at_coherente
  CHECK ((status = 'closed') = (closed_at IS NOT NULL));

COMMENT ON COLUMN polls.closed_at IS
  'Instante en que se finalizó la encuesta (CU-16; D5). NULL salvo status = closed.';

ALTER TABLE polls DROP COLUMN description;
ALTER TABLE polls DROP COLUMN valid_from;
ALTER TABLE polls DROP COLUMN valid_until;
