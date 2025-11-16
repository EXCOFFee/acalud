/**
 * Script para crear tablas de la tienda en PostgreSQL
 * Ejecutar con: node create-store-tables.js
 */

const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'santy331',
  database: 'acalud_db',
});

const createStoreItemsSQL = `
CREATE TABLE IF NOT EXISTS store_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'other',
    rarity VARCHAR(50) NOT NULL DEFAULT 'common',
    availability VARCHAR(50) NOT NULL DEFAULT 'available',
    price INTEGER NOT NULL DEFAULT 100,
    discount_percentage INTEGER DEFAULT 0,
    final_price INTEGER,
    image_url VARCHAR(500),
    preview_url VARCHAR(500),
    icon_url VARCHAR(500),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT false,
    is_popular BOOLEAN DEFAULT false,
    stock INTEGER DEFAULT -1,
    max_purchases_per_user INTEGER DEFAULT -1,
    required_level INTEGER DEFAULT 1,
    required_achievements TEXT[],
    available_from TIMESTAMP,
    available_until TIMESTAMP,
    purchase_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT price_positive CHECK (price >= 0),
    CONSTRAINT discount_valid CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    CONSTRAINT stock_valid CHECK (stock >= -1),
    CONSTRAINT required_level_positive CHECK (required_level >= 1)
);`;

const createUserPurchasesSQL = `
CREATE TABLE IF NOT EXISTS user_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    store_item_id UUID NOT NULL,
    purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price_paid INTEGER NOT NULL,
    currency_type VARCHAR(50) DEFAULT 'coins',
    purchase_status VARCHAR(50) DEFAULT 'completed',
    transaction_id UUID,
    refund_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_purchases_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_purchases_store_item FOREIGN KEY (store_item_id) REFERENCES store_items(id) ON DELETE CASCADE,
    CONSTRAINT price_paid_positive CHECK (price_paid >= 0)
);`;

const createUserInventorySQL = `
CREATE TABLE IF NOT EXISTS user_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    item_rarity VARCHAR(50) DEFAULT 'common',
    is_equipped BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    acquired_from VARCHAR(100) DEFAULT 'store',
    acquired_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_inventory_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_item UNIQUE (user_id, item_id)
);`;

const createVirtualCurrencySQL = `
CREATE TABLE IF NOT EXISTS virtual_currency_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    description TEXT,
    related_entity_id UUID,
    related_entity_type VARCHAR(50),
    balance_after INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_currency_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT balance_after_non_negative CHECK (balance_after >= 0)
);`;

const insertSampleItemsSQL = `
INSERT INTO store_items (name, description, type, rarity, price, image_url, is_active, tags)
VALUES
    ('Avatar Científico', 'Un avatar con bata de laboratorio y gafas de seguridad', 'avatar', 'common', 100, 'https://via.placeholder.com/150', true, ARRAY['avatar', 'ciencia']),
    ('Marco Dorado', 'Un elegante marco dorado para tu perfil', 'frame', 'rare', 250, 'https://via.placeholder.com/150', true, ARRAY['frame', 'premium']),
    ('Tema Nocturno', 'Un tema oscuro para la interfaz', 'theme', 'uncommon', 150, 'https://via.placeholder.com/150', true, ARRAY['theme', 'dark']),
    ('Emote Celebración', 'Emoji de celebración animado', 'emote', 'common', 50, 'https://via.placeholder.com/150', true, ARRAY['emote', 'animado']),
    ('Fondo Espacial', 'Fondo con estrellas y planetas', 'avatar_background', 'epic', 500, 'https://via.placeholder.com/150', true, ARRAY['fondo', 'espacio'])
ON CONFLICT DO NOTHING;`;

async function main() {
  try {
    console.log('🔌 Conectando a PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado exitosamente\n');

    console.log('🏗️  Creando tabla store_items...');
    await client.query(createStoreItemsSQL);
    console.log('✅ Tabla store_items creada\n');

    console.log('🏗️  Creando tabla user_purchases...');
    await client.query(createUserPurchasesSQL);
    console.log('✅ Tabla user_purchases creada\n');

    console.log('🏗️  Creando tabla user_inventory...');
    await client.query(createUserInventorySQL);
    console.log('✅ Tabla user_inventory creada\n');

    console.log('🏗️  Creando tabla virtual_currency_transactions...');
    await client.query(createVirtualCurrencySQL);
    console.log('✅ Tabla virtual_currency_transactions creada\n');

    console.log('📦 Insertando 5 items de prueba...');
    await client.query(insertSampleItemsSQL);
    console.log('✅ Items insertados\n');

    console.log('🎉 ¡Tablas de la tienda creadas exitosamente!');
    console.log('📊 Verifica en la aplicación en http://localhost:5173');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
