-- Migración 0020 · Rol de runtime con permisos mínimos (NFR-S6, ADR-003, defensa en profundidad).
--
-- Hasta acá la app se conectaba como `postgres`, DUEÑO de todas las tablas: una inyección SQL
-- podía hacer DROP/ALTER/TRUNCATE o reescribir la auditoría. Desde ahora:
--   · las MIGRACIONES siguen corriendo como dueño (DIRECT_URL) — necesitan DDL;
--   · la APP se conecta como `acalud_app` (DATABASE_URL): solo DML, sin DDL ni ownership.
--
-- Segunda capa sobre los triggers append-only de 0001 (que siguen): aunque alguien desactivara
-- un trigger, este rol ni siquiera tiene el privilegio de UPDATE/DELETE en auditoría y kardex.
--
-- RLS: las tablas tienen RLS deny-all sin políticas (0003). El rol lleva BYPASSRLS (decisión
-- 2026-11, alternativa descartada: una política `TO acalud_app USING (true)` por tabla, que en
-- la práctica da el mismo acceso a filas con más mantenimiento). anon/authenticated siguen
-- bloqueados.
--
-- El rol se crea SIN LOGIN y SIN contraseña: la contraseña es un secreto y NUNCA va al repo.
-- Se activa por fuera, una vez por entorno:  ALTER ROLE acalud_app LOGIN PASSWORD '…';
--
-- ⚠️ Tablas futuras: reciben SELECT/INSERT/UPDATE/DELETE por los default privileges de abajo.
-- Si una tabla nueva es append-only, su migración debe hacer el REVOKE correspondiente.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'acalud_app') THEN
    CREATE ROLE acalud_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO acalud_app;

-- DML sobre todas las tablas actuales…
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO acalud_app;

-- …menos lo que la app nunca debe tocar:
REVOKE ALL ON schema_migrations FROM acalud_app;            -- historial de migraciones
REVOKE UPDATE, DELETE ON audit_log FROM acalud_app;          -- auditoría append-only (RNF-SIS-016)
REVOKE UPDATE, DELETE ON stock_movements FROM acalud_app;    -- kardex append-only
REVOKE DELETE ON outbox_emails FROM acalud_app;              -- el worker actualiza estado, no borra

-- Tablas/secuencias que creen migraciones futuras (las crea el dueño que corre la migración).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO acalud_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO acalud_app;
