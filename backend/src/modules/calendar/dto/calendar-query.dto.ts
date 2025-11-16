/**
 * 🔍 CALENDAR QUERY DTO - CONSULTAS Y FILTROS DEL CALENDARIO
 * 
 * DTOs para consultas avanzadas, filtros y búsquedas en el
 * sistema de calendario académico.
 * 
 * FUNCIONALIDADES:
 * - Filtros por fechas y tipos
 * - Búsqueda de texto completo
 * - Paginación y ordenamiento
 * - Filtros por usuario/rol
 * - Agregaciones y estadísticas
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
  IsDateString,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  EventType,
  EventStatus,
  RecurrenceType,
  LocationType,
} from '../entities/event.entity';
import {
  CategoryVisibility,
  CategoryStatus,
} from '../entities/event-category.entity';
import {
  InvitationStatus,
  AttendanceStatus,
  AttendeeRole,
} from '../entities/event-attendee.entity';

/**
 * 📅 DTO para consultas de eventos
 */
export class EventQueryDto {
  /**
   * 🗓️ Filtros por fecha
   */
  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango de búsqueda',
    example: '2024-06-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango de búsqueda',
    example: '2024-06-30T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Buscar solo eventos de hoy',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  today?: boolean;

  @ApiPropertyOptional({
    description: 'Buscar solo eventos de esta semana',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  thisWeek?: boolean;

  @ApiPropertyOptional({
    description: 'Buscar solo eventos de este mes',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  thisMonth?: boolean;

  /**
   * 🏷️ Filtros por tipo y estado
   */
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de evento',
    example: 'exam',
    enum: EventType,
  })
  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @ApiPropertyOptional({
    description: 'Filtrar por múltiples tipos de evento',
    example: ['exam', 'class'],
    enum: EventType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(EventType, { each: true })
  types?: EventType[];

  @ApiPropertyOptional({
    description: 'Filtrar por estado del evento',
    example: 'published',
    enum: EventStatus,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por múltiples estados',
    example: ['published', 'in_progress'],
    enum: EventStatus,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(EventStatus, { each: true })
  statuses?: EventStatus[];

  /**
   * 📍 Filtros por ubicación
   */
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de ubicación',
    example: 'physical',
    enum: LocationType,
  })
  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @ApiPropertyOptional({
    description: 'Buscar en nombre de ubicación',
    example: 'Aula Magna',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  locationName?: string;

  /**
   * 👥 Filtros por participantes
   */
  @ApiPropertyOptional({
    description: 'Filtrar eventos donde participa este usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4)
  participantId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar eventos creados por este usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4)
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por rol del usuario en el evento',
    example: 'organizer',
    enum: AttendeeRole,
  })
  @IsOptional()
  @IsEnum(AttendeeRole)
  userRole?: AttendeeRole;

  /**
   * 🏷️ Filtros por categoría
   */
  @ApiPropertyOptional({
    description: 'Filtrar por categoría específica',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4)
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por múltiples categorías',
    example: ['cat1-uuid', 'cat2-uuid'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  categoryIds?: string[];

  /**
   * 🔍 Búsqueda de texto
   */
  @ApiPropertyOptional({
    description: 'Búsqueda de texto en título y descripción',
    example: 'examen final matematicas',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  search?: string;

  @ApiPropertyOptional({
    description: 'Buscar solo en títulos',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  searchTitleOnly?: boolean;

  /**
   * 🔄 Filtros por recurrencia
   */
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de recurrencia',
    example: 'weekly',
    enum: RecurrenceType,
  })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrenceType?: RecurrenceType;

  @ApiPropertyOptional({
    description: 'Solo eventos recurrentes',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  recurringOnly?: boolean;

  /**
   * 📄 Paginación y ordenamiento
   */
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
    description: 'Campo para ordenar',
    example: 'startDate',
    enum: ['startDate', 'endDate', 'title', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsEnum(['startDate', 'endDate', 'title', 'createdAt', 'updatedAt'])
  sortBy?: 'startDate' | 'endDate' | 'title' | 'createdAt' | 'updatedAt';

  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento',
    example: 'asc',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';

  /**
   * 📈 Opciones adicionales
   */
  @ApiPropertyOptional({
    description: 'Incluir eventos privados (solo para organizadores)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includePrivate?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir estadísticas en la respuesta',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeStats?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir información de asistentes',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAttendees?: boolean;
}

/**
 * 🏷️ DTO para consultas de categorías
 */
export class CategoryQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado de categoría',
    example: 'active',
    enum: CategoryStatus,
  })
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por visibilidad',
    example: 'public',
    enum: CategoryVisibility,
  })
  @IsOptional()
  @IsEnum(CategoryVisibility)
  visibility?: CategoryVisibility;

  @ApiPropertyOptional({
    description: 'ID de categoría padre (para jerarquías)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID(4)
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Solo categorías raíz (sin padre)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  rootOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Búsqueda en nombre de categoría',
    example: 'examenes',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Incluir estadísticas de uso',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeStats?: boolean;

  // Heredar paginación de EventQueryDto
  @ApiPropertyOptional({ description: 'Número de página', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * 👥 DTO para consultas de asistentes
 */
export class AttendeeQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por estado de invitación',
    example: 'accepted',
    enum: InvitationStatus,
  })
  @IsOptional()
  @IsEnum(InvitationStatus)
  invitationStatus?: InvitationStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por estado de asistencia',
    example: 'present',
    enum: AttendanceStatus,
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  attendanceStatus?: AttendanceStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por rol del asistente',
    example: 'participant',
    enum: AttendeeRole,
  })
  @IsOptional()
  @IsEnum(AttendeeRole)
  role?: AttendeeRole;

  @ApiPropertyOptional({
    description: 'Solo asistentes que han respondido',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  respondedOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Solo asistentes que asistieron',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  attendedOnly?: boolean;

  // Paginación
  @ApiPropertyOptional({ description: 'Número de página', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

/**
 * 📈 DTO para consultas de estadísticas
 */
export class CalendarStatsQueryDto {
  @ApiPropertyOptional({
    description: 'Fecha de inicio para estadísticas',
    example: '2024-06-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin para estadísticas',
    example: '2024-06-30T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Agrupar por período',
    example: 'week',
    enum: ['day', 'week', 'month', 'year'],
  })
  @IsOptional()
  @IsEnum(['day', 'week', 'month', 'year'])
  groupBy?: 'day' | 'week' | 'month' | 'year';

  @ApiPropertyOptional({
    description: 'Incluir estadísticas de asistencia',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAttendance?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir estadísticas por categoría',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCategories?: boolean;

  @ApiPropertyOptional({
    description: 'Incluir estadísticas por tipo de evento',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeTypes?: boolean;
}