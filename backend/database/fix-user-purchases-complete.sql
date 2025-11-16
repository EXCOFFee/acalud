-- ============================================================================
-- ARREGLO COMPLETO DE LA TABLA user_purchases
-- Agrega TODAS las columnas faltantes que TypeORM espera
-- ============================================================================

\c acalud_db;

-- Eliminar tabla vieja y recrear con estructura correcta
DROP TABLE IF EXISTS user_purchases CASCADE;

-- Recrear tabla con TODAS las columnas
CREATE TABLE user_purchases (
    -- IDs principales
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,
    "storeItemId" UUID NOT NULL,
    
    -- Estado de la compra
    "purchaseStatus" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "paymentMethod" VARCHAR(50) NOT NULL DEFAULT 'coins',
    
    -- Información de precio
    "pricePaid" INTEGER NOT NULL,
    "originalPriceAtPurchase" INTEGER NOT NULL,
    "discountApplied" INTEGER DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    
    -- Estado de equipamiento
    "isEquipped" BOOLEAN DEFAULT false,
    "equippedAt" TIMESTAMP,
    
    -- Datos adicionales
    "purchaseData" JSONB,
    "transactionId" VARCHAR(100),
    notes TEXT,
    
    -- Sistema de regalos
    "isGift" BOOLEAN DEFAULT false,
    "giftFromUserId" UUID,
    "giftMessage" TEXT,
    
    -- Vencimiento
    "expiresAt" TIMESTAMP,
    
    -- Timestamps
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_user_purchases_user 
        FOREIGN KEY ("userId") 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_user_purchases_store_item 
        FOREIGN KEY ("storeItemId") 
        REFERENCES store_items(id) 
        ON DELETE RESTRICT,
    
    CONSTRAINT fk_user_purchases_gift_from 
        FOREIGN KEY ("giftFromUserId") 
        REFERENCES users(id) 
        ON DELETE SET NULL
);

-- Índices para performance
CREATE INDEX idx_user_purchases_user_status ON user_purchases("userId", "purchaseStatus");
CREATE INDEX idx_user_purchases_item_status ON user_purchases("storeItemId", "purchaseStatus");
CREATE INDEX idx_user_purchases_created ON user_purchases("createdAt");
CREATE INDEX idx_user_purchases_user_item ON user_purchases("userId", "storeItemId");

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Tabla user_purchases recreada con TODAS las columnas';
    RAISE NOTICE '🎯 Ahora las compras deberían funcionar correctamente';
END $$;
