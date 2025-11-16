/**
 * 📝 DTOs PARA CONVERSACIONES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Data Transfer Objects para operaciones de conversaciones:
 * - Validación de entrada con class-validator
 * - Transformación de datos con class-transformer
 * - Documentación automática con Swagger
 * - Tipado fuerte para TypeScript
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Cada DTO tiene responsabilidad específica
 * - OCP: Extensible para nuevos campos
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por operación
 * - DIP: Usa abstracciones de validación
 */

import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsUUID, IsObject, Length, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationType, ConversationStatus } from '../conversation.entity';

/**
 * DTO para crear una nueva conversación
 * 
 * @description Valida los datos necesarios para crear conversaciones
 * de diferentes tipos (directa, grupal, foro, etc.)
 */
export class CreateConversationDto {
  /**
   * Título de la conversación
   */
  @ApiProperty({
    description: 'Título descriptivo de la conversación',
    example: 'Discusión sobre el Proyecto Final',
    minLength: 1,
    maxLength: 255,
  })
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @Length(1, 255, { message: 'El título debe tener entre 1 y 255 caracteres' })
  title: string;

  /**
   * Descripción opcional de la conversación
   */
  @ApiPropertyOptional({
    description: 'Descripción detallada del propósito de la conversación',
    example: 'Espacio para coordinación y resolución de dudas del proyecto final de matemáticas',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @MaxLength(1000, { message: 'La descripción no puede superar los 1000 caracteres' })
  description?: string;

  /**
   * Tipo de conversación
   */
  @ApiProperty({
    description: 'Tipo específico de conversación',
    enum: ConversationType,
    example: ConversationType.CLASSROOM_CHAT,
  })
  @IsEnum(ConversationType, { message: 'Tipo de conversación inválido' })
  type: ConversationType;

  /**
   * Indica si la conversación es privada
   */
  @ApiPropertyOptional({
    description: 'Si es verdadero, solo participantes pueden ver la conversación',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPrivate debe ser un valor booleano' })
  @Type(() => Boolean)
  isPrivate?: boolean;

  /**
   * IDs de usuarios participantes iniciales
   */
  @ApiPropertyOptional({
    description: 'Lista de IDs de usuarios que participarán inicialmente',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
  })
  @IsOptional()
  @IsArray({ message: 'participantIds debe ser un array' })
  @IsUUID('4', { each: true, message: 'Cada ID de participante debe ser un UUID válido' })
  participantIds?: string[];

  /**
   * ID del aula asociada (opcional)
   */
  @ApiPropertyOptional({
    description: 'ID del aula donde se desarrolla la conversación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del aula debe ser un UUID válido' })
  classroomId?: string;

  /**
   * Metadatos adicionales en formato JSON
   */
  @ApiPropertyOptional({
    description: 'Datos adicionales específicos del tipo de conversación',
    example: {
      tags: ['matematicas', 'proyecto'],
      priority: 'high',
      dueDate: '2024-12-31T23:59:59Z'
    },
  })
  @IsOptional()
  @IsObject({ message: 'Los metadatos deben ser un objeto JSON válido' })
  metadata?: Record<string, unknown>;
}

/**
 * DTO para actualizar una conversación existente
 * 
 * @description Permite modificar campos específicos de conversaciones
 * manteniendo integridad de datos y permisos
 */
export class UpdateConversationDto {
  /**
   * Nuevo título (opcional)
   */
  @ApiPropertyOptional({
    description: 'Nuevo título para la conversación',
    example: 'Discusión sobre Proyecto Final - Actualizado',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @Length(1, 255, { message: 'El título debe tener entre 1 y 255 caracteres' })
  title?: string;

  /**
   * Nueva descripción (opcional)
   */
  @ApiPropertyOptional({
    description: 'Nueva descripción de la conversación',
    example: 'Descripción actualizada con nuevos objetivos',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @MaxLength(1000, { message: 'La descripción no puede superar los 1000 caracteres' })
  description?: string;

  /**
   * Nuevo estado de la conversación
   */
  @ApiPropertyOptional({
    description: 'Estado actualizado de la conversación',
    enum: ConversationStatus,
    example: ConversationStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ConversationStatus, { message: 'Estado de conversación inválido' })
  status?: ConversationStatus;

  /**
   * Cambiar privacidad
   */
  @ApiPropertyOptional({
    description: 'Modificar configuración de privacidad',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPrivate debe ser un valor booleano' })
  @Type(() => Boolean)
  isPrivate?: boolean;

  /**
   * Metadatos actualizados
   */
  @ApiPropertyOptional({
    description: 'Metadatos actualizados de la conversación',
    example: {
      tags: ['matematicas', 'proyecto', 'urgente'],
      priority: 'critical'
    },
  })
  @IsOptional()
  @IsObject({ message: 'Los metadatos deben ser un objeto JSON válido' })
  metadata?: Record<string, unknown>;
}

/**
 * DTO para filtrar y buscar conversaciones
 * 
 * @description Proporciona opciones avanzadas de filtrado
 * para consultas eficientes de conversaciones
 */
export class ConversationFilterDto {
  /**
   * Filtrar por tipo de conversación
   */
  @ApiPropertyOptional({
    description: 'Filtrar conversaciones por tipo específico',
    enum: ConversationType,
    example: ConversationType.CLASSROOM_CHAT,
  })
  @IsOptional()
  @IsEnum(ConversationType, { message: 'Tipo de conversación inválido' })
  type?: ConversationType;

  /**
   * Filtrar por estado
   */
  @ApiPropertyOptional({
    description: 'Filtrar por estado de la conversación',
    enum: ConversationStatus,
    example: ConversationStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ConversationStatus, { message: 'Estado de conversación inválido' })
  status?: ConversationStatus;

  /**
   * Filtrar por aula específica
   */
  @ApiPropertyOptional({
    description: 'ID del aula para filtrar conversaciones',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del aula debe ser un UUID válido' })
  classroomId?: string;

  /**
   * Filtrar por privacidad
   */
  @ApiPropertyOptional({
    description: 'Filtrar conversaciones privadas o públicas',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPrivate debe ser un valor booleano' })
  @Type(() => Boolean)
  isPrivate?: boolean;

  /**
   * Límite de resultados
   */
  @ApiPropertyOptional({
    description: 'Número máximo de conversaciones a retornar',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  /**
   * Desplazamiento para paginación
   */
  @ApiPropertyOptional({
    description: 'Número de conversaciones a omitir (paginación)',
    example: 0,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  offset?: number;
}

/**
 * DTO de respuesta para conversación completa
 * 
 * @description Estructura de datos para respuestas de API
 * con información completa de conversaciones
 */
export class ConversationResponseDto {
  /**
   * ID único de la conversación
   */
  @ApiProperty({
    description: 'Identificador único de la conversación',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  /**
   * Título de la conversación
   */
  @ApiProperty({
    description: 'Título descriptivo',
    example: 'Discusión sobre el Proyecto Final',
  })
  title: string;

  /**
   * Descripción de la conversación
   */
  @ApiPropertyOptional({
    description: 'Descripción detallada',
    example: 'Espacio para coordinación del proyecto final',
  })
  description?: string;

  /**
   * Tipo de conversación
   */
  @ApiProperty({
    description: 'Tipo específico de conversación',
    enum: ConversationType,
    example: ConversationType.CLASSROOM_CHAT,
  })
  type: ConversationType;

  /**
   * Estado actual
   */
  @ApiProperty({
    description: 'Estado actual de la conversación',
    enum: ConversationStatus,
    example: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  /**
   * Configuración de privacidad
   */
  @ApiProperty({
    description: 'Indica si es conversación privada',
    example: false,
  })
  isPrivate: boolean;

  /**
   * Número total de mensajes
   */
  @ApiProperty({
    description: 'Cantidad total de mensajes en la conversación',
    example: 42,
  })
  messageCount: number;

  /**
   * Número de participantes
   */
  @ApiProperty({
    description: 'Cantidad de usuarios participantes',
    example: 5,
  })
  participantCount: number;

  /**
   * Fecha de última actividad
   */
  @ApiProperty({
    description: 'Timestamp de la última actividad',
    example: '2024-12-08T10:30:00Z',
  })
  lastActivityAt: Date;

  /**
   * Fecha de creación
   */
  @ApiProperty({
    description: 'Timestamp de creación de la conversación',
    example: '2024-12-01T09:00:00Z',
  })
  createdAt: Date;

  /**
   * Metadatos adicionales
   */
  @ApiPropertyOptional({
    description: 'Datos adicionales de la conversación',
    example: {
      tags: ['matematicas', 'proyecto'],
      priority: 'high'
    },
  })
  metadata?: Record<string, unknown>;
}