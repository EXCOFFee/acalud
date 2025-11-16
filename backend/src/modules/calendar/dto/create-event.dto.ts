/**
 * ➕ CREATE EVENT DTO - VALIDACIÓN PARA CREAR EVENTOS
 * 
 * DTO con validaciones completas para la creación de eventos
 * del calendario académico. Incluye todas las funcionalidades
 * avanzadas del sistema.
 * 
 * VALIDACIONES INCLUIDAS:
 * - Fechas y horarios válidos
 * - Configuración de recurrencia
 * - Ubicaciones físicas y virtuales
 * - Metadatos y configuraciones
 * - Límites de participantes
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  IsUUID,
  IsUrl,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  Length,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EventType,
  EventStatus,
  RecurrenceType,
  LocationType,
} from '../entities/event.entity';

/**
 * 🔄 DTO para configuración de recurrencia
 */
export class RecurrenceRuleDto {
  @ApiPropertyOptional({
    description: 'Intervalo de recurrencia (cada X días/semanas/meses)',
    example: 1,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  interval?: number;

  @ApiPropertyOptional({
    description: 'Días de la semana (0=Domingo, 1=Lunes, etc.)',
    example: [1, 3, 5],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({
    description: 'Día del mes para recurrencia mensual',
    example: 15,
    minimum: 1,
    maximum: 31,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @ApiPropertyOptional({
    description: 'Mes del año para recurrencia anual',
    example: 6,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  monthOfYear?: number;

  @ApiPropertyOptional({
    description: 'Fecha de finalización de recurrencia',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Número máximo de ocurrencias',
    example: 10,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  occurrences?: number;
}

/**
 * 🔔 DTO para configuración de notificaciones
 */
export class NotificationSettingsDto {
  @ApiPropertyOptional({
    description: 'Enviar notificaciones por email',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({
    description: 'Enviar notificaciones in-app',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @ApiPropertyOptional({
    description: 'Enviar notificaciones por SMS',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional({
    description: 'Enviar notificaciones push',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiPropertyOptional({
    description: 'Minutos antes del evento para recordatorios',
    example: [15, 60, 1440],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(10080, { each: true }) // Máximo 1 semana
  reminderMinutes?: number[];
}

/**
 * 🏷️ DTO para metadatos del evento
 */
export class EventMetadataDto {
  @ApiPropertyOptional({
    description: 'Color del evento en formato hex',
    example: '#4F46E5',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Length(7, 7)
  color?: string;

  @ApiPropertyOptional({
    description: 'Icono del evento (emoji o nombre)',
    example: '📖',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Prioridad del evento',
    example: 'high',
    enum: ['low', 'medium', 'high', 'urgent'],
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @ApiPropertyOptional({
    description: 'Etiquetas del evento',
    example: ['examen', 'importante', 'matematicas'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Campos personalizados adicionales',
    example: { instructor: 'Dr. Smith', sala: 'Aula 101' },
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'IDs de calendarios externos sincronizados',
    example: { google: 'cal123', outlook: 'evt456' },
  })
  @IsOptional()
  @IsObject()
  externalCalendarIds?: Record<string, string>;
}

/**
 * ➕ DTO principal para crear eventos
 */
export class CreateEventDto {
  /**
   * 📝 Información básica del evento
   */
  @ApiProperty({
    description: 'Título del evento',
    example: 'Examen Final de Cálculo I',
    minLength: 1,
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del evento',
    example: 'Examen final que cubre todos los temas del semestre. Traer calculadora y identificación.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiProperty({
    description: 'Tipo de evento',
    example: 'exam',
    enum: EventType,
  })
  @IsEnum(EventType)
  type: EventType;

  @ApiPropertyOptional({
    description: 'Estado inicial del evento',
    example: 'published',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  /**
   * ⏰ Información temporal
   */
  @ApiProperty({
    description: 'Fecha y hora de inicio del evento',
    example: '2024-06-15T09:00:00Z',
  })
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  startDate: string;

  @ApiProperty({
    description: 'Fecha y hora de finalización del evento',
    example: '2024-06-15T11:00:00Z',
  })
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  endDate: string;

  @ApiPropertyOptional({
    description: 'Evento de todo el día',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiPropertyOptional({
    description: 'Zona horaria del evento',
    example: 'America/Mexico_City',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  timezone?: string;

  /**
   * 🔄 Configuración de recurrencia
   */
  @ApiPropertyOptional({
    description: 'Tipo de recurrencia',
    example: 'weekly',
    enum: RecurrenceType,
    default: RecurrenceType.NONE,
  })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrenceType?: RecurrenceType;

  @ApiPropertyOptional({
    description: 'Reglas de recurrencia detalladas',
    type: RecurrenceRuleDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceRuleDto)
  recurrenceRule?: RecurrenceRuleDto;

  @ApiPropertyOptional({
    description: 'ID del evento padre (para eventos recurrentes)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4)
  parentEventId?: string;

  /**
   * 📍 Información de ubicación
   */
  @ApiPropertyOptional({
    description: 'Tipo de ubicación',
    example: 'physical',
    enum: LocationType,
    default: LocationType.PHYSICAL,
  })
  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @ApiPropertyOptional({
    description: 'Nombre de la ubicación',
    example: 'Aula Magna - Edificio Central',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  locationName?: string;

  @ApiPropertyOptional({
    description: 'Dirección física completa',
    example: 'Av. Universidad 3000, Ciudad Universitaria, CDMX',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  locationAddress?: string;

  @ApiPropertyOptional({
    description: 'URL de reunión virtual',
    example: 'https://zoom.us/j/123456789',
  })
  @IsOptional()
  @IsUrl()
  @Length(1, 500)
  virtualMeetingUrl?: string;

  @ApiPropertyOptional({
    description: 'ID de la reunión virtual',
    example: '123-456-789',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  virtualMeetingId?: string;

  @ApiPropertyOptional({
    description: 'Contraseña de la reunión virtual',
    example: 'secretpass123',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  virtualMeetingPassword?: string;

  @ApiPropertyOptional({
    description: 'URL adicional de ubicación o recurso',
    example: 'https://maps.google.com/location',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl()
  @Length(1, 500)
  locationUrl?: string;

  /**
   * 👥 Configuración de asistencia
   */
  @ApiPropertyOptional({
    description: 'Requiere registro de asistencia',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresAttendance?: boolean;

  @ApiPropertyOptional({
    description: 'Número máximo de asistentes',
    example: 50,
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxAttendees?: number;

  @ApiPropertyOptional({
    description: 'Permitir invitaciones de invitados',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowGuestInvites?: boolean;

  @ApiPropertyOptional({
    description: 'Evento privado (solo invitados)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({
    description: 'Requiere aprobación para unirse',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  /**
   * 🔔 Configuración de notificaciones
   */
  @ApiPropertyOptional({
    description: 'Enviar notificaciones automáticas',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Configuración detallada de notificaciones',
    type: NotificationSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notificationSettings?: NotificationSettingsDto;

  /**
   * 🔗 Relaciones con otras entidades
   */
  @ApiPropertyOptional({
    description: 'ID de la categoría del evento',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4)
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'ID del aula asociada',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4)
  classroomId?: string;

  @ApiPropertyOptional({
    description: 'ID de la actividad asociada',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4)
  activityId?: string;

  @ApiPropertyOptional({
    description: 'IDs de los asistentes iniciales',
    example: ['user1-uuid', 'user2-uuid'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  attendeeIds?: string[];

  /**
   * 🏷️ Metadatos adicionales
   */
  @ApiPropertyOptional({
    description: 'Metadatos y configuración personalizada',
    type: EventMetadataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EventMetadataDto)
  metadata?: EventMetadataDto;

  /**
   * 🛡️ Métodos de validación personalizados
   */

  /**
   * Valida que la fecha de fin sea posterior a la de inicio
   */
  validateDateRange(): boolean {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    return end > start;
  }

  /**
   * Valida configuración de ubicación virtual
   */
  validateVirtualLocation(): boolean {
    if (this.locationType === LocationType.VIRTUAL || this.locationType === LocationType.HYBRID) {
      return !!this.virtualMeetingUrl || !!this.virtualMeetingId;
    }
    return true;
  }

  /**
   * Valida configuración de recurrencia
   */
  validateRecurrence(): boolean {
    if (this.recurrenceType && this.recurrenceType !== RecurrenceType.NONE) {
      return !!this.recurrenceRule;
    }
    return true;
  }
}