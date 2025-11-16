-- Verificar estado de items y otorgar monedas
SELECT id, name, price, "isActive" FROM store_items ORDER BY price ASC;

-- Otorgar 1000 monedas al demo_estudiante
UPDATE user_inventory 
SET coins = 1000 
WHERE "userId" = (SELECT id FROM users WHERE username = 'demo_estudiante');

-- Verificar monedas actualizadas
SELECT u.username, ui.coins, ui.gems 
FROM user_inventory ui 
JOIN users u ON ui."userId" = u.id 
WHERE u.username = 'demo_estudiante';
