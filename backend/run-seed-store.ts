// ============================================================================
// SCRIPT DE SEED PARA ITEMS DE TIENDA
// ============================================================================
// Script ejecutable para poblar la tabla store_items con items iniciales

import { DataSource } from 'typeorm';
import { seedStoreItems } from './src/database/seeds/store-items.seed';
import { StoreItem } from './src/modules/store/entities/store-item.entity';
import { UserPurchase } from './src/modules/store/entities/user-purchase.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * 🌱 Función principal de seed
 * Inicializa conexión a BD y ejecuta el seed de items
 */
async function runSeed() {
  console.log('🌱 ==========================================');
  console.log('🌱 INICIANDO SEED DE ITEMS DE TIENDA');
  console.log('🌱 ==========================================\n');

  // Configuración de la base de datos desde variables de entorno
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'acalud_db',
    entities: [StoreItem, UserPurchase], // Solo cargar entities necesarias
    synchronize: false, // IMPORTANTE: No alterar el schema
    logging: false, // Desactivar logs de queries para mantener limpia la salida
  });

  try {
    // Inicializar conexión
    console.log('📦 Conectando a la base de datos...');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Database: ${process.env.DB_NAME || 'acalud_db'}`);
    console.log(`   Port: ${process.env.DB_PORT || '5432'}\n`);

    await dataSource.initialize();
    console.log('✅ Conexión establecida exitosamente\n');

    // Ejecutar seed
    console.log('🏪 Ejecutando seed de items de tienda...\n');
    const itemCount = await seedStoreItems(dataSource);

    // Resumen
    console.log('\n🎉 ==========================================');
    console.log('🎉 SEED COMPLETADO EXITOSAMENTE');
    console.log('🎉 ==========================================');
    console.log(`   📊 Total de items creados: ${itemCount}`);
    console.log(`   ✅ La tienda está lista para usarse`);
    console.log('🎉 ==========================================\n');

    // Cerrar conexión
    await dataSource.destroy();
    console.log('👋 Conexión cerrada correctamente');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ==========================================');
    console.error('❌ ERROR AL EJECUTAR SEED');
    console.error('❌ ==========================================');
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.error('Mensaje:', error.message);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    }
    
    console.error('❌ ==========================================\n');

    // Intentar cerrar conexión si está abierta
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    
    process.exit(1);
  }
}

// Verificar que el script se esté ejecutando directamente
if (require.main === module) {
  console.log('\n🚀 Iniciando script de seed...\n');
  runSeed().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
} else {
  console.warn('⚠️  Este script debe ejecutarse directamente');
  console.warn('   Uso: npm run seed:store');
}

export { runSeed };
