-- ============================================================================
--  SISTEMA ACALUD — Addendum II
--  Motor: PostgreSQL 15+
--  Aplicar DESPUÉS de acalud_schema.sql y acalud_schema_addendum.sql
-- ============================================================================
--
--  JUSTIFICACIÓN
--
--  Este segundo addendum incorpora las estructuras que resultaron necesarias al
--  contrastar el esquema objetivo con la implementación existente. Al igual que
--  el primero, cada incorporación responde a un requerimiento documentado.
--
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1. TESTIGOS DE UN SOLO USO
--
--  Origen: CU-02 RNF-005 — "El formulario de login debe tener un enlace visible
--  a '¿Olvidaste tu contraseña?'". Y CU-34, que requiere un testigo de
--  verificación para confirmar la titularidad del nuevo correo.
--
--  El esquema base no contemplaba dónde persistir esos testigos. Sin esta
--  estructura, el enlace que exige CU-02 RNF-005 conduciría a un flujo
--  inexistente, y CU-34 no podría verificar la titularidad del correo nuevo.
--
--  Se adopta una entidad única con un atributo de propósito, en lugar de una
--  tabla por cada circuito: los tres comparten la misma mecánica —testigo
--  aleatorio, de un solo uso, con vencimiento— y difieren únicamente en la
--  acción que habilitan.
-- ----------------------------------------------------------------------------

CREATE TYPE token_purpose AS ENUM (
    'password_reset',      -- recuperación de contraseña (CU-02 RNF-005)
    'email_verification',  -- verificación del correo al registrarse
    'email_change'         -- confirmación del correo nuevo (CU-34)
);

CREATE TABLE user_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    purpose     token_purpose NOT NULL,
    payload     VARCHAR(255),          -- para 'email_change': el correo nuevo
    used_at     TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT token_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX idx_user_tokens_user    ON user_tokens (user_id, purpose);
CREATE INDEX idx_user_tokens_expires ON user_tokens (expires_at);

-- Un usuario mantiene a lo sumo un testigo vigente por propósito: al solicitar
-- uno nuevo, el anterior se invalida. El índice parcial lo garantiza.
CREATE UNIQUE INDEX uq_user_tokens_active
    ON user_tokens (user_id, purpose) WHERE used_at IS NULL;

-- El testigo se almacena como resumen criptográfico, nunca en claro, del mismo
-- modo que el identificador de sesión.


-- ----------------------------------------------------------------------------
--  2. VERIFICACIÓN DEL CORREO AL REGISTRARSE
--
--  CU-01 no describe un circuito de verificación: su flujo concluye con el
--  registro efectivo. En consecuencia, la verificación no condiciona el acceso.
--
--  Se conserva no obstante el atributo con valor inicial falso, de modo que
--  registre si el usuario confirmó su correo. El circuito de confirmación opera
--  de manera no bloqueante: la cuenta queda operativa desde el registro, y el
--  atributo se actualiza si el usuario utiliza el enlace que recibe.
--
--  Con valor inicial verdadero, el atributo carecería de significado, dado que
--  todas las cuentas nacerían marcadas como verificadas sin haberlo hecho.
-- ----------------------------------------------------------------------------

ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT FALSE;


-- ----------------------------------------------------------------------------
--  3. INSTANTÁNEA DE LA DENOMINACIÓN DEL PRODUCTO
--
--  Origen: CU-22 RN-007 — "La modificación de la configuración no altera las
--  órdenes existentes."
--
--  El esquema base conserva el precio vigente al momento de la compra en
--  `order_items.unit_price`, por el mismo fundamento. La denominación del
--  producto requiere idéntico tratamiento: si el administrador la modifica
--  (CU-19), la orden histórica debe seguir exhibiendo el nombre con el que el
--  docente efectuó la compra.
--
--  Sin esta instantánea, el historial de compras de CU-05 mostraría
--  denominaciones que el usuario nunca vio al comprar.
-- ----------------------------------------------------------------------------

ALTER TABLE order_items ADD COLUMN product_name_snapshot VARCHAR(200);

-- Se admite nulo por compatibilidad con las órdenes ya registradas. Para las
-- nuevas, la aplicación lo completa siempre.


-- ----------------------------------------------------------------------------
--  4. IDENTIFICADOR LEGIBLE DE LA ORDEN
--
--  El identificador universal de la orden no resulta apto para su comunicación
--  al usuario ni para su mención en una consulta de soporte. Se incorpora un
--  identificador legible, secuencial y estable.
--
--  Ninguna especificación lo exige de manera expresa. Se conserva por su
--  utilidad operativa y porque no contradice ninguna regla: es un atributo de
--  presentación que no altera el comportamiento del circuito.
-- ----------------------------------------------------------------------------

CREATE SEQUENCE order_number_seq START 1000;

ALTER TABLE orders ADD COLUMN order_number VARCHAR(20) UNIQUE;

-- La aplicación lo compone al crear la orden, con el formato ACA-<secuencia>.
-- Se admite nulo por compatibilidad con las órdenes ya registradas.


-- ============================================================================
--  FIN DEL ADDENDUM II
--
--  Resumen de incorporaciones:
--    · user_tokens           — testigos de un solo uso para los tres circuitos
--    · token_purpose         — dominio de propósitos del testigo
--    · users.email_verified  — valor inicial falso
--    · order_items.product_name_snapshot — instantánea de la denominación
--    · orders.order_number   — identificador legible
--
--  Total: 1 tabla, 1 tipo enumerado, 3 alteraciones, 1 secuencia, 3 índices.
-- ============================================================================
