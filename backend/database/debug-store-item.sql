-- Ver EXACTAMENTE qué valores tienen todas las columnas relevantes
SELECT 
    id,
    name,
    "isActive",
    availability,
    "availableFrom",
    "availableUntil",
    "stockLimit",
    "soldCount",
    "minLevelRequired",
    "maxPerUser",
    "requiredAchievements"
FROM store_items
WHERE name = 'Tema Nocturno';

-- Verificar si hay problemas con los tipos de datos
\d store_items
