/**
 * 👍 DTOs PARA REACCIONES WEBSOCKET - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Data Transfer Objects para eventos de reacciones en tiempo real:
 * - Validación de reacciones a mensajes
 * - Soporte para diferentes tipos de emojis
 * - Documentación clara y ejemplos
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de validar eventos de reacciones
 * - OCP: Extensible para nuevos tipos de reacciones
 * - LSP: Contratos bien definidos
 * - ISP: Interfaces específicas por evento
 * - DIP: Usa abstracciones de validación
 */

import { IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReactionType } from '../message-reaction.entity';

/**
 * DTO para eventos de reacciones por WebSocket
 * 
 * @description Valida los datos necesarios para agregar o eliminar
 * reacciones a mensajes en tiempo real.
 */
export class ReactionEventDto {
  /**
   * ID del mensaje al que se reacciona
   */
  @ApiProperty({
    description: 'ID único del mensaje al que se está reaccionando',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsString({ message: 'El ID del mensaje es requerido' })
  @IsUUID('4', { message: 'El ID del mensaje debe ser un UUID válido' })
  messageId: string;

  /**
   * ID de la conversación (para broadcasting)
   */
  @ApiProperty({
    description: 'ID único de la conversación donde está el mensaje',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsString({ message: 'El ID de la conversación es requerido' })
  @IsUUID('4', { message: 'El ID de la conversación debe ser un UUID válido' })
  conversationId: string;

  /**
   * Tipo de reacción
   */
  @ApiProperty({
    description: 'Tipo específico de reacción a agregar',
    enum: ReactionType,
    example: ReactionType.LIKE,
    enumName: 'ReactionType',
  })
  @IsEnum(ReactionType, { message: 'Tipo de reacción inválido' })
  reactionType: ReactionType;
}