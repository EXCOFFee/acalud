-- ============================================================================
--  SISTEMA ACALUD — Addendum III
--  Motor: PostgreSQL 15+
--  Aplicar DESPUÉS de acalud_schema.sql, addendum y addendum_II
-- ============================================================================
--
--  JUSTIFICACIÓN
--
--  Este addendum incorpora una columna que las especificaciones nombran de
--  manera expresa y que el esquema base omitió.
--
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1. INSTANTE DEL ÚLTIMO ACCESO
--
--  Origen: CU-02, que la nombra en tres pasajes distintos:
--    · Flujo principal: "Se registra la fecha y hora del último login en el
--      campo last_login de users."
--    · Flujo principal: "El sistema actualiza el campo last_login con la fecha
--      y hora actual."
--    · RN-003: "El campo last_login debe actualizarse en cada inicio de sesión
--      exitoso."
--
--  El esquema base omitió esta columna. La especificación no requiere
--  únicamente registrar el acceso: nombra el campo y la entidad donde debe
--  residir.
--
--  La alternativa de derivarla del registro de intentos —tomando el instante
--  más reciente con resultado exitoso— produce el mismo valor, pero acopla un
--  dato de la cuenta al ciclo de vida de un registro de seguridad. El registro
--  de intentos existe para el control de accesos fallidos y su horizonte útil
--  es de minutos; depurarlo, práctica habitual en registros de esa naturaleza,
--  haría perder el último acceso de los usuarios menos frecuentes.
--
--  La columna y el registro cumplen finalidades distintas y por lo tanto
--  conviven: el registro audita los intentos, la columna informa el estado de
--  la cuenta.
-- ----------------------------------------------------------------------------

ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;

-- Admite nulo: una cuenta recién registrada que aún no inició sesión carece de
-- último acceso. La aplicación la actualiza en cada inicio de sesión exitoso.


-- ============================================================================
--  NOTA SOBRE `vote_count`
--
--  Las especificaciones mencionan también un atributo `vote_count` en las
--  opciones de encuesta (CU-14). Su ausencia del esquema es deliberada y
--  responde a la decisión D-47, ratificada por el equipo: el recuento de votos
--  se calcula en tiempo de consulta sobre `poll_responses`, con el índice
--  `idx_poll_responses_opt` que el esquema base define a tal efecto. Un valor
--  almacenado introduciría riesgo de divergencia sin beneficio a la escala
--  prevista.
--
--  No corresponde incorporarlo.
-- ============================================================================


-- ============================================================================
--  FIN DEL ADDENDUM III
--
--  Resumen: 1 columna.
--
--  Nota de cierre: al concluir el refactor conviene consolidar el esquema base
--  y sus tres addenda en un único artefacto canónico, conservando los
--  addenda como registro de las decisiones que condujeron a él.
-- ============================================================================
