-- Add payment-related columns to user_purchases table
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "paymentMethod" VARCHAR(50) DEFAULT 'coins';
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(50) DEFAULT 'completed';
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "refundDate" TIMESTAMP;
ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS "refundReason" TEXT;
