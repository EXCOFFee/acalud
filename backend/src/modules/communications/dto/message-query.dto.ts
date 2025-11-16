/**
 * 📝 DTO PARA CONSULTAS DE MENSAJES
 * 
 * Define los parámetros para buscar y filtrar mensajes.
 * Incluye opciones avanzadas de búsqueda y paginación.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsString,
  IsBoolean,
  IsInt,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType, MessageStatus } from '../message.enums';

/**
 * 📊 DTO para consultas de mensajes
 */
export class MessageQueryDto {
  /**
   * 💬 Filtrar por chat
   */
  @ApiPropertyOptional({
    description: 'ID del chat para filtrar mensajes',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  chatId?: string;

  /**
   * 👤 Filtrar por remitente
   */
  @ApiPropertyOptional({
    description: 'ID del usuario remitente',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  })
  @IsOptional()
  @IsUUID()
  senderId?: string;

  /**
   * 🏷️ Filtrar por tipo de mensaje
   */
  @ApiPropertyOptional({
    description: 'Tipo de mensaje',
    enum: MessageType,
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  /**
   * 📊 Filtrar por estado
   */
  @ApiPropertyOptional({
    description: 'Estado del mensaje',
    enum: MessageStatus,
  })
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  /**
   * 🔍 Búsqueda por contenido
   */
  @ApiPropertyOptional({
    description: 'Buscar en el contenido del mensaje',
    example: 'tarea matemáticas',
  })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * 🏷️ Filtrar por etiquetas
   */
  @ApiPropertyOptional({
    description: 'Filtrar por etiquetas',
    example: 'tarea,urgente',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  /**
   * 📅 Fecha desde
   */
  @ApiPropertyOptional({
    description: 'Mensajes desde esta fecha',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  /**
   * 📅 Fecha hasta
   */
  @ApiPropertyOptional({
    description: 'Mensajes hasta esta fecha',
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  /**
   * 📎 Solo con archivos adjuntos
   */
  @ApiPropertyOptional({
    description: 'Mostrar solo mensajes con archivos adjuntos',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasAttachments?: boolean;

  /**
   * 📌 Solo mensajes fijados
   */
  @ApiPropertyOptional({
    description: 'Mostrar solo mensajes fijados',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  pinnedOnly?: boolean;

  /**
   * 🔴 Solo mensajes importantes
   */
  @ApiPropertyOptional({
    description: 'Mostrar solo mensajes importantes',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  importantOnly?: boolean;

  /**
   * 📄 Página
   */
  @ApiPropertyOptional({
    description: 'Número de página',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * 📊 Límite por página
   */
  @ApiPropertyOptional({
    description: 'Número de elementos por página',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  /**
   * 📈 Ordenar por
   */
  @ApiPropertyOptional({
    description: 'Campo para ordenar',
    enum: ['createdAt', 'updatedAt', 'content'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  /**
   * 🔄 Orden
   */
  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  /**
   * 💬 Incluir respuestas
   */
  @ApiPropertyOptional({
    description: 'Incluir mensajes de respuesta (threads)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeReplies?: boolean = true;
}