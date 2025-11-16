-- Otorgar 1000 monedas al estudiante demo
UPDATE users 
SET coins = 1000 
WHERE id = 'c42d0c61-ba38-41cd-a8de-eb8552a455ee';

-- Verificar
SELECT name, email, coins, level, experience, role
FROM users
WHERE role = 'student'
LIMIT 5;
