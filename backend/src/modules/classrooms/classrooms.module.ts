import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Classroom } from './classroom.entity';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsController } from './classrooms.controller';
import { UsersModule } from '../users/users.module';

/**
 * Módulo de aulas (classrooms)
 * Gestiona todas las funcionalidades relacionadas con las aulas virtuales
 * Incluye creación, gestión de estudiantes, códigos de invitación y configuraciones
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Classroom]),
    UsersModule, // Importamos para acceder al servicio de usuarios
  ],
  providers: [ClassroomsService],
  controllers: [ClassroomsController],
  exports: [ClassroomsService, TypeOrmModule], // Exportamos para otros módulos
})
export class ClassroomsModule {}
