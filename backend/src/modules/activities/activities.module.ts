import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from './activity.entity';
import { ActivityCompletion } from './activity-completion.entity';
import { ActivitiesService } from './activities.service';
import { ActivitiesController } from './activities.controller';
import { UsersModule } from '../users/users.module';
import { ClassroomsModule } from '../classrooms/classrooms.module';

/**
 * Módulo de actividades
 * Gestiona todas las funcionalidades relacionadas con actividades educativas
 * Incluye creación, asignación, completamiento y evaluación de actividades
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ActivityCompletion]),
    UsersModule, // Para acceder al servicio de usuarios
    ClassroomsModule, // Para validar permisos de aulas
  ],
  providers: [ActivitiesService],
  controllers: [ActivitiesController],
  exports: [ActivitiesService, TypeOrmModule], // Exportamos para otros módulos
})
export class ActivitiesModule {}
