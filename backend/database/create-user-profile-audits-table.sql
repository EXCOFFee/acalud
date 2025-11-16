-- Crea la tabla que almacena la auditoría de cambios en perfiles de usuario
CREATE TABLE IF NOT EXISTS user_profile_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    actor_user_id UUID NULL,
    operation VARCHAR(64) NOT NULL,
    snapshot_before JSONB NULL,
    snapshot_after JSONB NULL,
    changes JSONB NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para acelerar búsquedas por usuario y tipo de operación
CREATE INDEX IF NOT EXISTS idx_user_profile_audits_user_id ON user_profile_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_audits_operation ON user_profile_audits(operation);

-- Relaciones con la tabla de usuarios
ALTER TABLE user_profile_audits
    ADD CONSTRAINT fk_user_profile_audits_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_profile_audits
    ADD CONSTRAINT fk_user_profile_audits_actor
    FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL;
