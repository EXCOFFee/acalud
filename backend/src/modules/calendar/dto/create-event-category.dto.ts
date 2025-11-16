/**
 * ➕ CREATE EVENT CATEGORY DTO - VALIDACIÓN PARA CREAR CATEGORÍAS
 * 
 * DTO para la creación de categorías de eventos con validaciones
 * completas y configuración jerárquica.
 * 
 * FUNCIONALIDADES:
 * - Validación de nombres únicos
 * - Configuración visual (colores, iconos)
 * - Jerarquías padre-hijo
 * - Configuraciones por categoría
 * - Permisos y visibilidad
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
  IsObject,
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
  CategoryVisibility,
  CategoryStatus,
} from '../entities/event-category.entity';

/**
 * ⚙️ DTO para configuraciones de categoría
 */
export class CategorySettingsDto {
  @ApiPropertyOptional({
    description: 'Duración por defecto en minutos para eventos de esta categoría',
    example: 60,
    minimum: 15,
    maximum: 1440, // Máximo 24 horas
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(1440)
  defaultDuration?: number;

  @ApiPropertyOptional({
    description: 'Permitir eventos recurrentes en esta categoría',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowRecurrence?: boolean;

  @ApiPropertyOptional({
    description: 'Requiere aprobación para crear eventos',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  requireApproval?: boolean;

  @ApiPropertyOptional({
    description: 'Activar recordatorios automáticos',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Minutos antes del evento para recordatorios automáticos',
    example: [15, 60],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(10080, { each: true }) // Máximo 1 semana
  reminderMinutes?: number[];

  @ApiPropertyOptional({
    description: 'Máximo número de eventos por día en esta categoría',
    example: 5,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxEventsPerDay?: number;

  @ApiPropertyOptional({
    description: 'Roles permitidos para crear eventos en esta categoría',
    example: ['teacher', 'admin'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @ApiPropertyOptional({
    description: 'Configuración de notificaciones por defecto',
    example: {
      email: true,
      inApp: true,
      sms: false,
      push: true
    },
  })
  @IsOptional()
  @IsObject()
  notificationSettings?: {
    email?: boolean;
    inApp?: boolean;
    sms?: boolean;
    push?: boolean;
  };
}

/**
 * 🏷️ DTO para metadatos de categoría
 */
export class CategoryMetadataDto {
  @ApiPropertyOptional({
    description: 'Etiquetas de la categoría',
    example: ['academico', 'matematicas', 'examen'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Campos personalizados adicionales',
    example: { department: 'Mathematics', building: 'Science Hall' },
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Integraciones con sistemas externos',
    example: { googleCalendar: 'cal123', outlookCalendar: 'out456' },
  })
  @IsOptional()
  @IsObject()
  integrations?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Configuración de permisos específicos',
    example: {
      canView: ['student', 'teacher'],
      canCreate: ['teacher', 'admin'],
      canEdit: ['admin'],
      canDelete: ['admin']
    },
  })
  @IsOptional()
  @IsObject()
  permissions?: {
    canView?: string[];
    canCreate?: string[];
    canEdit?: string[];
    canDelete?: string[];
  };
}

/**
 * ➕ DTO principal para crear categorías de eventos
 */
export class CreateEventCategoryDto {
  /**
   * 📝 Información básica
   */
  @ApiProperty({
    description: 'Nombre de la categoría',
    example: 'Exámenes Finales',
    minLength: 1,
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción de la categoría',
    example: 'Categoría para todos los exámenes finales del semestre',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Código corto para identificación rápida',
    example: 'EXAM',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  shortCode?: string;

  /**
   * 🎨 Configuración visual
   */
  @ApiPropertyOptional({
    description: 'Color de la categoría en formato hex',
    example: '#DC2626',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsOptional()
  @IsString()
  @Length(7, 7)
  color?: string;

  @ApiPropertyOptional({
    description: 'Icono de la categoría (emoji o nombre)',
    example: '📝',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'URL de icono personalizado',
    example: 'https://example.com/icons/exam.png',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  iconUrl?: string;

  /**
   * 📊 Estado y visibilidad
   */
  @ApiPropertyOptional({
    description: 'Estado de la categoría',
    example: 'active',
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;

  @ApiPropertyOptional({
    description: 'Visibilidad de la categoría',
    example: 'public',
    enum: CategoryVisibility,
    default: CategoryVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(CategoryVisibility)
  visibility?: CategoryVisibility;

  /**
   * 🔗 Relación jerárquica
   */
  @ApiPropertyOptional({
    description: 'ID de la categoría padre (para jerarquías)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4)
  parentId?: string;

  /**
   * ⚙️ Configuraciones avanzadas
   */
  @ApiPropertyOptional({
    description: 'Configuraciones específicas de la categoría',
    type: CategorySettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CategorySettingsDto)
  settings?: CategorySettingsDto;

  @ApiPropertyOptional({
    description: 'Metadatos y configuración adicional',
    type: CategoryMetadataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CategoryMetadataDto)
  metadata?: CategoryMetadataDto;

  /**
   * 🛡️ Métodos de validación
   */

  /**
   * Valida que el color tenga formato hex válido
   */
  validateColor(): boolean {
    if (!this.color) return true;
    return /^#[0-9A-Fa-f]{6}$/.test(this.color);
  }

  /**
   * Valida configuración de permisos
   */
  validatePermissions(): boolean {
    if (!this.metadata?.permissions) return true;
    
    const permissions = this.metadata.permissions;
    const validRoles = ['student', 'teacher', 'admin', 'coordinator'];
    
    for (const roles of Object.values(permissions)) {
      if (roles && Array.isArray(roles)) {
        if (!roles.every(role => validRoles.includes(role))) {
          return false;
        }
      }
    }
    
    return true;
  }
}