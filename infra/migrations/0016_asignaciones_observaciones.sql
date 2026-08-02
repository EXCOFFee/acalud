-- ════════════════════════════════════════════════════════════════════════════
--  0016 · institutional_assignments.notes                              (CU-26)
-- ════════════════════════════════════════════════════════════════════════════
-- CU-26 p8 ("El encargado (opcionalmente) agrega observaciones o notas sobre la asignación")
-- y p12 (el POST envía `observations`) definen un dato que la tabla creada en 0014 no modela:
-- 0014 se escribió sobre RN-006, que enumera sólo los campos obligatorios.
--
-- El esquema es un artefacto DERIVADO de los CU (CLAUDE.md): ante la discrepancia gana el CU y
-- el esquema se corrige. Opcional, porque el propio CU la declara opcional. Se registra en la
-- matriz F6 §1 con la cita que la respalda.
--
-- El límite de 500 caracteres iguala al de `revocation_reason` (CU-27), que es el campo de texto
-- libre análogo de esta misma tabla: no hay cota declarada en CU-26.

ALTER TABLE institutional_assignments ADD COLUMN notes varchar(500);

COMMENT ON COLUMN institutional_assignments.notes IS
  'Observaciones opcionales del encargado al asignar (CU-26 p8 / p12 `observations`).';
