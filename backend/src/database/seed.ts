import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedUsers } from './seeds/users.seed';

// Load environment variables
config();

async function runSeeds() {
  console.log('🌱 Starting database seeding...');
  
  try {
    // Initialize database connection
    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'acalud_db',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Run seeds
    await seedUsers(dataSource);

    // Close connection
    await dataSource.destroy();
    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

runSeeds();
