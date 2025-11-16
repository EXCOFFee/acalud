-- ============================================================================
-- CREACIÓN DE TABLAS DE TIENDA CON NOMBRES CORRECTOS PARA TYPEORM
-- ============================================================================

-- Conectar a la base de datos
\c acalud_db;

-- ============================================================================
-- 🏪 TABLA: store_items (con nombres en camelCase que TypeORM espera)
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Información básica
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    
    -- Categorización
    type VARCHAR(50) NOT NULL DEFAULT 'other',
    rarity VARCHAR(50) NOT NULL DEFAULT 'common',
    availability VARCHAR(50) NOT NULL DEFAULT 'available',
    
    -- Precios (camelCase según TypeORM entity)
    price INTEGER NOT NULL DEFAULT 100,
    "originalPrice" INTEGER,
    "discountPercentage" INTEGER DEFAULT 0,
    
    -- URLs de imágenes (camelCase)
    "imageUrl" VARCHAR(500),
    "additionalImages" TEXT[],
    
    -- Datos del item (camelCase)
    "itemData" JSONB DEFAULT '{}',
    
    -- Tags y metadatos
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Estado del item (camelCase)
    "isActive" BOOLEAN DEFAULT true,
    "isFeatured" BOOLEAN DEFAULT false,
    "isOnSale" BOOLEAN DEFAULT false,
    
    -- Límites y requisitos (camelCase)
    "stockLimit" INTEGER DEFAULT -1,
    "soldCount" INTEGER DEFAULT 0,
    "maxPerUser" INTEGER DEFAULT -1,
    "minLevelRequired" INTEGER DEFAULT 1,
    "requiredAchievements" TEXT[],
    
    -- Temporalidad (camelCase)
    "availableFrom" TIMESTAMP,
    "availableUntil" TIMESTAMP,
    
    -- Orden de visualización (camelCase)
    "displayOrder" INTEGER DEFAULT 0,
    
    -- Timestamps (camelCase)
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT price_positive CHECK (price >= 0),
    CONSTRAINT discount_valid CHECK ("discountPercentage" >= 0 AND "discountPercentage" <= 100),
    CONSTRAINT stock_valid CHECK ("stockLimit" >= -1)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_store_items_type_availability ON store_items(type, availability);
CREATE INDEX IF NOT EXISTS idx_store_items_rarity_price ON store_items(rarity, price);
CREATE INDEX IF NOT EXISTS idx_store_items_active ON store_items("isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_store_items_featured ON store_items("isFeatured") WHERE "isFeatured" = true;

-- ============================================================================
-- 💰 TABLA: user_purchases (con nombres camelCase)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias (camelCase)
    "userId" UUID NOT NULL,
    "storeItemId" UUID NOT NULL,
    
    -- Información de compra (camelCase)
    "purchaseDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "pricePaid" INTEGER NOT NULL,
    "currencyType" VARCHAR(50) DEFAULT 'coins',
    "purchaseStatus" VARCHAR(50) DEFAULT 'completed',
    
    -- Metadatos
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps (camelCase)
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_user_purchases_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_purchases_store_item FOREIGN KEY ("storeItemId") REFERENCES store_items(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT price_paid_positive CHECK ("pricePaid" >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON user_purchases("userId");
CREATE INDEX IF NOT EXISTS idx_user_purchases_item ON user_purchases("storeItemId");
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_item ON user_purchases("userId", "storeItemId");

-- ============================================================================
-- 📦 INSERTAR 5 ITEMS DE PRUEBA
-- ============================================================================
INSERT INTO store_items (name, description, type, rarity, price, "imageUrl", "isActive", tags)
VALUES
    ('Avatar Científico', 'Un avatar con bata de laboratorio y gafas de seguridad', 'avatar', 'common', 100, 'https://via.placeholder.com/150/4A90E2/FFFFFF?text=🧪', true, ARRAY['avatar', 'ciencia']),
    ('Marco Dorado', 'Un elegante marco dorado para tu perfil', 'frame', 'rare', 250, 'https://via.placeholder.com/150/FFD700/000000?text=🖼️', true, ARRAY['frame', 'premium']),
    ('Tema Nocturno', 'Un tema oscuro para la interfaz', 'theme', 'uncommon', 150, 'https://via.placeholder.com/150/2C3E50/FFFFFF?text=🌙', true, ARRAY['theme', 'dark']),
    ('Emote Celebración', 'Emoji de celebración animado', 'emote', 'common', 50, 'https://via.placeholder.com/150/F39C12/FFFFFF?text=🎉', true, ARRAY['emote', 'animado']),
    ('Fondo Espacial', 'Fondo con estrellas y planetas', 'avatar_background', 'epic', 500, 'https://via.placeholder.com/150/34495E/FFFFFF?text=🌌', true, ARRAY['fondo', 'espacio'])
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MENSAJE DE CONFIRMACIÓN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Tablas creadas con nombres camelCase correctos';
    RAISE NOTICE '📦 5 items insertados en store_items';
    RAISE NOTICE '🎮 Listo para probar en http://localhost:5173/store';
END $$;
