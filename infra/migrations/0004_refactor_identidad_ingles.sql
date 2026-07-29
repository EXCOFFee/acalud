-- Migración 0004 · Refactor a la nomenclatura del esquema de tesis — Etapa 1a: IDENTIDAD
--
-- Fuente de verdad: docs/02-base-datos/acalud_schema.sql + acalud_schema_addendum.sql
--                   + acalud_schema_addendum_II.sql
--
-- Estrategia: ALTER TABLE ... RENAME en lugar de recrear, para preservar los datos de
-- producción (la cuenta real y el kardex del Gate 1, que es la evidencia de las pruebas de
-- concurrencia e idempotencia).
--
-- Alcance de esta migración: cuentas→users, sesiones→sessions, tokens_de_uso→user_tokens,
-- más las tablas de identidad que el esquema objetivo agrega (levels, subjects,
-- teacher_profiles, login_attempts). El resto de los módulos va en migraciones siguientes.

-- ─────────────────────────── Tipos nuevos ───────────────────────────
CREATE TYPE user_role     AS ENUM ('docente', 'admin');
CREATE TYPE token_purpose AS ENUM ('password_reset', 'email_verification', 'email_change');

-- Mantenimiento de updated_at (esquema objetivo §TRIGGERS). La v1 no la tenía.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════ 1 · cuentas → users ═══════════════════════
ALTER TABLE cuentas RENAME TO users;
ALTER TABLE users RENAME COLUMN hash_password TO password_hash;
ALTER TABLE users RENAME COLUMN creada_en     TO created_at;

-- nombre + apellido → full_name (el esquema objetivo usa un solo campo)
ALTER TABLE users ADD COLUMN full_name varchar(150);
UPDATE users SET full_name = btrim(nombre || ' ' || apellido);
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE users DROP COLUMN nombre, DROP COLUMN apellido;

-- es_admin (booleano) → role (enum)
ALTER TABLE users ADD COLUMN role user_role NOT NULL DEFAULT 'docente';
UPDATE users SET role = 'admin' WHERE es_admin = true;
ALTER TABLE users DROP COLUMN es_admin;

-- estado (enum) → email_verified (booleano). Addendum II §2: valor inicial falso y
-- verificación NO bloqueante (la cuenta queda operativa desde el registro, CU-01).
ALTER TABLE users ADD COLUMN email_verified boolean NOT NULL DEFAULT false;
UPDATE users SET email_verified = (estado = 'verificada');
ALTER TABLE users DROP COLUMN estado;

-- domicilio (jsonb) → columnas planas
ALTER TABLE users
  ADD COLUMN street      varchar(150),
  ADD COLUMN number      varchar(20),
  ADD COLUMN city        varchar(100),
  ADD COLUMN province    varchar(100),
  ADD COLUMN postal_code varchar(20);
UPDATE users SET
  street      = domicilio->>'calle',
  number      = domicilio->>'numero',
  city        = domicilio->>'localidad',
  province    = domicilio->>'provincia',
  postal_code = domicilio->>'codigo_postal'
WHERE domicilio IS NOT NULL;
ALTER TABLE users DROP COLUMN domicilio;

ALTER TABLE users ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Columnas que el esquema objetivo no contempla (MFA y teléfono no están en users; el
-- bloqueo por fuerza bruta pasa a login_attempts — decisión Δ3).
ALTER TABLE users
  DROP COLUMN telefono,
  DROP COLUMN two_factor_secret,
  DROP COLUMN two_factor_enabled,
  DROP COLUMN ultimo_login,
  DROP COLUMN intentos_fallidos,
  DROP COLUMN intentos_desde,
  DROP COLUMN bloqueada_hasta;

-- Unicidad de email insensible a mayúsculas (se conserva la del esquema v1: es más estricta
-- que el UNIQUE simple del objetivo y sostiene la normalización de CU-01).
ALTER INDEX ux_cuentas_email_lower RENAME TO ux_users_email_lower;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════ 2 · sesiones → sessions ═══════════════════════
ALTER TABLE sesiones RENAME TO sessions;
ALTER TABLE sessions RENAME COLUMN cuenta_id TO user_id;
ALTER TABLE sessions RENAME COLUMN creada_en TO created_at;
ALTER TABLE sessions RENAME COLUMN expira_en TO expires_at;
ALTER TABLE sessions RENAME COLUMN ip        TO ip_address;
ALTER TABLE sessions ALTER COLUMN ip_address TYPE varchar(45) USING host(ip_address);

-- Addendum §4: el cierre de sesión ELIMINA el registro (la credencial deja de existir), así
-- que no hay columna de revocación. Las sesiones ya revocadas se descartan.
DELETE FROM sessions WHERE revocada_en IS NOT NULL;
ALTER TABLE sessions DROP COLUMN revocada_en;

ALTER TABLE sessions ADD COLUMN last_seen_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE sessions ADD CONSTRAINT session_expiry_after_creation CHECK (expires_at > created_at);

ALTER INDEX ix_sesiones_cuenta RENAME TO idx_sessions_user;
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

-- ═══════════════════════ 3 · tokens_de_uso → user_tokens ═══════════════════════
ALTER TABLE tokens_de_uso RENAME TO user_tokens;
ALTER TABLE user_tokens RENAME COLUMN cuenta_id   TO user_id;
ALTER TABLE user_tokens RENAME COLUMN email_nuevo TO payload;
ALTER TABLE user_tokens RENAME COLUMN expira_en   TO expires_at;
ALTER TABLE user_tokens RENAME COLUMN creado_en   TO created_at;

-- tipo (tipo_token) → purpose (token_purpose)
ALTER TABLE user_tokens ADD COLUMN purpose token_purpose;
UPDATE user_tokens SET purpose = CASE tipo
    WHEN 'verificacion_email'    THEN 'email_verification'::token_purpose
    WHEN 'recuperacion_password' THEN 'password_reset'::token_purpose
    WHEN 'cambio_email'          THEN 'email_change'::token_purpose
  END;
ALTER TABLE user_tokens ALTER COLUMN purpose SET NOT NULL;
ALTER TABLE user_tokens DROP COLUMN tipo;   -- arrastra ix_tokens_cuenta_tipo

-- usado (booleano) → used_at (marca temporal del consumo)
ALTER TABLE user_tokens ADD COLUMN used_at timestamptz;
UPDATE user_tokens SET used_at = now() WHERE usado = true;
ALTER TABLE user_tokens DROP COLUMN usado;

ALTER TABLE user_tokens ADD CONSTRAINT uq_user_tokens_hash UNIQUE (token_hash);
ALTER TABLE user_tokens ADD CONSTRAINT token_expiry_after_creation CHECK (expires_at > created_at);

CREATE INDEX idx_user_tokens_user    ON user_tokens (user_id, purpose);
CREATE INDEX idx_user_tokens_expires ON user_tokens (expires_at);

-- Addendum II §1: a lo sumo un testigo vigente por usuario y propósito. Se consumen los
-- vigentes duplicados que hubiera (se conserva el más reciente) antes de crear el índice.
UPDATE user_tokens t SET used_at = now()
 WHERE t.used_at IS NULL
   AND EXISTS (
     SELECT 1 FROM user_tokens t2
      WHERE t2.user_id = t.user_id AND t2.purpose = t.purpose
        AND t2.used_at IS NULL AND t2.created_at > t.created_at
   );
CREATE UNIQUE INDEX uq_user_tokens_active
  ON user_tokens (user_id, purpose) WHERE used_at IS NULL;

-- ═══════════════════ 4 · Tablas de identidad del esquema objetivo ═══════════════════
CREATE TABLE levels (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(50) NOT NULL UNIQUE
);

CREATE TABLE subjects (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL UNIQUE
);

CREATE TABLE teacher_profiles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  level_id            uuid REFERENCES levels(id) ON DELETE SET NULL,
  subject_id          uuid REFERENCES subjects(id) ON DELETE SET NULL,
  school_name         varchar(150),
  email_notifications boolean NOT NULL DEFAULT false,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Δ3: el bloqueo por fuerza bruta (CU-02 RN-007) se calcula contando intentos fallidos
-- recientes sobre este registro, que además es auditable (RNF-SIS-016).
CREATE TABLE login_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        varchar(255) NOT NULL,
  ip_address   varchar(45)  NOT NULL,
  result       varchar(20)  NOT NULL,
  attempted_at timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_email ON login_attempts (email, attempted_at DESC);

-- Datos maestros (esquema objetivo §DATOS MAESTROS)
INSERT INTO levels (name) VALUES ('Inicial'), ('Primaria'), ('Secundaria')
  ON CONFLICT (name) DO NOTHING;
INSERT INTO subjects (name) VALUES
  ('Matemática'), ('Lengua'), ('Ciencias Naturales'), ('Ciencias Sociales'),
  ('Programación'), ('Educación Física'), ('Arte'), ('Música'), ('Inglés')
  ON CONFLICT (name) DO NOTHING;

-- ═══════════════════ 5 · RLS deny-all en las tablas nuevas (ADR-003) ═══════════════════
ALTER TABLE levels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts   ENABLE ROW LEVEL SECURITY;
