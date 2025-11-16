/**
 * 👍 DTOs PARA REACCIONES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Data Transfer Objects para operaciones de reacciones:
 * - Validación específica de tipos de reacción
 * - Documentación Swagger completa
 * - Tipado fuerte para TypeScript
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de validar reacciones
 * - OCP: Extensible para nuevos tipos de reacciones
 * - LSP: Contratos bien definidos
 * - ISP: Interface específica para reacciones
 * - DIP: Usa abstracciones de validación
 */

import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReactionType } from '../message-reaction.entity';

/**
 * DTO para crear o actualizar una reacción
 * 
 * @description Valida el tipo de reacción que un usuario
 * puede agregar a un mensaje específico
 */
export class CreateReactionDto {
  /**
   * Tipo de reacción
   */
  @ApiProperty({
    description: 'Tipo específico de reacción al mensaje',
    enum: ReactionType,
    example: ReactionType.LIKE,
    enumName: 'ReactionType',
  })
  @IsEnum(ReactionType, { message: 'Tipo de reacción inválido' })
  type: ReactionType;
}

/**
 * DTO de respuesta para reacción
 * 
 * @description Estructura de datos para respuestas de API
 * con información de la reacción creada
 */
export class ReactionResponseDto {
  /**
   * ID único de la reacción
   */
  @ApiProperty({
    description: 'Identificador único de la reacción',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  /**
   * Tipo de reacción
   */
  @ApiProperty({
    description: 'Tipo específico de reacción',
    enum: ReactionType,
    example: ReactionType.LIKE,
  })
  type: ReactionType;

  /**
   * Emoji correspondiente
   */
  @ApiProperty({
    description: 'Emoji unicode que representa la reacción',
    example: '👍',
  })
  emoji: string;

  /**
   * ID del usuario que reaccionó
   */
  @ApiProperty({
    description: 'Identificador del usuario que creó la reacción',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  /**
   * ID del mensaje reaccionado
   */
  @ApiProperty({
    description: 'Identificador del mensaje que recibió la reacción',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  messageId: string;

  /**
   * Fecha de creación
   */
  @ApiProperty({
    description: 'Timestamp de cuando se creó la reacción',
    example: '2024-12-08T10:30:00Z',
  })
  createdAt: Date;
}