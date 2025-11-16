/**
 * ➕ CREATE REMINDER DTO - CREAR RECORDATORIOS
 * 
 * DTO para crear recordatorios automáticos de eventos.
 * Soporta diferentes tipos de notificaciones y programación flexible.
 * 
 * FUNCIONALIDADES:
 * - Múltiples tipos de recordatorios
 * - Programación flexible
 * - Plantillas personalizadas
 * - Configuración por usuario
 * - Opciones de entrega avanzadas
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
  IsUUID,
  IsObject,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  Length,
  Min,
  Max,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReminderType,
  ReminderTrigger,
} from '../entities/event-reminder.entity';

/**
 * 📅 DTO para programación personalizada
 */
export class CustomScheduleDto {
  @ApiPropertyOptional({
    description: 'Patrón de repetición',
    example: 'daily',
    enum: ['daily', 'weekly', 'monthly'],
  })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  pattern?: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({
    description: 'Días de la semana (0=Domingo)',
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
    description: 'Hora específica (formato HH:MM)',
    example: '08:30',
    pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsOptional()
  @IsString()
  time?: string;

  @ApiPropertyOptional({
    description: 'Número de repeticiones',
    example: 5,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  repeatCount?: number;
}

/**
 * 📧 DTO para opciones de entrega de email
 */
export class EmailDeliveryOptionsDto {
  @ApiPropertyOptional({
    description: 'Plantilla de email a usar',
    example: 'event-reminder',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  template?: string;

  @ApiPropertyOptional({
    description: 'Archivos adjuntos (URLs)',
    example: ['https://example.com/agenda.pdf'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  attachments?: string[];

  @ApiPropertyOptional({
    description: 'Email de respuesta',
    example: 'noreply@universidad.edu',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  replyTo?: string;
}

/**
 * 📱 DTO para opciones de entrega de SMS
 */
export class SmsDeliveryOptionsDto {
  @ApiPropertyOptional({
    description: 'Código corto del SMS',
    example: '12345',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  shortCode?: string;

  @ApiPropertyOptional({
    description: 'Plantilla de SMS',
    example: 'reminder-sms',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  template?: string;
}

/**
 * 📦 DTO para opciones de entrega
 */
export class DeliveryOptionsDto {
  @ApiPropertyOptional({
    description: 'Intervalo entre reintentos (minutos)',
    example: 30,
    minimum: 5,
    maximum: 1440,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  retryInterval?: number;

  @ApiPropertyOptional({
    description: 'Requiere confirmación de entrega',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requireConfirmation?: boolean;

  @ApiPropertyOptional({
    description: 'Fecha de expiración del recordatorio',
    example: '2024-06-15T12:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Headers personalizados (para webhooks)',
    example: { 'X-API-Key': 'secret123', 'Content-Type': 'application/json' },
  })
  @IsOptional()
  @IsObject()
  customHeaders?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Opciones específicas para SMS',
    type: SmsDeliveryOptionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SmsDeliveryOptionsDto)
  smsOptions?: SmsDeliveryOptionsDto;

  @ApiPropertyOptional({
    description: 'Opciones específicas para email',
    type: EmailDeliveryOptionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailDeliveryOptionsDto)
  emailOptions?: EmailDeliveryOptionsDto;
}

/**
 * ➕ DTO principal para crear recordatorios
 */
export class CreateReminderDto {
  /**
   * 👤 Destinatario del recordatorio
   */
  @ApiPropertyOptional({
    description: 'ID del usuario específico (null = todos los asistentes)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4)
  userId?: string;

  /**
   * 📝 Contenido del recordatorio
   */
  @ApiProperty({
    description: 'Título del recordatorio',
    example: 'Recordatorio: Examen Final de Cálculo',
    minLength: 1,
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  title: string;

  @ApiPropertyOptional({
    description: 'Mensaje detallado del recordatorio',
    example: 'Tu examen final de Cálculo I comenzará en {{minutesBefore}} minutos. No olvides traer tu calculadora e identificación.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  message?: string;

  @ApiProperty({
    description: 'Tipo de recordatorio',
    example: 'email',
    enum: ReminderType,
  })
  @IsEnum(ReminderType)
  type: ReminderType;

  /**
   * ⏰ Configuración de tiempo
   */
  @ApiProperty({
    description: 'Tipo de disparador del recordatorio',
    example: 'time_before',
    enum: ReminderTrigger,
  })
  @IsEnum(ReminderTrigger)
  trigger: ReminderTrigger;

  @ApiPropertyOptional({
    description: 'Minutos antes del evento (para trigger time_before)',
    example: 60,
    minimum: 1,
    maximum: 10080, // Máximo 1 semana
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10080)
  minutesBefore?: number;

  @ApiPropertyOptional({
    description: 'Fecha y hora exacta para enviar (para trigger exact_time)',
    example: '2024-06-15T08:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional({
    description: 'Configuración de programación personalizada',
    type: CustomScheduleDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomScheduleDto)
  customSchedule?: CustomScheduleDto;

  /**
   * ⚙️ Configuración avanzada
   */
  @ApiPropertyOptional({
    description: 'Recordatorio activo',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Prioridad del recordatorio (1=alta, 5=baja)',
    example: 2,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Número máximo de intentos de envío',
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts?: number;

  /**
   * 📊 Datos y configuración
   */
  @ApiPropertyOptional({
    description: 'Datos para plantillas (variables)',
    example: { instructorName: 'Dr. Smith', roomNumber: '101' },
  })
  @IsOptional()
  @IsObject()
  templateData?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Opciones de entrega específicas',
    type: DeliveryOptionsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryOptionsDto)
  deliveryOptions?: DeliveryOptionsDto;

  @ApiPropertyOptional({
    description: 'Metadatos adicionales',
    example: {
      source: 'automatic',
      campaignId: 'final-exams-2024',
      tags: ['exam', 'important']
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    source?: 'automatic' | 'manual' | 'template' | 'bulk';
    createdBy?: string;
    campaignId?: string;
    tags?: string[];
  };

  /**
   * 🛡️ Validaciones personalizadas
   */

  /**
   * Valida que la configuración de tiempo sea coherente
   */
  validateTimeConfiguration(): boolean {
    switch (this.trigger) {
      case ReminderTrigger.TIME_BEFORE:
        return !!this.minutesBefore && this.minutesBefore > 0;
      case ReminderTrigger.EXACT_TIME:
        return !!this.scheduledFor;
      case ReminderTrigger.CUSTOM_SCHEDULE:
        return !!this.customSchedule;
      default:
        return true;
    }
  }

  /**
   * Valida configuración específica por tipo
   */
  validateTypeSpecificConfig(): boolean {
    switch (this.type) {
      case ReminderType.EMAIL:
        return true; // Email siempre válido
      case ReminderType.SMS:
        return true; // SMS siempre válido
      case ReminderType.WEBHOOK:
        return !!this.deliveryOptions?.customHeaders;
      default:
        return true;
    }
  }
}

/**
 * 📦 DTO para crear recordatorios en lote
 */
export class CreateBulkRemindersDto {
  @ApiProperty({
    description: 'Lista de recordatorios a crear',
    type: [CreateReminderDto],
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReminderDto)
  reminders: CreateReminderDto[];

  @ApiPropertyOptional({
    description: 'Aplicar configuración común a todos',
    example: {
      priority: 1,
      maxAttempts: 3,
      isActive: true
    },
  })
  @IsOptional()
  @IsObject()
  commonSettings?: {
    priority?: number;
    maxAttempts?: number;
    isActive?: boolean;
  templateData?: Record<string, unknown>;
  };
}