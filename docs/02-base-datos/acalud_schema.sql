-- ============================================================================
--  SISTEMA ACALUD — Esquema de Base de Datos
--  Motor: PostgreSQL 15+
--  Derivado de: DER v00 (34 especificaciones funcionales, 58 decisiones)
--  Nomenclatura: inglés, conforme a la documentación funcional
-- ============================================================================

-- ----------------------------------------------------------------------------
--  Extensiones
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ----------------------------------------------------------------------------
--  Tipos enumerados
-- ----------------------------------------------------------------------------
CREATE TYPE user_role         AS ENUM ('docente', 'admin');
CREATE TYPE resource_type     AS ENUM ('pdf', 'link');
CREATE TYPE order_type        AS ENUM ('b2c', 'b2b');
CREATE TYPE order_status       AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled');
CREATE TYPE assignment_status AS ENUM ('active', 'revoked');
CREATE TYPE poll_status       AS ENUM ('draft', 'active', 'closed');
CREATE TYPE proposal_status   AS ENUM ('pending', 'reviewed', 'approved', 'rejected');

-- ============================================================================
--  MÓDULO 1 · IDENTIDAD Y ACCESO
-- ============================================================================

CREATE TABLE levels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50)  NOT NULL UNIQUE
);

CREATE TABLE subjects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    role            user_role    NOT NULL DEFAULT 'docente',
    email_verified  BOOLEAN      NOT NULL DEFAULT TRUE,
    street          VARCHAR(150),
    number          VARCHAR(20),
    city            VARCHAR(100),
    province        VARCHAR(100),
    postal_code     VARCHAR(20),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE teacher_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    level_id            UUID REFERENCES levels(id) ON DELETE SET NULL,
    subject_id          UUID REFERENCES subjects(id) ON DELETE SET NULL,
    school_name         VARCHAR(150),
    email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE login_attempts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        VARCHAR(255) NOT NULL,
    ip_address   VARCHAR(45)  NOT NULL,
    result       VARCHAR(20)  NOT NULL,
    attempted_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE revoked_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id    VARCHAR(255) NOT NULL UNIQUE,
    revoked_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ  NOT NULL
);

-- ============================================================================
--  MÓDULO 2 · CATÁLOGO Y CONTENIDO
-- ============================================================================

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE editorial_partners (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  VARCHAR(150) NOT NULL,
    logo_url              VARCHAR(500) NOT NULL,
    description           TEXT         NOT NULL,
    external_website_url  VARCHAR(500) NOT NULL,
    category              VARCHAR(100),
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE products (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                        VARCHAR(200)   NOT NULL,
    description                 TEXT           NOT NULL,
    price                       NUMERIC(12,2)  NOT NULL CHECK (price >= 0),
    stock                       INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_own_brand                BOOLEAN        NOT NULL DEFAULT TRUE,
    external_url                VARCHAR(500),
    wholesale_threshold         INTEGER        CHECK (wholesale_threshold IS NULL OR wholesale_threshold > 0),
    wholesale_discount_percent  NUMERIC(5,2)   CHECK (wholesale_discount_percent IS NULL OR (wholesale_discount_percent >= 0 AND wholesale_discount_percent <= 100)),
    is_active                   BOOLEAN        NOT NULL DEFAULT TRUE,
    category_id                 UUID REFERENCES categories(id) ON DELETE SET NULL,
    editorial_partner_id        UUID REFERENCES editorial_partners(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    -- CU-10 RN-003 / CU-22 RN-003: umbral y porcentaje se configuran juntos
    CONSTRAINT wholesale_pair_consistency CHECK (
        (wholesale_threshold IS NULL AND wholesale_discount_percent IS NULL)
        OR (wholesale_threshold IS NOT NULL AND wholesale_discount_percent IS NOT NULL)
    ),
    -- CU-19 RN-003 / RN-004: los de terceros llevan URL externa; los propios no
    CONSTRAINT own_brand_url_consistency CHECK (
        (is_own_brand = TRUE AND external_url IS NULL)
        OR (is_own_brand = FALSE AND external_url IS NOT NULL)
    )
);

CREATE TABLE demos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    config_json JSONB NOT NULL
);

CREATE TABLE game_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    progress_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
    best_score      INTEGER,
    total_plays     INTEGER NOT NULL DEFAULT 0,
    last_played_at  TIMESTAMPTZ,
    CONSTRAINT uq_progress_user_product UNIQUE (user_id, product_id)
);

CREATE TABLE resources (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id           UUID REFERENCES products(id) ON DELETE CASCADE,
    title                VARCHAR(200) NOT NULL,
    type                 resource_type NOT NULL,
    url                  VARCHAR(500),
    file_content         BYTEA,
    is_licensed          BOOLEAN NOT NULL DEFAULT FALSE,
    download_count       INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0),
    promotion_starts_at  TIMESTAMPTZ,
    promotion_ends_at    TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- D-18: un recurso pdf guarda contenido; un link guarda url
    CONSTRAINT resource_content_by_type CHECK (
        (type = 'link' AND url IS NOT NULL)
        OR (type = 'pdf' AND (url IS NOT NULL OR file_content IS NOT NULL))
    ),
    -- promoción: si tiene una fecha, tiene ambas y son coherentes
    CONSTRAINT promotion_range CHECK (
        (promotion_starts_at IS NULL AND promotion_ends_at IS NULL)
        OR (promotion_starts_at IS NOT NULL AND promotion_ends_at IS NOT NULL
            AND promotion_ends_at > promotion_starts_at)
    )
);

CREATE TABLE favorites (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id            UUID REFERENCES products(id) ON DELETE CASCADE,
    resource_id           UUID REFERENCES resources(id) ON DELETE CASCADE,
    editorial_partner_id  UUID REFERENCES editorial_partners(id) ON DELETE CASCADE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- D-14: exactamente una referencia no nula (referencia polimórfica)
    CONSTRAINT favorite_exactly_one_target CHECK (
        (CASE WHEN product_id           IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN resource_id          IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN editorial_partner_id IS NOT NULL THEN 1 ELSE 0 END) = 1
    )
);

-- ============================================================================
--  MÓDULO 4 · INSTITUCIONAL  (institutions se crea antes que orders, por la FK)
-- ============================================================================

CREATE TABLE institutions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name   VARCHAR(200) NOT NULL,
    tax_id       VARCHAR(20)  NOT NULL UNIQUE,
    email        VARCHAR(255) NOT NULL UNIQUE,
    street       VARCHAR(150) NOT NULL,
    number       VARCHAR(20)  NOT NULL,
    city         VARCHAR(100) NOT NULL,
    province     VARCHAR(100) NOT NULL,
    postal_code  VARCHAR(20)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE institutional_teachers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- CU-23: sin vínculos duplicados
    CONSTRAINT uq_institution_user UNIQUE (institution_id, user_id)
);
-- D-35: un usuario es encargado de una sola institución (índice parcial)
CREATE UNIQUE INDEX uq_single_admin_per_user
    ON institutional_teachers (user_id) WHERE is_admin = TRUE;

-- ============================================================================
--  MÓDULO 3 · COMPRAS Y LOGÍSTICA
-- ============================================================================

CREATE TABLE carts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    CONSTRAINT uq_cart_product UNIQUE (cart_id, product_id)
);

CREATE TABLE orders (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    institution_id        UUID REFERENCES institutions(id) ON DELETE RESTRICT,
    order_type            order_type   NOT NULL DEFAULT 'b2c',
    status                order_status NOT NULL DEFAULT 'pending',
    total_amount          NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    shipping_cost         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    shipping_method       VARCHAR(100),
    shipping_carrier      VARCHAR(100),
    shipping_street       VARCHAR(150),
    shipping_number       VARCHAR(20),
    shipping_city         VARCHAR(100),
    shipping_province     VARCHAR(100),
    shipping_postal_code  VARCHAR(20),
    payment_preference_id VARCHAR(255),
    payment_id_mp         VARCHAR(255),
    tracking_code         VARCHAR(100),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- CU-24: una orden b2b pertenece a una institución; una b2c no
    CONSTRAINT order_type_institution_consistency CHECK (
        (order_type = 'b2b' AND institution_id IS NOT NULL)
        OR (order_type = 'b2c' AND institution_id IS NULL)
    )
);

CREATE TABLE order_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id       UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity         INTEGER NOT NULL CHECK (quantity > 0),
    unit_price       NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    discount_applied NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (discount_applied >= 0 AND discount_applied <= 100)
);

CREATE TABLE order_tracking_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status      VARCHAR(50) NOT NULL,
    location    VARCHAR(200),
    description TEXT,
    event_date  TIMESTAMPTZ,
    fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- Institucional: entidades que dependen de products y de la propia institución ---

CREATE TABLE institutional_inventories (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_purchased  INTEGER NOT NULL DEFAULT 0 CHECK (quantity_purchased >= 0),
    quantity_assigned   INTEGER NOT NULL DEFAULT 0 CHECK (quantity_assigned >= 0),
    acquired_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_institution_product UNIQUE (institution_id, product_id),
    -- CU-26 RN-005: no se puede asignar más de lo adquirido
    CONSTRAINT assigned_not_exceed_purchased CHECK (quantity_assigned <= quantity_purchased)
);

CREATE TABLE institutional_assignments (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id            UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    institutional_teacher_id  UUID NOT NULL REFERENCES institutional_teachers(id) ON DELETE CASCADE,
    product_id                UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity_assigned         INTEGER NOT NULL CHECK (quantity_assigned > 0),
    status                    assignment_status NOT NULL DEFAULT 'active',
    assigned_by               UUID NOT NULL REFERENCES institutional_teachers(id) ON DELETE RESTRICT,
    assigned_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at                TIMESTAMPTZ,
    revoked_by                UUID REFERENCES institutional_teachers(id) ON DELETE SET NULL,
    revocation_reason         VARCHAR(500),
    -- D-33: coherencia del estado revocado con sus campos
    CONSTRAINT revocation_consistency CHECK (
        (status = 'active'  AND revoked_at IS NULL AND revoked_by IS NULL)
        OR (status = 'revoked' AND revoked_at IS NOT NULL)
    )
);

CREATE TABLE game_sessions (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institutional_teacher_id  UUID NOT NULL REFERENCES institutional_teachers(id) ON DELETE CASCADE,
    product_id                UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    session_date              DATE NOT NULL,
    group_name                VARCHAR(150),
    student_count             INTEGER NOT NULL CHECK (student_count > 0),
    duration_minutes          INTEGER NOT NULL CHECK (duration_minutes > 0),
    teacher_satisfaction      SMALLINT NOT NULL CHECK (teacher_satisfaction BETWEEN 1 AND 5),
    key_learnings             TEXT NOT NULL CHECK (char_length(key_learnings) >= 20),
    difficulties              TEXT,
    would_reuse               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- CU-29 RN-002: la fecha de la sesión no puede ser futura
    CONSTRAINT session_date_not_future CHECK (session_date <= CURRENT_DATE)
);

-- ============================================================================
--  MÓDULO 5 · COMUNIDAD
-- ============================================================================

CREATE TABLE polls (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question         TEXT NOT NULL,
    status           poll_status NOT NULL DEFAULT 'draft',
    target_level_id  UUID REFERENCES levels(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE poll_options (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id  UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    text     VARCHAR(300) NOT NULL CHECK (char_length(trim(text)) > 0)
);

CREATE TABLE poll_responses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id   UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- D-46: una respuesta por usuario y encuesta
    CONSTRAINT uq_poll_user UNIQUE (poll_id, user_id)
);

CREATE TABLE proposals (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    description      TEXT NOT NULL CHECK (char_length(description) >= 50),
    subject_id       UUID REFERENCES subjects(id) ON DELETE SET NULL,
    target_level_id  UUID REFERENCES levels(id) ON DELETE SET NULL,
    status           proposal_status NOT NULL DEFAULT 'pending',
    admin_feedback   TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
--  MÓDULO 6 · TRANSVERSAL
-- ============================================================================

CREATE TABLE audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action        VARCHAR(100) NOT NULL,
    entity_type   VARCHAR(100) NOT NULL,
    entity_id     UUID NOT NULL,
    old_values    JSONB,
    new_values    JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                  VARCHAR(50)  NOT NULL,
    title                 VARCHAR(200) NOT NULL,
    message               TEXT NOT NULL,
    related_entity_type   VARCHAR(100),
    related_entity_id     UUID,
    is_read               BOOLEAN NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
--  ÍNDICES PARCIALES ÚNICOS — favoritos (D-14)
--  Un usuario no guarda el mismo elemento dos veces, por cada tipo de referencia
-- ============================================================================
CREATE UNIQUE INDEX uq_favorite_product   ON favorites (user_id, product_id)           WHERE product_id           IS NOT NULL;
CREATE UNIQUE INDEX uq_favorite_resource  ON favorites (user_id, resource_id)          WHERE resource_id          IS NOT NULL;
CREATE UNIQUE INDEX uq_favorite_partner   ON favorites (user_id, editorial_partner_id) WHERE editorial_partner_id IS NOT NULL;

-- ============================================================================
--  ÍNDICES DE RENDIMIENTO
--  Sobre claves foráneas de consulta frecuente y campos de filtro/orden
-- ============================================================================

-- Catálogo
CREATE INDEX idx_products_category    ON products (category_id);
CREATE INDEX idx_products_partner     ON products (editorial_partner_id);
CREATE INDEX idx_products_active      ON products (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_resources_product    ON resources (product_id);
CREATE INDEX idx_resources_licensed   ON resources (is_licensed);

-- Compras
CREATE INDEX idx_cart_items_cart      ON cart_items (cart_id);
CREATE INDEX idx_orders_user          ON orders (user_id);
CREATE INDEX idx_orders_institution   ON orders (institution_id);
CREATE INDEX idx_orders_status        ON orders (status);
CREATE INDEX idx_orders_created       ON orders (created_at DESC);   -- CU-05 RN-002: orden por fecha desc
CREATE INDEX idx_order_items_order    ON order_items (order_id);
CREATE INDEX idx_tracking_order       ON order_tracking_events (order_id);

-- Institucional  (CU-31/33: reportes por institución, docente, producto, fecha)
CREATE INDEX idx_inst_teachers_inst   ON institutional_teachers (institution_id);
CREATE INDEX idx_inst_teachers_user   ON institutional_teachers (user_id);
CREATE INDEX idx_inventories_inst     ON institutional_inventories (institution_id);
CREATE INDEX idx_assignments_teacher  ON institutional_assignments (institutional_teacher_id);
CREATE INDEX idx_assignments_status   ON institutional_assignments (status);
CREATE INDEX idx_sessions_teacher     ON game_sessions (institutional_teacher_id);
CREATE INDEX idx_sessions_product     ON game_sessions (product_id);
CREATE INDEX idx_sessions_date        ON game_sessions (session_date);

-- Comunidad  (CU-16 RNF-008: índices sobre participación)
CREATE INDEX idx_poll_options_poll    ON poll_options (poll_id);
CREATE INDEX idx_poll_responses_poll  ON poll_responses (poll_id);
CREATE INDEX idx_poll_responses_opt   ON poll_responses (option_id);
CREATE INDEX idx_proposals_user       ON proposals (user_id);
CREATE INDEX idx_proposals_status     ON proposals (status);

-- Progreso de juego
CREATE INDEX idx_progress_user        ON game_progress (user_id);

-- Transversal
CREATE INDEX idx_audit_entity         ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_actor          ON audit_log (actor_user_id);
CREATE INDEX idx_audit_created        ON audit_log (created_at DESC);
CREATE INDEX idx_notifications_recip  ON notifications (recipient_user_id, is_read);

-- Acceso
CREATE INDEX idx_login_attempts_email ON login_attempts (email, attempted_at DESC);
CREATE INDEX idx_revoked_expires      ON revoked_tokens (expires_at);

-- ============================================================================
--  TRIGGERS — mantenimiento de updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated      BEFORE UPDATE ON users            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated   BEFORE UPDATE ON teacher_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated   BEFORE UPDATE ON products         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_carts_updated      BEFORE UPDATE ON carts            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated     BEFORE UPDATE ON orders           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proposals_updated  BEFORE UPDATE ON proposals        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
--  DATOS MAESTROS  (seed inicial de tablas de referencia)
-- ============================================================================

-- CU-04 §4: niveles educativos
INSERT INTO levels (name) VALUES
    ('Inicial'), ('Primaria'), ('Secundaria');

-- Materias frecuentes (base ampliable por el administrador)
INSERT INTO subjects (name) VALUES
    ('Matemática'), ('Lengua'), ('Ciencias Naturales'),
    ('Ciencias Sociales'), ('Programación'), ('Educación Física'),
    ('Arte'), ('Música'), ('Inglés');

-- ============================================================================
--  FIN DEL ESQUEMA
-- ============================================================================
