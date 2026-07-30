-- Migración 0010 · Refactor a la nomenclatura de los CU — Etapa 1c: COMPRAS
--
-- Alcance aprobado: seis tablas (carritos, carrito_lineas, pedidos, pedido_lineas,
-- pagos_procesados, movimientos_stock). Todo con ALTER TABLE ... RENAME, para preservar el
-- kardex del Gate 1.
--
-- FUERA de esta migración, por decisión expresa:
--   · `envios` → order_tracking_events: no es un renombre sino un cambio de forma (una fila por
--     pedido con jsonb de eventos vs. una fila por evento). Se trata junto con CU-13.
--   · `estado_pedido` y la columna `estado`: el remapeo depende de la contradicción de CU-12 A3.
--     No se tocan las guardas de máquina de estados.
--   · `envio_origen`: guarda qué adaptador cotizó, no el transportista. Renombrarla a
--     `shipping_carrier` repropósitaría la columna. `shipping_carrier` será un campo nuevo con
--     CU-13. Queda atada al pase de enumeraciones por el valor `tabla_local`.
--   · `expira_en`: sin respaldo en CU-12 (la única expiración del CU es la de sesión, A4). Se
--     resuelve junto con el estado `expirado`.
--   · Las 21 enumeraciones: pase aparte, con criterio único.

-- ═══════════════════════ 1 · carritos → carts ═══════════════════════
ALTER TABLE carritos RENAME TO carts;
ALTER TABLE carts RENAME COLUMN cuenta_id               TO user_id;
ALTER TABLE carts RENAME COLUMN contexto_institucion_id TO institution_context_id;
ALTER TABLE carts RENAME COLUMN creado_en               TO created_at;
ALTER TABLE carts RENAME COLUMN actualizado_en          TO updated_at;

-- CU-24 exige un "carrito institucional (separado del carrito personal)", y CU-10 cubre
-- descuentos "tanto para compras individuales como institucionales": un encargado tiene dos
-- carritos vivos a la vez. Por eso el `carts.user_id UNIQUE` del documento de esquema no
-- aplica —rompería CU-24— y acá gana el CU.
--
-- La v1 lo resolvía con un índice funcional único sobre (cuenta_id, COALESCE(contexto, cero)).
-- Se reemplaza por la forma idiomática: unicidad compuesta + índice parcial para el carrito
-- personal, porque en PostgreSQL los NULL son distintos entre sí y el compuesto solo no
-- impediría dos carritos personales.
DROP INDEX ux_carritos_cuenta_ctx;
ALTER TABLE carts ADD CONSTRAINT carts_user_institution_uq
  UNIQUE (user_id, institution_context_id);
CREATE UNIQUE INDEX carts_personal_uq ON carts (user_id)
  WHERE institution_context_id IS NULL;

ALTER INDEX carritos_pkey RENAME TO carts_pkey;

-- ═══════════════════════ 2 · carrito_lineas → cart_items ═══════════════════════
ALTER TABLE carrito_lineas RENAME TO cart_items;
ALTER TABLE cart_items RENAME COLUMN carrito_id TO cart_id;
ALTER TABLE cart_items RENAME COLUMN juego_id   TO product_id;
ALTER TABLE cart_items RENAME COLUMN cantidad   TO quantity;
-- El documento de esquema no define `created_at` en cart_items, pero ordenar las líneas del
-- carrito es comportamiento observable en CU-10 y CU-12: se conserva y se corrige el documento.
ALTER TABLE cart_items RENAME COLUMN creado_en  TO created_at;

ALTER INDEX carrito_lineas_pkey RENAME TO cart_items_pkey;
ALTER INDEX carrito_lineas_carrito_id_juego_id_key RENAME TO cart_items_cart_product_uq;

-- ═══════════════════════ 3 · pedidos → orders ═══════════════════════
ALTER TABLE pedidos RENAME TO orders;
-- `numero` ya era NOT NULL UNIQUE: se renombra (no se agrega columna nueva, que aceptaría nulos
-- y dejaría dos identificadores legibles conviviendo).
ALTER TABLE orders RENAME COLUMN numero          TO order_number;
ALTER TABLE orders RENAME COLUMN cuenta_id       TO user_id;
ALTER TABLE orders RENAME COLUMN institucion_id  TO institution_id;
ALTER TABLE orders RENAME COLUMN carrito_id      TO cart_id;
ALTER TABLE orders RENAME COLUMN comprador_tipo  TO order_type;      -- el tipo tipo_comprador queda para el pase de enums
ALTER TABLE orders RENAME COLUMN monto_total     TO total_amount;
ALTER TABLE orders RENAME COLUMN envio_costo     TO shipping_cost;
ALTER TABLE orders RENAME COLUMN envio_modalidad TO shipping_method;
ALTER TABLE orders RENAME COLUMN creado_en       TO created_at;
ALTER TABLE orders RENAME COLUMN actualizado_en  TO updated_at;

-- domicilio_snapshot (jsonb) → cinco columnas planas, igual que en users (etapa 1a). Los
-- reportes de CU-31 y CU-33 requieren columnas consultables.
ALTER TABLE orders
  ADD COLUMN shipping_street      varchar(150),
  ADD COLUMN shipping_number      varchar(20),
  ADD COLUMN shipping_city        varchar(100),
  ADD COLUMN shipping_province    varchar(100),
  ADD COLUMN shipping_postal_code varchar(20);
UPDATE orders SET
  shipping_street      = domicilio_snapshot->>'calle',
  shipping_number      = domicilio_snapshot->>'numero',
  shipping_city        = domicilio_snapshot->>'localidad',
  shipping_province    = domicilio_snapshot->>'provincia',
  shipping_postal_code = domicilio_snapshot->>'codigo_postal';
ALTER TABLE orders DROP COLUMN domicilio_snapshot;

ALTER INDEX pedidos_pkey                     RENAME TO orders_pkey;
ALTER INDEX pedidos_numero_key               RENAME TO orders_order_number_key;
ALTER INDEX ix_pedidos_cuenta                RENAME TO idx_orders_user;
ALTER INDEX ix_pedidos_institucion           RENAME TO idx_orders_institution;
ALTER INDEX ix_pedidos_estado                RENAME TO idx_orders_status;
ALTER INDEX ux_pedidos_pendiente_por_carrito RENAME TO uq_orders_pending_per_cart;

-- ═══════════════════════ 4 · pedido_lineas → order_items ═══════════════════════
ALTER TABLE pedido_lineas RENAME TO order_items;
ALTER TABLE order_items RENAME COLUMN pedido_id                TO order_id;
ALTER TABLE order_items RENAME COLUMN juego_id                 TO product_id;
ALTER TABLE order_items RENAME COLUMN nombre_snapshot          TO product_name_snapshot;  -- addendum II
ALTER TABLE order_items RENAME COLUMN cantidad                 TO quantity;
-- El esquema ya define unit_price y discount_applied como los valores congelados de la compra:
-- el sufijo _snapshot solo corresponde al nombre del producto (addendum II).
ALTER TABLE order_items RENAME COLUMN precio_unitario_snapshot TO unit_price;
ALTER TABLE order_items RENAME COLUMN descuento_pct_snapshot   TO discount_applied;

ALTER INDEX pedido_lineas_pkey     RENAME TO order_items_pkey;
ALTER INDEX ix_pedido_lineas_pedido RENAME TO idx_order_items_order;

-- ═══════════════════════ 5 · pagos_procesados → processed_payments ═══════════════════════
ALTER TABLE pagos_procesados RENAME TO processed_payments;
ALTER TABLE processed_payments RENAME COLUMN pedido_id        TO order_id;
ALTER TABLE processed_payments RENAME COLUMN estado_mp        TO status;
-- El addendum I no define columna de monto; se conserva porque valida el monto notificado
-- contra la instantánea del pedido (evita aceptar un pago por menos del total).
ALTER TABLE processed_payments RENAME COLUMN monto_notificado TO notified_amount;
ALTER TABLE processed_payments RENAME COLUMN payload_crudo    TO raw_payload;
ALTER TABLE processed_payments RENAME COLUMN procesado_en     TO processed_at;

ALTER INDEX pagos_procesados_pkey           RENAME TO processed_payments_pkey;
ALTER INDEX pagos_procesados_payment_id_key RENAME TO processed_payments_payment_id_key;
ALTER INDEX ix_pagos_pedido                 RENAME TO idx_processed_payments_order;

-- ═══════════════════════ 6 · movimientos_stock → stock_movements ═══════════════════════
-- El documento colapsa `tipo` y `motivo` en una sola columna `reason`. El diseño real es más
-- expresivo —tipo de movimiento por un lado, motivo del ajuste por otro—: se conserva y se
-- corrige el documento. Los disparadores append-only acompañan al renombre de la tabla.
ALTER TABLE movimientos_stock RENAME TO stock_movements;
ALTER TABLE stock_movements RENAME COLUMN juego_id         TO product_id;
ALTER TABLE stock_movements RENAME COLUMN cantidad_signada TO quantity;
ALTER TABLE stock_movements RENAME COLUMN tipo             TO movement_type;
ALTER TABLE stock_movements RENAME COLUMN motivo           TO adjustment_reason;
-- `reference` se parte en order_id + actor_user_id cuando lleguen los flujos de administración
-- de CU-19: divergencia conocida con plan.
ALTER TABLE stock_movements RENAME COLUMN referencia       TO reference;
ALTER TABLE stock_movements RENAME COLUMN creado_en        TO created_at;

ALTER INDEX movimientos_stock_pkey RENAME TO stock_movements_pkey;
ALTER INDEX ix_mov_stock_juego     RENAME TO idx_stock_movements_product;
