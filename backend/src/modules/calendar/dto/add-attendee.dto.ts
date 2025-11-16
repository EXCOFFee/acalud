/**
 * 👥 ADD ATTENDEE DTO - AGREGAR ASISTENTES A EVENTOS
 * 
 * DTO para agregar y configurar asistentes en eventos del calendario.
 * Incluye configuración de roles, notificaciones y permisos.
 * 
 * FUNCIONALIDADES:
 * - Invitación individual o masiva
 * - Configuración de roles específicos
 * - Preferencias de notificación
 * - Mensajes personalizados
 * - Configuración de permisos
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsInt,
  ValidateNested,
  IsNotEmpty,
  Length,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AttendeeRole,
  InvitationStatus,
} from '../entities/event-attendee.entity';

/**
 * 🔔 DTO para preferencias de notificación de asistentes
 */
export class AttendeeNotificationPreferencesDto {
  @ApiPropertyOptional({
    description: 'Recibir notificaciones por email',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({
    description: 'Recibir notificaciones in-app',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @ApiPropertyOptional({
    description: 'Recibir notificaciones por SMS',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional({
    description: 'Recibir notificaciones push',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiPropertyOptional({
    description: 'Minutos personalizados para recordatorios',
    example: [10, 30, 120],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(10080, { each: true }) // Máximo 1 semana
  customReminderMinutes?: number[];
}

/**
 * 👥 DTO principal para agregar asistentes
 */
export class AddAttendeeDto {
  /**
   * 👤 Información del asistente
   */
  @ApiProperty({
    description: 'ID del usuario a agregar como asistente',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID(4)
  userId: string;

  @ApiPropertyOptional({
    description: 'Rol del asistente en el evento',
    example: 'participant',
    enum: AttendeeRole,
    default: AttendeeRole.PARTICIPANT,
  })
  @IsOptional()
  @IsEnum(AttendeeRole)
  role?: AttendeeRole;

  /**
   * 📨 Configuración de invitación
   */
  @ApiPropertyOptional({
    description: 'Estado inicial de la invitación',
    example: 'pending',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(InvitationStatus)
  invitationStatus?: InvitationStatus;

  @ApiPropertyOptional({
    description: 'Mensaje personalizado para la invitación',
    example: 'Te invito a participar en este importante examen final.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  invitationMessage?: string;

  @ApiPropertyOptional({
    description: 'Enviar invitación inmediatamente',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendInvitationNow?: boolean;

  /**
   * 🔔 Configuración de notificaciones
   */
  @ApiPropertyOptional({
    description: 'Recibir recordatorios automáticos',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  receiveReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Preferencias de notificación del asistente',
    type: AttendeeNotificationPreferencesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AttendeeNotificationPreferencesDto)
  notificationPreferences?: AttendeeNotificationPreferencesDto;

  /**
   * 📝 Información adicional
   */
  @ApiPropertyOptional({
    description: 'Notas del organizador sobre este asistente',
    example: 'Estudiante destacado, necesita asiento adelante por problemas de visión',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Campos personalizados para el asistente',
    example: { dietaryRestrictions: 'vegetarian', specialNeeds: 'wheelchair access' },
  })
  @IsOptional()
  customFields?: Record<string, unknown>;

  /**
   * 🔐 Configuración de permisos
   */
  @ApiPropertyOptional({
    description: 'Puede invitar a otros usuarios',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  canInviteOthers?: boolean;

  @ApiPropertyOptional({
    description: 'Puede modificar el evento',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  canModifyEvent?: boolean;

  @ApiPropertyOptional({
    description: 'Puede ver la lista de otros asistentes',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  canSeeAttendees?: boolean;
}

/**
 * 👥 DTO para agregar múltiples asistentes
 */
export class AddMultipleAttendeesDto {
  @ApiProperty({
    description: 'Lista de asistentes a agregar',
    type: [AddAttendeeDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddAttendeeDto)
  attendees: AddAttendeeDto[];

  @ApiPropertyOptional({
    description: 'Mensaje común para todas las invitaciones',
    example: 'Los invito a participar en este evento importante.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  commonMessage?: string;

  @ApiPropertyOptional({
    description: 'Enviar todas las invitaciones inmediatamente',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendAllNow?: boolean;

  @ApiPropertyOptional({
    description: 'Configuración común de notificaciones',
    type: AttendeeNotificationPreferencesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AttendeeNotificationPreferencesDto)
  commonNotificationPreferences?: AttendeeNotificationPreferencesDto;
}