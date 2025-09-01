import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from './achievement.entity';
import { UserInventory } from './user-inventory.entity';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { UsersModule } from '../users/users.module';

/**
 * Módulo de gamificación
 * Gestiona el sistema de logros, inventario y mecánicas de juego
 * Incluye achievements, recompensas, niveles y sistema de monedas
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Achievement, UserInventory]),
    UsersModule, // Para acceder al servicio de usuarios y actualizar stats
  ],
  providers: [GamificationService],
  controllers: [GamificationController],
  exports: [GamificationService, TypeOrmModule], // Exportamos para otros módulos
})
export class GamificationModule {}
