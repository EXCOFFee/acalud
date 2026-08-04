-- ════════════════════════════════════════════════════════════════════════════
--  0018 · orders.payment_preference_id / payment_id_mp                   (CU-12)
-- ════════════════════════════════════════════════════════════════════════════
-- CU-12 (poscondiciones): "Se genera una preferencia de pago en Mercado Pago..." y "Si el pago
-- es exitoso, la orden cambia a estado paid y se guarda el payment_id_mp". docs/02-base-datos
-- (esquema aspiracional) ya documentaba estas dos columnas, pero nunca se migraron de verdad —
-- la idempotencia del webhook ya está cubierta por processed_payments.payment_id (UNIQUE), así
-- que esto es trazabilidad (CU-12 paso 14 / poscondición), no una invariante de negocio.

ALTER TABLE orders ADD COLUMN payment_preference_id text;
ALTER TABLE orders ADD COLUMN payment_id_mp text;

-- Un mismo pago de Mercado Pago no puede terminar asociado a dos órdenes distintas.
CREATE UNIQUE INDEX uq_orders_payment_id_mp ON orders (payment_id_mp) WHERE payment_id_mp IS NOT NULL;
