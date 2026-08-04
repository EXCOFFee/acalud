-- ════════════════════════════════════════════════════════════════════════════
--  0019 · orders.billing_data                                            (CU-24)
-- ════════════════════════════════════════════════════════════════════════════
-- CU-24 RN-007: "Las facturas deben emitirse a nombre de la institución, no del encargado
-- individual." No existía ninguna columna para esto (gap D8 del backlog post-frontend). Se llena
-- solo para order_type = 'b2b' (razón social + CUIT de la institución, tomados de `institutions`
-- en el momento del checkout); queda null en las órdenes b2c. Sin CHECK de coherencia con
-- order_type: es trazabilidad, no una invariante de negocio (mismo criterio que
-- payment_preference_id/payment_id_mp en la 0018).

ALTER TABLE orders ADD COLUMN billing_data jsonb;
