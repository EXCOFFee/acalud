-- Migración 0007 · Addendum IV (parte de catálogo) + retiro de target_age
--
-- El addendum IV incorpora atributos que las especificaciones nombran de manera expresa y que
-- el esquema base omitió. `image_url` y `weight_grams` ya se habían preservado en la migración
-- 0006 (venían de la v1); acá se completan sus restricciones y se agregan las dimensiones.
--
-- La parte del addendum IV que toca `institutions` (phone, level_id, student_count) se aplica
-- en la etapa institucional, cuando esa tabla se renombre desde `instituciones`.

-- ─────────── Peso y dimensiones (CU-11 A5.1/RN-002; admiten nulo por el flujo A5) ───────────
-- En la v1 el peso era obligatorio con valor inicial 0. El addendum lo modela como opcional y
-- positivo: la ausencia de dato se representa con nulo, que es lo que contempla el flujo A5
-- ("algunos productos no tienen peso o dimensiones registradas" → valores predeterminados).
-- Un peso de 0 gramos no es un dato válido, así que se convierte en ausencia.
ALTER TABLE products ALTER COLUMN weight_grams DROP NOT NULL;
ALTER TABLE products ALTER COLUMN weight_grams DROP DEFAULT;
UPDATE products SET weight_grams = NULL WHERE weight_grams = 0;

ALTER TABLE products
  ADD CONSTRAINT weight_grams_positive CHECK (weight_grams IS NULL OR weight_grams > 0),
  ADD COLUMN length_cm integer CHECK (length_cm IS NULL OR length_cm > 0),
  ADD COLUMN width_cm  integer CHECK (width_cm  IS NULL OR width_cm  > 0),
  ADD COLUMN height_cm integer CHECK (height_cm IS NULL OR height_cm > 0);

-- ─────────── Retiro de target_age ───────────
-- Ninguna especificación lo requiere: CU-19 enumera de manera cerrada los campos del alta de
-- producto (título, descripción, precio, existencias, categoría, marca, descuento mayorista e
-- imagen) sin incluirlo. La segmentación pedagógica, de requerirse, dispone de `levels`.
ALTER TABLE products DROP COLUMN target_age;
