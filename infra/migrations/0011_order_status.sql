-- Migración 0011 · estado_pedido → order_status (Tarea 2)
--
-- Decisión sobre la contradicción de CU-12 A3: un pago rechazado deja el pedido en `pending`,
-- reintentable —es lo que describe el cuerpo del CU y lo que hace Mercado Pago: un rechazo no
-- mata la orden—. `cancelled` queda para la cancelación explícita. En consecuencia el tipo
-- pasa a tener seis valores y se retiran `rechazado`, `expirado` y `en_preparacion`.
--
-- Verificado antes de ejecutar: cero filas en cualquier estado, y ningún archivo de apps/ lee
-- ni escribe `expira_en` (todos los `expiraEn` del código son de sesiones y testigos, otra cosa).

-- PostgreSQL no permite quitar valores de un ENUM: se crea el tipo nuevo y se migra la columna.
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'under_review');

-- El índice parcial y el valor por defecto dependen del tipo viejo: se retiran y se rehacen.
DROP INDEX uq_orders_pending_per_cart;
ALTER TABLE orders ALTER COLUMN estado DROP DEFAULT;

ALTER TABLE orders RENAME COLUMN estado TO status;
ALTER TABLE orders
  ALTER COLUMN status TYPE order_status
  USING (CASE status::text
    WHEN 'pendiente_pago'  THEN 'pending'
    WHEN 'pagado'          THEN 'paid'
    WHEN 'despachado'      THEN 'shipped'
    WHEN 'entregado'       THEN 'delivered'
    WHEN 'cancelado'       THEN 'cancelled'
    WHEN 'en_revision'     THEN 'under_review'
    -- Los tres que se retiran. No hay filas; el mapeo queda por si acaso:
    WHEN 'rechazado'       THEN 'pending'    -- el rechazo deja el pedido reintentable
    WHEN 'expirado'        THEN 'cancelled'
    WHEN 'en_preparacion'  THEN 'paid'
  END)::order_status;

ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';

DROP TYPE estado_pedido;

-- Idempotencia por pedido (CU-12): un solo pedido pendiente de pago por carrito-origen. El
-- nombre se conserva porque el código lo compara de forma exacta (ver nombres en el adapter).
CREATE UNIQUE INDEX uq_orders_pending_per_cart
  ON orders (cart_id) WHERE status = 'pending' AND cart_id IS NOT NULL;

-- `expira_en` no tiene respaldo en ningún CU —la única expiración de CU-12 es la de sesión
-- (A4)— y estaba atada al estado `expirado`, que se retira. Nadie la lee ni la escribe.
ALTER TABLE orders DROP COLUMN expira_en;
