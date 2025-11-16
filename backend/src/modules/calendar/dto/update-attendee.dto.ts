/**
 * ✏️ UPDATE ATTENDEE DTO - ACTUALIZAR ASISTENTES
 * 
 * DTO para actualizar información y configuración de asistentes
 * en eventos del calendario.
 * 
 * FUNCIONALIDADES:
 * - Cambio de roles y permisos
 * - Actualización de preferencias
 * - Gestión de asistencia
 * - Modificación de notas
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  ValidateNested,
  Length,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AttendeeRole,
  InvitationStatus,
  AttendanceStatus,
} from '../entities/event-attendee.entity';
import { AttendeeNotificationPreferencesDto } from './add-attendee.dto';

/**
 * ✏️ DTO para actualizar asistentes
 */
export class UpdateAttendeeDto {
  /**
   * 👔 Rol y estado
   */
  @ApiPropertyOptional({
    description: 'Nuevo rol del asistente',
    example: 'moderator',
    enum: AttendeeRole,
  })
  @IsOptional()
  @IsEnum(AttendeeRole)
  role?: AttendeeRole;

  @ApiPropertyOptional({
    description: 'Estado de la invitación',
    example: 'accepted',
    enum: InvitationStatus,
  })
  @IsOptional()
  @IsEnum(InvitationStatus)
  invitationStatus?: InvitationStatus;

  @ApiPropertyOptional({
    description: 'Estado de asistencia',
    example: 'present',
    enum: AttendanceStatus,
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  attendanceStatus?: AttendanceStatus;

  /**
   * 📨 Respuesta a invitación
   */
  @ApiPropertyOptional({
    description: 'Mensaje de respuesta a la invitación',
    example: 'Confirmo mi asistencia. Gracias por la invitación.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  responseMessage?: string;

  /**
   * 📋 Control de asistencia
   */
  @ApiPropertyOptional({
    description: 'Fecha y hora de check-in',
    example: '2024-06-15T09:05:00Z',
  })
  @IsOptional()
  @IsDateString()
  checkedInAt?: string;

  @ApiPropertyOptional({
    description: 'Fecha y hora de check-out',
    example: '2024-06-15T11:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  checkedOutAt?: string;

  /**
   * 🔔 Configuración de notificaciones
   */
  @ApiPropertyOptional({
    description: 'Recibir recordatorios',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  receiveReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Preferencias de notificación actualizadas',
    type: AttendeeNotificationPreferencesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AttendeeNotificationPreferencesDto)
  notificationPreferences?: AttendeeNotificationPreferencesDto;

  /**
   * 📝 Notas y campos personalizados
   */
  @ApiPropertyOptional({
    description: 'Notas del organizador (actualizadas)',
    example: 'Llegó 10 minutos tarde pero participó activamente',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Notas del propio asistente',
    example: 'Excelente sesión, muy útil para mi aprendizaje',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  attendeeNotes?: string;

  @ApiPropertyOptional({
    description: 'Campos personalizados actualizados',
    example: { satisfaction: 5, wouldRecommend: true },
  })
  @IsOptional()
  customFields?: Record<string, unknown>;

  /**
   * 🔐 Permisos actualizados
   */
  @ApiPropertyOptional({
    description: 'Actualizar permiso para invitar otros',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canInviteOthers?: boolean;

  @ApiPropertyOptional({
    description: 'Actualizar permiso para modificar evento',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  canModifyEvent?: boolean;

  @ApiPropertyOptional({
    description: 'Actualizar permiso para ver asistentes',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  canSeeAttendees?: boolean;
}

/**
 * 📋 DTO para marcar asistencia rápidamente
 */
export class MarkAttendanceDto {
  @ApiPropertyOptional({
    description: 'Estado de asistencia',
    example: 'present',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  attendanceStatus?: AttendanceStatus;

  @ApiPropertyOptional({
    description: 'Notas sobre la asistencia',
    example: 'Llegó 5 minutos tarde debido al tráfico',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Marcar automáticamente el check-in/out',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoMarkTime?: boolean;
}