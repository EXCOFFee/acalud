-- Migración 0009 · descargas → downloads (pendiente que quedó fuera de la etapa 1b)
--
-- Respaldo: F6 §1 (Catálogo) y §6. CU-08 pide registrar el evento `free_resource_downloaded`
-- con `resource_id` y el tipo de usuario; CU-09 la consulta para los recursos licenciados.
--
-- `via` se conserva: es el discriminante de CU-08 (anónima) y CU-09 (personal, institucional).
-- El tipo `via_descarga` NO se renombra acá: entra en el pase de enumeraciones, que es tarea
-- aparte y con criterio único (F6 §4c).

ALTER TABLE descargas RENAME TO downloads;
ALTER TABLE downloads RENAME COLUMN cuenta_id  TO user_id;     -- nulo si la descarga es anónima (CU-08)
ALTER TABLE downloads RENAME COLUMN recurso_id TO resource_id;
ALTER TABLE downloads RENAME COLUMN creado_en  TO created_at;

ALTER INDEX ix_descargas_recurso RENAME TO idx_downloads_resource;
