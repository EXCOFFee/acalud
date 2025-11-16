/**
 * 📝 DTO PARA CONSULTAS DE CHAT
 * 
 * Define los parámetros de búsqueda y filtrado para chats.
 * Incluye paginación y opciones de ordenamiento.
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
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChatType, ChatStatus } from '../entities/chat.entity';

/**
 * 📊 DTO para consultas de chat
 */
export class ChatQueryDto {
  /**
   * 🏷️ Filtrar por tipo de chat
   */
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de chat',
    enum: ChatType,
  })
  @IsOptional()
  @IsEnum(ChatType)
  type?: ChatType;

  /**
   * 📊 Filtrar por estado de chat
   */
  @ApiPropertyOptional({
    description: 'Filtrar por estado de chat',
    enum: ChatStatus,
  })
  @IsOptional()
  @IsEnum(ChatStatus)
  status?: ChatStatus;

  /**
   * 🏫 Filtrar por aula
   */
  @ApiPropertyOptional({
    description: 'Filtrar por ID de aula',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  /**
   * 🔍 Búsqueda por texto
   */
  @ApiPropertyOptional({
    description: 'Buscar en nombre y descripción',
    example: 'matemáticas',
  })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * 📌 Solo chats fijados
   */
  @ApiPropertyOptional({
    description: 'Mostrar solo chats fijados',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  pinnedOnly?: boolean;

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
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /**
   * 📈 Ordenar por
   */
  @ApiPropertyOptional({
    description: 'Campo para ordenar',
    enum: ['createdAt', 'lastActivity', 'name', 'messageCount'],
    default: 'lastActivity',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'lastActivity';

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
}