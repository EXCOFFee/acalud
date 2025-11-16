-- Verificar y actualizar items de tienda para que estén disponibles
UPDATE store_items SET "isActive" = true WHERE "isActive" IS NULL OR "isActive" = false;

-- Verificar items
SELECT id, name, price, "isActive", "stockLimit", "soldCount" FROM store_items;
