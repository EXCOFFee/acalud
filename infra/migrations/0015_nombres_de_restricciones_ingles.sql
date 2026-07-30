-- Migración 0015 · Nombres de restricciones e índices al inglés
--
-- PostgreSQL NO renombra las restricciones ni los índices cuando se renombra la tabla o la
-- columna que los origina: conservan el nombre que tenían al crearse. Por eso, después de las
-- etapas 1a-1e, la base seguía teniendo 58 restricciones y 8 índices con nombres en español
-- colgando de tablas ya traducidas (`cart_items :: carrito_lineas_juego_id_fkey`).
--
-- No es cosmético. La Tarea 0 de la ronda anterior mostró que el nombre de una restricción es
-- una interfaz: `unidad-de-trabajo.pg.ts` compara `err.constraint` contra
-- `uq_orders_pending_per_cart` para distinguir un 409 de un 500. Un juego de nombres mitad en
-- español y mitad en inglés es exactamente el terreno donde ese acoplamiento se rompe callado.
--
-- Esta migración no toca datos, ni columnas, ni comportamiento: sólo nombres.

-- ─────────── Identidad ───────────
ALTER TABLE users        RENAME CONSTRAINT cuentas_pkey          TO users_pkey;
ALTER TABLE sessions     RENAME CONSTRAINT sesiones_pkey         TO sessions_pkey;
ALTER TABLE sessions     RENAME CONSTRAINT sesiones_cuenta_id_fkey  TO sessions_user_id_fkey;
ALTER TABLE sessions     RENAME CONSTRAINT sesiones_token_hash_key  TO sessions_token_hash_key;
ALTER TABLE user_tokens  RENAME CONSTRAINT tokens_de_uso_pkey       TO user_tokens_pkey;
ALTER TABLE user_tokens  RENAME CONSTRAINT tokens_de_uso_cuenta_id_fkey TO user_tokens_user_id_fkey;

-- ─────────── Catálogo ───────────
ALTER TABLE products RENAME CONSTRAINT juegos_pkey                TO products_pkey;
ALTER TABLE products RENAME CONSTRAINT juegos_precio_lista_check  TO products_price_check;
ALTER TABLE products RENAME CONSTRAINT juegos_stock_actual_check  TO products_stock_check;
ALTER TABLE products RENAME CONSTRAINT juegos_peso_gramos_check   TO products_weight_grams_check;

ALTER TABLE editorial_partners RENAME CONSTRAINT editoriales_pkey TO editorial_partners_pkey;

ALTER TABLE resources RENAME CONSTRAINT recursos_pkey          TO resources_pkey;
ALTER TABLE resources RENAME CONSTRAINT recursos_juego_id_fkey TO resources_product_id_fkey;

ALTER TABLE demos RENAME CONSTRAINT demos_juego_id_fkey TO demos_product_id_fkey;

ALTER TABLE favorites RENAME CONSTRAINT favoritos_cuenta_id_fkey    TO favorites_user_id_fkey;
ALTER TABLE favorites RENAME CONSTRAINT favoritos_editorial_id_fkey TO favorites_editorial_partner_id_fkey;

ALTER TABLE downloads RENAME CONSTRAINT descargas_pkey            TO downloads_pkey;
ALTER TABLE downloads RENAME CONSTRAINT descargas_cuenta_id_fkey  TO downloads_user_id_fkey;
ALTER TABLE downloads RENAME CONSTRAINT descargas_recurso_id_fkey TO downloads_resource_id_fkey;

-- ─────────── Compras y logística ───────────
ALTER TABLE carts RENAME CONSTRAINT carritos_cuenta_id_fkey                TO carts_user_id_fkey;
ALTER TABLE carts RENAME CONSTRAINT carritos_contexto_institucion_id_fkey  TO carts_institution_context_id_fkey;

ALTER TABLE cart_items RENAME CONSTRAINT carrito_lineas_carrito_id_fkey TO cart_items_cart_id_fkey;
ALTER TABLE cart_items RENAME CONSTRAINT carrito_lineas_juego_id_fkey   TO cart_items_product_id_fkey;
ALTER TABLE cart_items RENAME CONSTRAINT carrito_lineas_cantidad_check  TO cart_items_quantity_check;

ALTER TABLE orders RENAME CONSTRAINT pedidos_cuenta_id_fkey      TO orders_user_id_fkey;
ALTER TABLE orders RENAME CONSTRAINT pedidos_carrito_id_fkey     TO orders_cart_id_fkey;
ALTER TABLE orders RENAME CONSTRAINT pedidos_institucion_id_fkey TO orders_institution_id_fkey;
ALTER TABLE orders RENAME CONSTRAINT pedidos_monto_total_check   TO orders_total_amount_check;
ALTER TABLE orders RENAME CONSTRAINT pedidos_envio_costo_check   TO orders_shipping_cost_check;
-- Coherencia b2c/b2b de la orden (el CHECK que ata order_type con institution_id).
ALTER TABLE orders RENAME CONSTRAINT ck_pedidos_comprador        TO ck_orders_buyer_coherence;

ALTER TABLE order_items RENAME CONSTRAINT pedido_lineas_pedido_id_fkey TO order_items_order_id_fkey;
ALTER TABLE order_items RENAME CONSTRAINT pedido_lineas_juego_id_fkey  TO order_items_product_id_fkey;
ALTER TABLE order_items RENAME CONSTRAINT pedido_lineas_cantidad_check TO order_items_quantity_check;
ALTER TABLE order_items
  RENAME CONSTRAINT pedido_lineas_precio_unitario_snapshot_check TO order_items_unit_price_check;
ALTER TABLE order_items
  RENAME CONSTRAINT pedido_lineas_descuento_pct_snapshot_check   TO order_items_discount_percent_check;

ALTER TABLE processed_payments
  RENAME CONSTRAINT pagos_procesados_pedido_id_fkey TO processed_payments_order_id_fkey;

ALTER TABLE stock_movements RENAME CONSTRAINT movimientos_stock_juego_id_fkey TO stock_movements_product_id_fkey;
ALTER TABLE stock_movements
  RENAME CONSTRAINT movimientos_stock_cantidad_signada_check TO stock_movements_signed_quantity_check;

-- ─────────── Institucional (etapa 1e) ───────────
ALTER TABLE institutions RENAME CONSTRAINT instituciones_pkey TO institutions_pkey;

ALTER TABLE institutional_teachers RENAME CONSTRAINT membresias_pkey TO institutional_teachers_pkey;
ALTER TABLE institutional_teachers
  RENAME CONSTRAINT membresias_institucion_id_fkey TO institutional_teachers_institution_id_fkey;
ALTER TABLE institutional_teachers
  RENAME CONSTRAINT membresias_cuenta_id_fkey      TO institutional_teachers_user_id_fkey;

ALTER TABLE institutional_inventories
  RENAME CONSTRAINT catalogo_institucional_pkey TO institutional_inventories_pkey;
ALTER TABLE institutional_inventories
  RENAME CONSTRAINT catalogo_institucional_institucion_id_fkey TO institutional_inventories_institution_id_fkey;
ALTER TABLE institutional_inventories
  RENAME CONSTRAINT catalogo_institucional_juego_id_fkey       TO institutional_inventories_product_id_fkey;
-- Unicidad (institución, producto) que ya traía la v1; convive con uq_institution_product.
ALTER TABLE institutional_inventories
  RENAME CONSTRAINT catalogo_institucional_institucion_id_juego_id_key TO institutional_inventories_institution_product_key;

ALTER TABLE game_sessions RENAME CONSTRAINT sesiones_uso_pkey            TO game_sessions_pkey;
ALTER TABLE game_sessions RENAME CONSTRAINT sesiones_uso_membresia_id_fkey TO game_sessions_teacher_id_fkey;
ALTER TABLE game_sessions RENAME CONSTRAINT sesiones_uso_juego_id_fkey     TO game_sessions_product_id_fkey;
-- Cotas de la v1 (PI-05), más estrictas que CU-29 RN-003. Se conservan; ver informe.
ALTER TABLE game_sessions
  RENAME CONSTRAINT sesiones_uso_cantidad_alumnos_check TO game_sessions_student_count_check;
ALTER TABLE game_sessions
  RENAME CONSTRAINT sesiones_uso_duracion_min_check     TO game_sessions_duration_minutes_check;

-- ─────────── Comunidad (etapa 1e) ───────────
ALTER TABLE polls     RENAME CONSTRAINT encuestas_pkey            TO polls_pkey;
ALTER TABLE proposals RENAME CONSTRAINT propuestas_pkey           TO proposals_pkey;
ALTER TABLE proposals RENAME CONSTRAINT propuestas_cuenta_id_fkey TO proposals_user_id_fkey;
ALTER TABLE proposals RENAME CONSTRAINT propuestas_numero_key     TO proposals_number_key;

-- ─────────── Plataforma (etapa 1e) ───────────
ALTER TABLE audit_log RENAME CONSTRAINT eventos_auditoria_pkey TO audit_log_pkey;

-- ─────────── Índices sueltos (no respaldan una restricción) ───────────
ALTER INDEX ix_auditoria_sujeto        RENAME TO idx_audit_entity;
ALTER INDEX ix_membresias_cuenta       RENAME TO idx_institutional_teachers_user;
ALTER INDEX ix_outbox_pendiente        RENAME TO idx_outbox_unsent;
ALTER INDEX ix_propuestas_cuenta       RENAME TO idx_proposals_user;
ALTER INDEX ix_sesiones_uso_juego      RENAME TO idx_game_sessions_product;
ALTER INDEX ix_sesiones_uso_membresia  RENAME TO idx_game_sessions_teacher;
-- Unicidad parcial del CUIT entre instituciones activas (v1). Queda subsumida por el UNIQUE
-- total que exige CU-23 RN-001 y que agregó la 0014; se reporta como redundante.
ALTER INDEX ux_instituciones_cuit_activa RENAME TO uq_institutions_tax_id_active;
-- Un mismo correo no se invita dos veces a la misma institución mientras el vínculo esté
-- vigente (CU-23 A12.7: "verifica que el correo no corresponda a un usuario ya vinculado").
ALTER INDEX ux_membresias_vigente        RENAME TO uq_institutional_teachers_active_email;

-- ─────────── Dos rezagos que encontró el barrido final ───────────
-- Se escapó en la etapa 1b: es la única columna del esquema que seguía en español.
ALTER TABLE editorial_partners RENAME COLUMN creado_en TO created_at;

-- La enumeración de nivel educativo quedó huérfana en la 0014, cuando `institutions` pasó a
-- referenciar la tabla maestra `levels` (addendum IV). Se traduce para no dejar nada en español;
-- su retiro va a la lista de huérfanas del informe, no se decide acá.
ALTER TYPE nivel_educativo RENAME TO education_level;
