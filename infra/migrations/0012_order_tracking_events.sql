-- Migración 0012 · envios → order_tracking_events (Tarea 3)
--
-- No es un renombre sino un cambio de forma: `envios` guarda una fila por pedido con un jsonb
-- de eventos; el esquema define una fila POR EVENTO, y el código de seguimiento viviendo en
-- `orders.tracking_code`.
--
-- Verificado antes de ejecutar: la tabla `envios` tiene cero filas en producción y ningún
-- archivo de apps/ la consulta (CU-13 sin implementar), así que no hay migración de datos. Las
-- coincidencias de `numero_tracking` en el código son el parámetro del puerto de tracking, no
-- la tabla.

-- El número de seguimiento pasa a la orden (CU-13 lo consulta desde ahí).
ALTER TABLE orders ADD COLUMN tracking_code varchar(100);

-- `envio_origen` guarda qué adaptador cotizó el envío, no el transportista: se nombra por lo
-- que es. `shipping_carrier` es un campo distinto, que entra cuando se implemente CU-13.
ALTER TABLE orders RENAME COLUMN envio_origen TO shipping_quote_source;

DROP TABLE envios;

-- Una fila por evento de seguimiento (CU-13).
CREATE TABLE order_tracking_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      varchar(50) NOT NULL,
  location    varchar(200),
  description text,
  event_date  timestamptz,
  fetched_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tracking_order ON order_tracking_events (order_id);
ALTER TABLE order_tracking_events ENABLE ROW LEVEL SECURITY;
