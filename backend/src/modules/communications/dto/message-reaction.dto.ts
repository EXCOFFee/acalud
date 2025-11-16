/**
 * 😀 DTO PARA REACCIONES DE MENSAJES
 * 
 * Define la estructura para agregar y gestionar reacciones a mensajes.
 * Incluye validaciones y documentación completa.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 😀 DTO para agregar reacción a mensaje
 */
export class AddReactionDto {
  /**
   * 💌 ID del mensaje
   */
  @ApiProperty({
    description: 'ID del mensaje al que se agregará la reacción',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  messageId: string;

  /**
   * 😀 Emoji de la reacción
   */
  @ApiProperty({
    description: 'Emoji para la reacción (unicode o shortcode)',
    example: '👍',
  })
  @IsString()
  @Length(1, 10)
  @Matches(/^(\p{Emoji}|:[a-z_]+:)$/u, {
    message: 'Debe ser un emoji válido o shortcode',
  })
  emoji: string;
}

/**
 * 🗑️ DTO para remover reacción de mensaje
 */
export class RemoveReactionDto {
  /**
   * 💌 ID del mensaje
   */
  @ApiProperty({
    description: 'ID del mensaje del que se removerá la reacción',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  messageId: string;

  /**
   * 😀 Emoji de la reacción a remover
   */
  @ApiProperty({
    description: 'Emoji de la reacción a remover',
    example: '👍',
  })
  @IsString()
  @Length(1, 10)
  emoji: string;
}