INSERT INTO store_items (name, description, type, rarity, price, "imageUrl", "isActive", tags) 
VALUES 
    ('Avatar Cientifico', 'Un avatar con bata de laboratorio y gafas de seguridad', 'avatar', 'common', 100, 'https://via.placeholder.com/150/4A90E2/FFFFFF?text=Avatar', true, ARRAY['avatar', 'ciencia']),
    ('Marco Dorado', 'Un elegante marco dorado para tu perfil', 'frame', 'rare', 250, 'https://via.placeholder.com/150/FFD700/000000?text=Marco', true, ARRAY['frame', 'premium']),
    ('Tema Nocturno', 'Un tema oscuro para la interfaz', 'theme', 'uncommon', 150, 'https://via.placeholder.com/150/2C3E50/FFFFFF?text=Tema', true, ARRAY['theme', 'dark']),
    ('Emote Celebracion', 'Emoji de celebracion animado', 'emote', 'common', 50, 'https://via.placeholder.com/150/F39C12/FFFFFF?text=Emote', true, ARRAY['emote', 'animado']),
    ('Fondo Espacial', 'Fondo con estrellas y planetas', 'avatar_background', 'epic', 500, 'https://via.placeholder.com/150/34495E/FFFFFF?text=Fondo', true, ARRAY['fondo', 'espacio'])
ON CONFLICT DO NOTHING;
