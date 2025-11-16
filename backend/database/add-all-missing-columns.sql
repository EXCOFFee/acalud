-- Agregar TODAS las columnas faltantes a user_purchases en un solo paso
-- Basado en la entidad UserPurchase de TypeORM

-- Columnas de precio y descuento
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "originalPriceAtPurchase" INT NOT NULL DEFAULT 0;
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "discountApplied" INT DEFAULT 0;

-- Columnas de cantidad y equipamiento
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "quantity" INT DEFAULT 1;
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "isEquipped" BOOLEAN DEFAULT false;
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "equippedAt" TIMESTAMP;

-- Datos adicionales
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "purchaseData" JSON;
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Vencimiento
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP;

-- Actualizar registros existentes con valores coherentes
-- Para compras ya realizadas, asumir que originalPrice = pricePaid
UPDATE user_purchases 
SET "originalPriceAtPurchase" = "pricePaid" 
WHERE "originalPriceAtPurchase" = 0 OR "originalPriceAtPurchase" IS NULL;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_user_purchases_userId_status ON user_purchases("userId", "purchaseStatus");
CREATE INDEX IF NOT EXISTS idx_user_purchases_storeItemId_status ON user_purchases("storeItemId", "purchaseStatus");
CREATE INDEX IF NOT EXISTS idx_user_purchases_createdAt ON user_purchases("createdAt");
CREATE INDEX IF NOT EXISTS idx_user_purchases_userId_storeItemId ON user_purchases("userId", "storeItemId");
