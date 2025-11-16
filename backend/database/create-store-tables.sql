-- ============================================================================
-- CREACIÓN DE TABLAS DE TIENDA - ACALUD
-- ============================================================================
-- Script para crear todas las tablas relacionadas con el sistema de tienda

-- Conectar a la base de datos
\c acalud_db;

-- ============================================================================
-- 🏪 TABLA: store_items
-- Catálogo de elementos disponibles en la tienda
-- ============================================================================
CREATE TABLE IF NOT EXISTS store_items (
    -- Identificador único
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Información básica del elemento
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    
    -- Categorización
    type VARCHAR(50) NOT NULL DEFAULT 'other',
    rarity VARCHAR(50) NOT NULL DEFAULT 'common',
    availability VARCHAR(50) NOT NULL DEFAULT 'available',
    
    -- Precio y economía
    price INTEGER NOT NULL DEFAULT 100,
    discount_percentage INTEGER DEFAULT 0,
    final_price INTEGER,
    
    -- Visual y preview
    image_url VARCHAR(500),
    preview_url VARCHAR(500),
    icon_url VARCHAR(500),
    
    -- Metadatos
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    
    -- Control de disponibilidad
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    is_popular BOOLEAN DEFAULT false,
    
    -- Límites y requisitos
    stock INTEGER DEFAULT -1,  -- -1 = ilimitado
    max_purchases_per_user INTEGER DEFAULT -1,  -- -1 = ilimitado
    required_level INTEGER DEFAULT 1,
    required_achievements TEXT[],
    
    -- Temporalidad
    available_from TIMESTAMP,
    available_until TIMESTAMP,
    
    -- Estadísticas
    purchase_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT price_positive CHECK (price >= 0),
    CONSTRAINT discount_valid CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    CONSTRAINT stock_valid CHECK (stock >= -1),
    CONSTRAINT required_level_positive CHECK (required_level >= 1)
);

-- Índices para mejorar rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_store_items_type_availability ON store_items(type, availability);
CREATE INDEX IF NOT EXISTS idx_store_items_rarity_price ON store_items(rarity, price);
CREATE INDEX IF NOT EXISTS idx_store_items_active_availability ON store_items(is_active, availability);
CREATE INDEX IF NOT EXISTS idx_store_items_created_at ON store_items(created_at);
CREATE INDEX IF NOT EXISTS idx_store_items_featured ON store_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_store_items_new ON store_items(is_new) WHERE is_new = true;

-- ============================================================================
-- 💰 TABLA: user_purchases
-- Registro de compras realizadas por usuarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_purchases (
    -- Identificador único
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    user_id UUID NOT NULL,
    store_item_id UUID NOT NULL,
    
    -- Información de la compra
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price_paid INTEGER NOT NULL,
    currency_type VARCHAR(50) DEFAULT 'coins',
    
    -- Estado de la compra
    purchase_status VARCHAR(50) DEFAULT 'completed',
    
    -- Referencias a transacciones
    transaction_id UUID,
    refund_id UUID,
    
    -- Metadatos
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_user_purchases_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_purchases_store_item FOREIGN KEY (store_item_id) REFERENCES store_items(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT price_paid_positive CHECK (price_paid >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_store_item_id ON user_purchases(store_item_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_status ON user_purchases(store_item_id, purchase_status);
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_item ON user_purchases(user_id, store_item_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_date ON user_purchases(purchase_date DESC);

-- ============================================================================
-- 🎮 TABLA: user_inventory
-- Inventario de elementos que posee cada usuario
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_inventory (
    -- Identificador único
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    user_id UUID NOT NULL,
    
    -- Información del item
    item_id VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    item_rarity VARCHAR(50) DEFAULT 'common',
    
    -- Estado
    is_equipped BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    
    -- Origen
    acquired_from VARCHAR(100) DEFAULT 'store',
    acquired_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadatos
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_user_inventory_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraint: un usuario no puede tener el mismo item duplicado
    CONSTRAINT unique_user_item UNIQUE (user_id, item_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_inventory_user_id ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_item_id ON user_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_equipped ON user_inventory(user_id, is_equipped) WHERE is_equipped = true;
CREATE INDEX IF NOT EXISTS idx_user_inventory_type ON user_inventory(user_id, item_type);

-- ============================================================================
-- 💎 TABLA: virtual_currency_transactions
-- Registro de todas las transacciones de moneda virtual
-- ============================================================================
CREATE TABLE IF NOT EXISTS virtual_currency_transactions (
    -- Identificador único
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencias
    user_id UUID NOT NULL,
    
    -- Información de la transacción
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,  -- 'earned', 'spent', 'bonus', 'refund'
    source VARCHAR(100) NOT NULL,  -- 'activity_completion', 'store_purchase', 'daily_login', etc.
    
    -- Descripción
    description TEXT,
    
    -- Referencias relacionadas
    related_entity_id UUID,  -- ID de actividad, compra, etc.
    related_entity_type VARCHAR(50),  -- 'activity', 'purchase', etc.
    
    -- Balance resultante
    balance_after INTEGER NOT NULL,
    
    -- Metadatos
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_currency_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT balance_after_non_negative CHECK (balance_after >= 0)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_currency_transactions_user_id ON virtual_currency_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_currency_transactions_type ON virtual_currency_transactions(user_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_currency_transactions_date ON virtual_currency_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_currency_transactions_source ON virtual_currency_transactions(source);

-- ============================================================================
-- TRIGGERS para actualizar updated_at automáticamente
-- ============================================================================

-- Trigger para store_items
CREATE TRIGGER update_store_items_updated_at
    BEFORE UPDATE ON store_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_purchases
CREATE TRIGGER update_user_purchases_updated_at
    BEFORE UPDATE ON user_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_inventory
CREATE TRIGGER update_user_inventory_updated_at
    BEFORE UPDATE ON user_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATOS INICIALES DE PRUEBA (5 items básicos)
-- ============================================================================
INSERT INTO store_items (name, description, type, rarity, price, image_url, is_active, tags)
VALUES
    ('Avatar Científico', 'Un avatar con bata de laboratorio y gafas de seguridad', 'avatar', 'common', 100, 'https://via.placeholder.com/150', true, ARRAY['avatar', 'ciencia']),
    ('Marco Dorado', 'Un elegante marco dorado para tu perfil', 'frame', 'rare', 250, 'https://via.placeholder.com/150', true, ARRAY['frame', 'premium']),
    ('Tema Nocturno', 'Un tema oscuro para la interfaz', 'theme', 'uncommon', 150, 'https://via.placeholder.com/150', true, ARRAY['theme', 'dark']),
    ('Emote Celebración', 'Emoji de celebración animado', 'emote', 'common', 50, 'https://via.placeholder.com/150', true, ARRAY['emote', 'animado']),
    ('Fondo Espacial', 'Fondo con estrellas y planetas', 'avatar_background', 'epic', 500, 'https://via.placeholder.com/150', true, ARRAY['fondo', 'espacio'])
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MENSAJE DE CONFIRMACIÓN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Tablas de tienda creadas correctamente:';
    RAISE NOTICE '   - store_items';
    RAISE NOTICE '   - user_purchases';
    RAISE NOTICE '   - user_inventory';
    RAISE NOTICE '   - virtual_currency_transactions';
    RAISE NOTICE '📦 5 items de prueba insertados en store_items';
END $$;
