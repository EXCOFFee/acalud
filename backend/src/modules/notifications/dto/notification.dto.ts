/**
 * 🔔 DTOs PARA NOTIFICACIONES - VALIDACIÓN Y TRANSFERENCIA DE DATOS
 * 
 * Data Transfer Objects para el módulo de notificaciones:
 * - Creación de notificaciones
 * - Filtrado y búsqueda
 * - Actualización de estados
 * - Configuración de preferencias
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Cada DTO tiene una responsabilidad específica
 * - OCP: Extensible para nuevos tipos de datos
 * - ISP: Interfaces segregadas por funcionalidad
 * - Validación robusta con class-validator
 * - Documentación completa con Swagger
 */

import {
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
  IsInt,
  IsDateString,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from '../notification.entity';

// =============================================================================
// 📝 DTOs PARA CREACIÓN DE NOTIFICACIONES
// =============================================================================

/**
 * DTO para crear una notificación básica
 */
export class CreateNotificationDto {
  @ApiProperty({
    enum: NotificationType,
    description: 'Tipo específico de la notificación',
    example: NotificationType.ACHIEVEMENT_UNLOCKED,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Título de la notificación (máximo 100 caracteres)',
    example: '🏆 ¡Nuevo logro desbloqueado!',
    minLength: 5,
    maxLength: 100,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Mensaje completo de la notificación',
    example: 'Has completado tu primera actividad de matemáticas. ¡Excelente trabajo!',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  message: string;

  @ApiProperty({
    description: 'ID del usuario destinatario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  recipientId: string;

  @ApiPropertyOptional({
    description: 'ID del usuario remitente (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  senderId?: string;

  @ApiPropertyOptional({
    enum: NotificationPriority,
    description: 'Prioridad de la notificación',
    example: NotificationPriority.HIGH,
    default: NotificationPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    type: [String],
    enum: NotificationChannel,
    description: 'Canales por los que enviar la notificación',
    example: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    default: [NotificationChannel.IN_APP],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    type: 'object',
    description: 'Datos adicionales específicos del tipo de notificación',
    example: {
      activityId: '123e4567-e89b-12d3-a456-426614174002',
      points: 50,
      url: '/activities/123e4567-e89b-12d3-a456-426614174002',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Fecha de expiración de la notificación',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

/**
 * DTO para crear notificaciones masivas
 */
export class CreateBulkNotificationDto {
  @ApiProperty({
    type: [String],
    description: 'Lista de IDs de usuarios destinatarios',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  recipientIds: string[];

  @ApiProperty({
    enum: NotificationType,
    description: 'Tipo de notificación',
    example: NotificationType.SYSTEM_ANNOUNCEMENT,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Título de la notificación',
    example: '📢 Anuncio del sistema',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Mensaje de la notificación',
    example: 'Nueva funcionalidad disponible en la plataforma.',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    type: [String],
    enum: NotificationChannel,
    default: [NotificationChannel.IN_APP],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    type: 'object',
    description: 'Metadatos adicionales',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// =============================================================================
// 🔍 DTOs PARA FILTRADO Y BÚSQUEDA
// =============================================================================

/**
 * DTO para filtrar notificaciones
 */
export class NotificationFiltersDto {
  @ApiPropertyOptional({
    description: 'Número de página',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Elementos por página',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    type: [String],
    enum: NotificationType,
    description: 'Tipos de notificaciones a filtrar',
    example: [NotificationType.ACTIVITY_COMPLETED, NotificationType.ACHIEVEMENT_UNLOCKED],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  types?: NotificationType[];

  @ApiPropertyOptional({
    type: [String],
    enum: NotificationPriority,
    description: 'Prioridades a filtrar',
    example: [NotificationPriority.HIGH, NotificationPriority.URGENT],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationPriority, { each: true })
  priorities?: NotificationPriority[];

  @ApiPropertyOptional({
    description: 'Filtrar solo notificaciones leídas/no leídas',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar desde fecha',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Filtrar hasta fecha',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Buscar en título y mensaje',
    example: 'logro',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  search?: string;

  @ApiPropertyOptional({
    description: 'Ordenar por campo',
    example: 'createdAt',
    enum: ['createdAt', 'priority', 'type', 'isRead'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'priority' | 'type' | 'isRead';

  @ApiPropertyOptional({
    description: 'Orden de clasificación',
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

// =============================================================================
// ✏️ DTOs PARA ACTUALIZACIÓN
// =============================================================================

/**
 * DTO para actualizar una notificación
 */
export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @ApiPropertyOptional({
    description: 'Marcar como leída',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}

/**
 * DTO para marcar notificaciones como leídas
 */
export class MarkAsReadDto {
  @ApiProperty({
    type: [String],
    description: 'IDs de las notificaciones a marcar como leídas',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  notificationIds: string[];
}

/**
 * DTO para marcar todas las notificaciones como leídas
 */
export class MarkAllAsReadDto {
  @ApiPropertyOptional({
    type: [String],
    enum: NotificationType,
    description: 'Solo marcar estos tipos como leídas (opcional)',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  types?: NotificationType[];

  @ApiPropertyOptional({
    description: 'Solo marcar las anteriores a esta fecha',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  beforeDate?: string;
}

// =============================================================================
// ⚙️ DTOs PARA CONFIGURACIÓN DE PREFERENCIAS
// =============================================================================

/**
 * Configuración de preferencias por tipo de notificación
 */
export class NotificationPreferenceDto {
  @ApiProperty({
    enum: NotificationType,
    description: 'Tipo de notificación',
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    type: [String],
    enum: NotificationChannel,
    description: 'Canales habilitados para este tipo',
    example: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  })
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  enabledChannels: NotificationChannel[];

  @ApiPropertyOptional({
    description: 'Está habilitado este tipo de notificación',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/**
 * DTO para actualizar preferencias de notificaciones
 */
export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    type: [NotificationPreferenceDto],
    description: 'Lista de preferencias por tipo de notificación',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationPreferenceDto)
  preferences: NotificationPreferenceDto[];

  @ApiPropertyOptional({
    description: 'Habilitar todas las notificaciones',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  globalEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Horario de silencio - hora de inicio',
    example: '22:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @ApiPropertyOptional({
    description: 'Horario de silencio - hora de fin',
    example: '08:00',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsOptional()
  @IsString()
  quietHoursEnd?: string;
}

// =============================================================================
// 📊 DTOs PARA ESTADÍSTICAS Y REPORTES
// =============================================================================

/**
 * DTO para estadísticas de notificaciones
 */
export class NotificationStatsDto {
  @ApiProperty({
    description: 'Total de notificaciones',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Notificaciones no leídas',
    example: 25,
  })
  unread: number;

  @ApiProperty({
    description: 'Notificaciones leídas',
    example: 125,
  })
  read: number;

  @ApiProperty({
    type: 'object',
    description: 'Distribución por tipo',
    example: {
      achievement_unlocked: 15,
      activity_completed: 30,
      classroom_announcement: 10,
    },
  })
  byType: Record<NotificationType, number>;

  @ApiProperty({
    type: 'object',
    description: 'Distribución por prioridad',
    example: {
      low: 50,
      medium: 75,
      high: 20,
      urgent: 5,
    },
  })
  byPriority: Record<NotificationPriority, number>;

  @ApiProperty({
    description: 'Notificaciones de hoy',
    example: 12,
  })
  today: number;

  @ApiProperty({
    description: 'Notificaciones de esta semana',
    example: 45,
  })
  thisWeek: number;

  @ApiProperty({
    description: 'Notificaciones de este mes',
    example: 150,
  })
  thisMonth: number;
}

// =============================================================================
// 📱 DTOs PARA RESPUESTAS
// =============================================================================

/**
 * Respuesta paginada de notificaciones
 */
export class PaginatedNotificationsDto {
  @ApiProperty({
    type: [Object],
    description: 'Lista de notificaciones',
  })
  data: any[];

  @ApiProperty({
    description: 'Total de notificaciones',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Página actual',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Elementos por página',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total de páginas',
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Hay página anterior',
    example: false,
  })
  hasPrevious: boolean;

  @ApiProperty({
    description: 'Hay página siguiente',
    example: true,
  })
  hasNext: boolean;
}

/**
 * Respuesta de operación exitosa
 */
export class NotificationOperationResultDto {
  @ApiProperty({
    description: 'Operación exitosa',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje de resultado',
    example: 'Notificación creada exitosamente',
  })
  message: string;

  @ApiProperty({
    description: 'Datos adicionales',
    required: false,
  })
  data?: any;
}