-- Migración 0006 · Refactor a la nomenclatura del esquema — Etapa 1b: CATÁLOGO Y CONTENIDO
--
-- juegos→products, editoriales→editorial_partners, recursos→resources, favoritos→favorites,
-- + categories y game_progress. Δ2: el descuento mayorista pasa de tabla de tramos a dos
-- columnas de products (un solo tramo, CU-10/CU-22).
--
-- Columnas preservadas de la v1 que el esquema base no contempla pero las especificaciones
-- nombran (pendientes de addendum):
--   · image_url    — CU-19: "Imagen del producto (opcional, subida de archivo)".
--   · weight_grams — CU-11 A5.1: "consulta la tabla products para obtener peso y dimensiones".
--   · target_age   — sin respaldo en las especificaciones; se conserva para no degradar la
--                    ficha del catálogo hasta que se decida su retiro.

-- ═══════════════════ 1 · categories (nueva) ═══════════════════
CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(100) NOT NULL UNIQUE,
  description text
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Las áreas de la v1 pasan a ser categorías del catálogo.
INSERT INTO categories (name)
SELECT DISTINCT btrim(area) FROM juegos
 WHERE area IS NOT NULL AND btrim(area) <> ''
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════ 2 · editoriales → editorial_partners ═══════════════════
ALTER TABLE editoriales RENAME TO editorial_partners;
ALTER TABLE editorial_partners RENAME COLUMN nombre        TO name;
ALTER TABLE editorial_partners RENAME COLUMN logo_ref      TO logo_url;
ALTER TABLE editorial_partners RENAME COLUMN descripcion   TO description;
ALTER TABLE editorial_partners RENAME COLUMN sitio_externo TO external_website_url;
ALTER TABLE editorial_partners RENAME COLUMN publicado     TO is_active;
ALTER TABLE editorial_partners ADD COLUMN category varchar(100);
-- `descripcion_breve` no existe en el esquema objetivo.
ALTER TABLE editorial_partners DROP COLUMN descripcion_breve;
-- El objetivo no contempla borrado lógico: se refleja en is_active.
UPDATE editorial_partners SET is_active = false WHERE eliminado_en IS NOT NULL;
ALTER TABLE editorial_partners DROP COLUMN eliminado_en;

-- ═══════════════════ 3 · juegos → products ═══════════════════
ALTER TABLE juegos RENAME TO products;
ALTER TABLE products RENAME COLUMN nombre       TO name;
ALTER TABLE products RENAME COLUMN descripcion  TO description;
ALTER TABLE products RENAME COLUMN precio_lista TO price;
ALTER TABLE products RENAME COLUMN stock_actual TO stock;
ALTER TABLE products RENAME COLUMN publicado    TO is_active;
ALTER TABLE products RENAME COLUMN creado_en    TO created_at;
ALTER TABLE products RENAME COLUMN peso_gramos  TO weight_grams;    -- CU-11 A5.1
ALTER TABLE products RENAME COLUMN edad_objetivo TO target_age;

-- Publicado + no eliminado → is_active (el objetivo no tiene borrado lógico).
UPDATE products SET is_active = false WHERE eliminado_en IS NOT NULL;
ALTER TABLE products DROP COLUMN eliminado_en;

-- imagenes (jsonb) → image_url (CU-19 lista una imagen por producto).
ALTER TABLE products ADD COLUMN image_url varchar(500);
UPDATE products SET image_url = imagenes->>0 WHERE jsonb_array_length(COALESCE(imagenes, '[]'::jsonb)) > 0;
ALTER TABLE products DROP COLUMN imagenes;

-- area → category_id
ALTER TABLE products ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
UPDATE products p SET category_id = c.id FROM categories c WHERE btrim(p.area) = c.name;
ALTER TABLE products DROP COLUMN area;

ALTER TABLE products
  ADD COLUMN is_own_brand         boolean NOT NULL DEFAULT true,
  ADD COLUMN external_url         varchar(500),
  ADD COLUMN editorial_partner_id uuid REFERENCES editorial_partners(id) ON DELETE SET NULL,
  ADD COLUMN updated_at           timestamptz NOT NULL DEFAULT now();

-- Δ2 · descuento mayorista: un solo tramo, en columnas del producto (CU-10 RN-003/CU-22).
ALTER TABLE products
  ADD COLUMN wholesale_threshold        integer,
  ADD COLUMN wholesale_discount_percent numeric(5,2);

-- De haber varios tramos en la v1, se conserva el de menor umbral (el de entrada).
UPDATE products p
   SET wholesale_threshold = t.cantidad_minima,
       wholesale_discount_percent = t.descuento_pct
  FROM (
    SELECT DISTINCT ON (juego_id) juego_id, cantidad_minima, descuento_pct
      FROM tramos_descuento ORDER BY juego_id, cantidad_minima
  ) t
 WHERE t.juego_id = p.id;

DROP TABLE tramos_descuento;

ALTER TABLE products
  ADD CONSTRAINT wholesale_threshold_positive
    CHECK (wholesale_threshold IS NULL OR wholesale_threshold > 0),
  ADD CONSTRAINT wholesale_discount_range
    CHECK (wholesale_discount_percent IS NULL
           OR (wholesale_discount_percent >= 0 AND wholesale_discount_percent <= 100)),
  -- CU-10 RN-003 / CU-22 RN-003: umbral y porcentaje se configuran juntos
  ADD CONSTRAINT wholesale_pair_consistency CHECK (
    (wholesale_threshold IS NULL AND wholesale_discount_percent IS NULL)
    OR (wholesale_threshold IS NOT NULL AND wholesale_discount_percent IS NOT NULL)
  ),
  -- CU-19 RN-003/RN-004: los de terceros llevan URL externa; los propios no
  ADD CONSTRAINT own_brand_url_consistency CHECK (
    (is_own_brand = true AND external_url IS NULL)
    OR (is_own_brand = false AND external_url IS NOT NULL)
  );

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- El índice parcial de la v1 se apoyaba en `eliminado_en`; al retirarse esa columna, PostgreSQL
-- lo descarta. Se recrea sobre is_active, como define el esquema objetivo.
CREATE INDEX idx_products_active   ON products (is_active) WHERE is_active = true;
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_partner  ON products (editorial_partner_id);

-- Δ6 · productos_exhibidos se absorbe en products como productos de terceros.
INSERT INTO products (name, description, price, stock, is_own_brand, external_url,
                      is_active, editorial_partner_id, created_at)
SELECT pe.nombre, COALESCE(pe.descripcion, ''), 0, 0, false,
       COALESCE(ep.external_website_url, 'https://acalud.invalid/sin-url'),
       true, pe.editorial_id, pe.creado_en
  FROM productos_exhibidos pe
  LEFT JOIN editorial_partners ep ON ep.id = pe.editorial_id;
DROP TABLE productos_exhibidos;

-- ═══════════════════ 4 · demos (reestructura) ═══════════════════
-- El objetivo guarda una demo por producto con su configuración en jsonb.
ALTER TABLE demos RENAME COLUMN juego_id TO product_id;
ALTER TABLE demos ADD COLUMN config_json jsonb;
UPDATE demos SET config_json = jsonb_build_object(
  'tipo', tipo::text, 'formato', formato::text, 'contenido_ref', contenido_ref);
ALTER TABLE demos ALTER COLUMN config_json SET NOT NULL;

-- Una sola demo por producto: se conserva la pública si hubiera más de una.
DELETE FROM demos d USING demos d2
 WHERE d.product_id = d2.product_id AND d.id <> d2.id
   AND (d2.tipo = 'publica' OR (d.tipo <> 'publica' AND d2.id < d.id));
ALTER TABLE demos DROP COLUMN tipo, DROP COLUMN formato, DROP COLUMN contenido_ref;
ALTER TABLE demos RENAME COLUMN creado_en TO created_at;
ALTER TABLE demos ADD CONSTRAINT uq_demos_product UNIQUE (product_id);

-- ═══════════════════ 5 · recursos → resources ═══════════════════
ALTER TABLE recursos RENAME TO resources;
ALTER TABLE resources RENAME COLUMN juego_id    TO product_id;
ALTER TABLE resources RENAME COLUMN nombre      TO title;
ALTER TABLE resources RENAME COLUMN archivo_ref TO url;
ALTER TABLE resources RENAME COLUMN creado_en   TO created_at;

-- tipo (libre|licenciado) → is_licensed; `type` pasa a describir el formato (pdf|link).
ALTER TABLE resources ADD COLUMN is_licensed boolean NOT NULL DEFAULT false;
UPDATE resources SET is_licensed = (tipo = 'licenciado');
ALTER TABLE resources DROP COLUMN tipo;

CREATE TYPE resource_type AS ENUM ('pdf', 'link');
ALTER TABLE resources ADD COLUMN type resource_type NOT NULL DEFAULT 'pdf';
ALTER TABLE resources
  ADD COLUMN file_content        bytea,
  ADD COLUMN download_count      integer NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  ADD COLUMN promotion_starts_at timestamptz,
  ADD COLUMN promotion_ends_at   timestamptz,
  ADD CONSTRAINT promotion_range CHECK (
    (promotion_starts_at IS NULL AND promotion_ends_at IS NULL)
    OR (promotion_starts_at IS NOT NULL AND promotion_ends_at IS NOT NULL
        AND promotion_ends_at > promotion_starts_at)
  );

UPDATE resources SET is_licensed = false WHERE eliminado_en IS NOT NULL;
ALTER TABLE resources DROP COLUMN eliminado_en;

ALTER INDEX ix_recursos_juego RENAME TO idx_resources_product;
CREATE INDEX idx_resources_licensed ON resources (is_licensed);

-- ═══════════════════ 6 · favoritos → favorites (referencia polimórfica) ═══════════════════
ALTER TABLE favoritos RENAME TO favorites;
ALTER TABLE favorites RENAME COLUMN cuenta_id    TO user_id;
ALTER TABLE favorites RENAME COLUMN editorial_id TO editorial_partner_id;
ALTER TABLE favorites RENAME COLUMN creado_en    TO created_at;
ALTER TABLE favorites ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE favorites DROP CONSTRAINT favoritos_pkey;
ALTER TABLE favorites ADD PRIMARY KEY (id);
ALTER TABLE favorites
  ADD COLUMN product_id  uuid REFERENCES products(id) ON DELETE CASCADE,
  ADD COLUMN resource_id uuid REFERENCES resources(id) ON DELETE CASCADE,
  ALTER COLUMN editorial_partner_id DROP NOT NULL,
  -- D-14: exactamente una referencia no nula
  ADD CONSTRAINT favorite_exactly_one_target CHECK (
    (CASE WHEN product_id           IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN resource_id          IS NOT NULL THEN 1 ELSE 0 END)
  + (CASE WHEN editorial_partner_id IS NOT NULL THEN 1 ELSE 0 END) = 1
  );
CREATE UNIQUE INDEX uq_favorite_product  ON favorites (user_id, product_id)           WHERE product_id           IS NOT NULL;
CREATE UNIQUE INDEX uq_favorite_resource ON favorites (user_id, resource_id)          WHERE resource_id          IS NOT NULL;
CREATE UNIQUE INDEX uq_favorite_partner  ON favorites (user_id, editorial_partner_id) WHERE editorial_partner_id IS NOT NULL;

-- ═══════════════════ 7 · game_progress (nueva) ═══════════════════
CREATE TABLE game_progress (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  progress_data  jsonb NOT NULL DEFAULT '{}'::jsonb,
  best_score     integer,
  total_plays    integer NOT NULL DEFAULT 0,
  last_played_at timestamptz,
  CONSTRAINT uq_progress_user_product UNIQUE (user_id, product_id)
);
CREATE INDEX idx_progress_user ON game_progress (user_id);
ALTER TABLE game_progress ENABLE ROW LEVEL SECURITY;
