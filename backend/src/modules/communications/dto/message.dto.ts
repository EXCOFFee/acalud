/**
 * 💌 DTOs PARA MENSAJES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Data Transfer Objects para operaciones de mensajes:
 * - Validación completa con class-validator
 * - Transformación automática con class-transformer
 * - Documentación Swagger detallada
 * - Tipado fuerte para TypeScript
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Cada DTO maneja una operación específica
 * - OCP: Extensible para nuevos tipos de mensajes
 * - LSP: Contratos bien definidos
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Abstracciones de validación
 */

import { IsString, IsOptional, IsEnum, IsUUID, IsObject, MaxLength, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../message.enums';

/**
 * DTO para crear un nuevo mensaje
 * 
 * @description Valida los datos necesarios para enviar mensajes
 * de diferentes tipos (texto, imagen, archivo, etc.)
 */
export class CreateMessageDto {
  /**
   * Contenido del mensaje
   */
  @ApiProperty({
    description: 'Contenido principal del mensaje',
    example: 'Hola a todos, ¿alguien puede ayudarme con el ejercicio 5?',
    maxLength: 4000,
  })
  @IsString({ message: 'El contenido debe ser una cadena de texto' })
  @MaxLength(4000, { message: 'El contenido no puede superar los 4000 caracteres' })
  content: string;

  /**
   * Tipo de mensaje
   */
  @ApiPropertyOptional({
    description: 'Tipo específico del mensaje',
    enum: MessageType,
    example: MessageType.TEXT,
    default: MessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(MessageType, { message: 'Tipo de mensaje inválido' })
  type?: MessageType;

  /**
   * ID del mensaje padre (para respuestas/hilos)
   */
  @ApiPropertyOptional({
    description: 'ID del mensaje al que se está respondiendo',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del mensaje padre debe ser un UUID válido' })
  parentMessageId?: string;

  /**
   * Metadatos adicionales del mensaje
   */
  @ApiPropertyOptional({
    description: 'Datos adicionales específicos del tipo de mensaje',
    example: {
      mentions: ['@usuario1', '@usuario2'],
      hashtags: ['#matematicas', '#proyecto'],
      priority: 'normal'
    },
  })
  @IsOptional()
  @IsObject({ message: 'Los metadatos deben ser un objeto JSON válido' })
  metadata?: Record<string, unknown>;
}

/**
 * DTO para actualizar un mensaje existente
 * 
 * @description Permite editar mensajes manteniendo historial
 * y aplicando reglas de negocio específicas
 */
export class UpdateMessageDto {
  /**
   * Nuevo contenido del mensaje
   */
  @ApiPropertyOptional({
    description: 'Contenido actualizado del mensaje',
    example: 'Hola a todos, ¿alguien puede ayudarme con el ejercicio 5? [EDITADO]',
    maxLength: 4000,
  })
  @IsOptional()
  @IsString({ message: 'El contenido debe ser una cadena de texto' })
  @MaxLength(4000, { message: 'El contenido no puede superar los 4000 caracteres' })
  content?: string;

  /**
   * Metadatos actualizados
   */
  @ApiPropertyOptional({
    description: 'Metadatos actualizados del mensaje',
    example: {
      mentions: ['@usuario1', '@usuario2', '@usuario3'],
      editReason: 'Corrección de ortografía'
    },
  })
  @IsOptional()
  @IsObject({ message: 'Los metadatos deben ser un objeto JSON válido' })
  metadata?: Record<string, unknown>;
}

/**
 * DTO para filtrar y buscar mensajes
 * 
 * @description Proporciona opciones avanzadas de filtrado
 * para búsquedas eficientes de mensajes
 */
export class MessageFilterDto {
  /**
   * Filtrar por tipo de mensaje
   */
  @ApiPropertyOptional({
    description: 'Filtrar mensajes por tipo específico',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(MessageType, { message: 'Tipo de mensaje inválido' })
  type?: MessageType;

  /**
   * Filtrar por autor
   */
  @ApiPropertyOptional({
    description: 'ID del autor para filtrar mensajes',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del autor debe ser un UUID válido' })
  authorId?: string;

  /**
   * Búsqueda de texto en contenido
   */
  @ApiPropertyOptional({
    description: 'Texto a buscar en el contenido de los mensajes',
    example: 'ejercicio 5',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'El texto de búsqueda debe ser una cadena' })
  @MaxLength(255, { message: 'La búsqueda no puede superar los 255 caracteres' })
  search?: string;

  /**
   * Fecha desde (filtro temporal)
   */
  @ApiPropertyOptional({
    description: 'Fecha de inicio para filtrar mensajes (ISO 8601)',
    example: '2024-12-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateFrom debe ser una fecha válida en formato ISO 8601' })
  dateFrom?: string;

  /**
   * Fecha hasta (filtro temporal)
   */
  @ApiPropertyOptional({
    description: 'Fecha de fin para filtrar mensajes (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'dateTo debe ser una fecha válida en formato ISO 8601' })
  dateTo?: string;

  /**
   * Orden de clasificación
   */
  @ApiPropertyOptional({
    description: 'Orden de los resultados por fecha',
    enum: ['ASC', 'DESC'],
    example: 'ASC',
    default: 'ASC',
  })
  @IsOptional()
  @IsString({ message: 'sortOrder debe ser una cadena' })
  @Transform(({ value }) => value?.toUpperCase())
  sortOrder?: 'ASC' | 'DESC';

  /**
   * Límite de resultados
   */
  @ApiPropertyOptional({
    description: 'Número máximo de mensajes a retornar',
    example: 50,
    minimum: 1,
    maximum: 200,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  /**
   * Desplazamiento para paginación
   */
  @ApiPropertyOptional({
    description: 'Número de mensajes a omitir (paginación)',
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
 * DTO de respuesta para mensaje completo
 * 
 * @description Estructura de datos para respuestas de API
 * con información completa del mensaje
 */
export class MessageResponseDto {
  /**
   * ID único del mensaje
   */
  @ApiProperty({
    description: 'Identificador único del mensaje',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  /**
   * Contenido del mensaje
   */
  @ApiProperty({
    description: 'Contenido principal del mensaje',
    example: 'Hola a todos, ¿alguien puede ayudarme con el ejercicio 5?',
  })
  content: string;

  /**
   * Tipo de mensaje
   */
  @ApiProperty({
    description: 'Tipo específico del mensaje',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  type: MessageType;

  /**
   * Información del autor
   */
  @ApiProperty({
    description: 'Datos básicos del autor del mensaje',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'estudiante01@acalud.edu',
      firstName: 'Juan',
      lastName: 'Pérez'
    },
  })
  author: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };

  /**
   * Indica si el mensaje fue editado
   */
  @ApiProperty({
    description: 'Verdadero si el mensaje ha sido editado',
    example: false,
  })
  isEdited: boolean;

  /**
   * Fecha de edición
   */
  @ApiPropertyOptional({
    description: 'Timestamp de la última edición',
    example: '2024-12-08T10:35:00Z',
  })
  editedAt?: Date;

  /**
   * Número de reacciones
   */
  @ApiProperty({
    description: 'Contador total de reacciones',
    example: 5,
  })
  reactionCount: number;

  /**
   * Número de archivos adjuntos
   */
  @ApiProperty({
    description: 'Contador de archivos adjuntos',
    example: 2,
  })
  attachmentCount: number;

  /**
   * Número de respuestas (hilos)
   */
  @ApiProperty({
    description: 'Contador de mensajes de respuesta',
    example: 3,
  })
  replyCount: number;

  /**
   * Fecha de creación
   */
  @ApiProperty({
    description: 'Timestamp de creación del mensaje',
    example: '2024-12-08T10:30:00Z',
  })
  createdAt: Date;

  /**
   * Metadatos adicionales
   */
  @ApiPropertyOptional({
    description: 'Datos adicionales del mensaje',
    example: {
      mentions: ['@usuario1'],
      hashtags: ['#matematicas'],
      priority: 'normal'
    },
  })
  metadata?: Record<string, unknown>;
}