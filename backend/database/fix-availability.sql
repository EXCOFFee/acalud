-- Verificar columnas de disponibilidad de items
SELECT id, name, "isActive", availability, "availableFrom", "availableUntil" 
FROM store_items 
LIMIT 5;

-- Actualizar availability a 'available' para todos los items
UPDATE store_items 
SET availability = 'available' 
WHERE availability IS NULL OR availability NOT IN ('available', 'limited_time', 'seasonal', 'event_exclusive');

-- Verificar después de actualizar
SELECT id, name, "isActive", availability 
FROM store_items;
