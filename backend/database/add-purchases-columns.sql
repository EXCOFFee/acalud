-- Agregar columnas faltantes a user_purchases
ALTER TABLE user_purchases 
ADD COLUMN IF NOT EXISTS "giftFromUserId" UUID,
ADD COLUMN IF NOT EXISTS "giftMessage" TEXT,
ADD COLUMN IF NOT EXISTS "isGift" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "transactionId" UUID,
ADD COLUMN IF NOT EXISTS "refundId" UUID;
