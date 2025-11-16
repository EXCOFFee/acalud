-- Verificar todas las columnas importantes de store_items
SELECT 
    id, 
    name, 
    "isActive", 
    availability, 
    "minLevelRequired", 
    "maxPerUser",
    "stockLimit",
    "soldCount"
FROM store_items;

-- Asegurarnos de que minLevelRequired sea 1 (o 0) para permitir compras
UPDATE store_items 
SET "minLevelRequired" = 1
WHERE "minLevelRequired" IS NULL OR "minLevelRequired" > 3;

-- Verificar el nivel del usuario
SELECT id, name, level, coins FROM users WHERE email = 'student@demo.com';
