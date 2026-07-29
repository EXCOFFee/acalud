-- ============================================================================
--  SISTEMA ACALUD — Addendum al esquema base
--  Motor: PostgreSQL 15+
--  Aplicar DESPUÉS de acalud_schema.sql
-- ============================================================================
--
--  JUSTIFICACIÓN
--
--  El esquema base modela las entidades derivadas de las 34 especificaciones
--  funcionales. Esas especificaciones describen el comportamiento observable del
--  sistema, no los mecanismos que garantizan sus propiedades no funcionales.
--
--  Este addendum incorpora las estructuras que implementan requerimientos no
--  funcionales ya documentados, y que sin ellas quedarían sin sustento en el
--  modelo de datos. Cada tabla indica el requerimiento que la origina.
--
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1. IDEMPOTENCIA DE NOTIFICACIONES DE PAGO
--
--  Origen: RNF-CU12-002 — "El sistema procesa notificaciones simultáneas sin
--  conflictos de actualización."
--
--  La pasarela puede emitir la misma notificación más de una vez. Sin una
--  restricción de unicidad sobre el identificador del pago, un reenvío
--  produciría un segundo procesamiento: doble descuento de stock y doble
--  comprobante. La restricción traslada la garantía al motor, de modo que la
--  segunda notificación falle de manera determinista en lugar de depender de la
--  lógica de aplicación.
-- ----------------------------------------------------------------------------

CREATE TABLE processed_payments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id    VARCHAR(255) NOT NULL UNIQUE,
    order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    status        VARCHAR(50)  NOT NULL,
    raw_payload   JSONB,
    processed_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_processed_payments_order ON processed_payments (order_id);

-- Refuerzo adicional sobre la orden: un mismo pago no puede asociarse a dos
-- órdenes distintas. Índice parcial, dado que el atributo admite nulo mientras
-- la orden está pendiente.
CREATE UNIQUE INDEX uq_orders_payment_id_mp
    ON orders (payment_id_mp) WHERE payment_id_mp IS NOT NULL;


-- ----------------------------------------------------------------------------
--  2. COLA DE ENVÍO DE CORREOS
--
--  Origen: RF-CU12-006 — "El comprobante de compra se remite por correo
--  electrónico." También RF-CU26-006, RF-CU27-005 y RF-CU34-005, que requieren
--  notificar por correo.
--
--  La entidad `notifications` del esquema base sostiene el canal de tablero:
--  registra el aviso para que el usuario lo vea dentro de la aplicación. No
--  cubre el envío por correo, que involucra un servicio externo y por lo tanto
--  puede fallar de manera transitoria.
--
--  Esta tabla registra el correo pendiente dentro de la misma transacción que
--  produce el hecho que lo origina. Un proceso posterior lo entrega y actualiza
--  su estado. De ese modo, si el envío falla, el correo no se pierde: queda
--  pendiente de reintento. Si en cambio el envío se intentara de forma directa
--  durante la transacción, un fallo del servicio externo dejaría al usuario sin
--  su comprobante y sin registro del intento.
-- ----------------------------------------------------------------------------

CREATE TYPE outbox_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE outbox_emails (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient      VARCHAR(255) NOT NULL,
    subject        VARCHAR(300) NOT NULL,
    body           TEXT         NOT NULL,
    template       VARCHAR(100),
    status         outbox_status NOT NULL DEFAULT 'pending',
    attempts       INTEGER      NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error     TEXT,
    related_entity_type VARCHAR(100),
    related_entity_id   UUID,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    sent_at        TIMESTAMPTZ,
    CONSTRAINT outbox_sent_consistency CHECK (
        (status = 'sent' AND sent_at IS NOT NULL)
        OR (status <> 'sent' AND sent_at IS NULL)
    )
);

-- Índice para el proceso de entrega: recupera los pendientes más antiguos.
CREATE INDEX idx_outbox_pending
    ON outbox_emails (created_at) WHERE status = 'pending';


-- ----------------------------------------------------------------------------
--  3. MOVIMIENTOS DE EXISTENCIAS
--
--  Origen: RNF-SIS-016 — "Las operaciones administrativas y las que modifican
--  datos sensibles se asientan en un registro de auditoría."
--
--  El atributo `products.stock` del esquema base conserva la cantidad vigente,
--  pero no la historia de cómo llegó a ese valor. Ante una discrepancia entre el
--  stock registrado y el real, no habría forma de reconstruir qué operaciones lo
--  modificaron.
--
--  Esta tabla registra cada movimiento con su motivo y su origen. Es de solo
--  inserción: los movimientos no se modifican ni se eliminan, de modo que el
--  historial resulta auditable. La suma de los movimientos de un producto debe
--  coincidir con su stock vigente, lo que permite verificar la consistencia.
-- ----------------------------------------------------------------------------

CREATE TYPE stock_movement_reason AS ENUM (
    'purchase_b2c',      -- venta individual confirmada (CU-12)
    'purchase_b2b',      -- adquisición institucional confirmada (CU-24)
    'restock',           -- reposición por el administrador (CU-19)
    'adjustment',        -- ajuste manual del administrador (CU-19)
    'cancellation'       -- devolución por cancelación de orden
);

CREATE TABLE stock_movements (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id    UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity      INTEGER NOT NULL CHECK (quantity <> 0),  -- negativo = salida
    reason        stock_movement_reason NOT NULL,
    order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes         VARCHAR(500),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_movements_product ON stock_movements (product_id, created_at DESC);
CREATE INDEX idx_stock_movements_order   ON stock_movements (order_id);

-- Carácter de solo inserción: se impide la modificación y la eliminación.
CREATE OR REPLACE FUNCTION stock_movements_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'stock_movements es de solo inserción: no admite % ', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_movements_no_update
    BEFORE UPDATE ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION stock_movements_append_only();

CREATE TRIGGER trg_stock_movements_no_delete
    BEFORE DELETE ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION stock_movements_append_only();


-- ----------------------------------------------------------------------------
--  4. SESIONES DE USUARIO  (reemplaza a `revoked_tokens` del esquema base)
--
--  Origen: CU-03, objetivo — "invalidando el token de sesión para garantizar que
--  el dispositivo quede desvinculado de la cuenta."
--
--  El esquema base contemplaba una lista de revocación, adecuada para un modelo
--  de credencial autocontenida. La implementación adopta en cambio una sesión
--  opaca con estado en el servidor: la credencial que recibe el cliente no
--  transporta información, sino que referencia un registro.
--
--  El cambio satisface el objetivo de CU-03 de manera más completa. Con una
--  lista de revocación, la credencial permanece técnicamente válida y su rechazo
--  depende de consultar la lista en cada verificación. Con sesión opaca, el
--  cierre de sesión elimina el registro y la credencial deja de existir: no hay
--  ventana ni dependencia de una consulta adicional.
--
--  Si se aplica este addendum, corresponde retirar `revoked_tokens` del esquema
--  base. La sentencia de eliminación se incluye comentada al final.
-- ----------------------------------------------------------------------------

CREATE TABLE sessions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash     VARCHAR(255) NOT NULL UNIQUE,
    user_agent     VARCHAR(300),
    ip_address     VARCHAR(45),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at     TIMESTAMPTZ NOT NULL,
    CONSTRAINT session_expiry_after_creation CHECK (expires_at > created_at)
);

CREATE INDEX idx_sessions_user    ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

-- El identificador de sesión se almacena como resumen criptográfico, nunca en
-- claro, de modo que el acceso a la base no permita suplantar sesiones activas.

-- Retirar la lista de revocación, sustituida por la tabla anterior:
-- DROP TABLE revoked_tokens;


-- ============================================================================
--  FIN DEL ADDENDUM
--
--  Resumen de incorporaciones:
--    · processed_payments      — idempotencia de notificaciones de pago
--    · uq_orders_payment_id_mp — refuerzo de unicidad sobre la orden
--    · outbox_emails           — entrega garantizada de correos
--    · stock_movements         — historial auditable de existencias
--    · sessions                — sesión opaca con estado en el servidor
--
--  Total: 4 tablas, 2 tipos enumerados, 6 índices, 2 disparadores.
-- ============================================================================
