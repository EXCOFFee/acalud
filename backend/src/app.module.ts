import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClassroomsModule } from './modules/classrooms/classrooms.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { FilesModule } from './modules/files/files.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';

import { databaseConfig } from './config/database.config';
import { appConfig } from './config/app.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),

    // Cache with Redis
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST');
        const redisPort = configService.get('REDIS_PORT');
        
        if (redisHost && redisPort) {
          // Configuración con Redis si está disponible
          return {
            store: redisStore as any,
            host: redisHost,
            port: parseInt(redisPort),
            ttl: 300, // 5 minutes default TTL
          };
        } else {
          // Configuración en memoria si Redis no está disponible
          return {
            ttl: 300, // 5 minutes default TTL
          };
        }
      },
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),

    // Feature modules
    AuthModule,
    UsersModule,
    ClassroomsModule,
    ActivitiesModule,
    GamificationModule,
    FilesModule,
    MonitoringModule,
  ],
})
export class AppModule {}
