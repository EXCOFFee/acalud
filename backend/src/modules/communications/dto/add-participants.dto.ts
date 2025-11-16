/**
 * 👥 DTO PARA GESTIÓN DE PARTICIPANTES
 * 
 * Define la estructura para agregar y remover participantes de chats.
 * Incluye validaciones y opciones de configuración.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsArray,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 👥 DTO para agregar participantes a chat
 */
export class AddParticipantsDto {
  /**
   * 👤 IDs de usuarios a agregar
   */
  @ApiProperty({
    description: 'Lista de IDs de usuarios a agregar al chat',
    example: [
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      'f47ac10b-58cc-4372-a567-0e02b2c3d480'
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20) // Máximo 20 usuarios por operación
  @IsUUID(4, { each: true })
  userIds: string[];

  /**
   * 📢 Notificar a los nuevos participantes
   */
  @ApiPropertyOptional({
    description: 'Enviar notificación a los nuevos participantes',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyParticipants?: boolean = true;

  /**
   * 📝 Mensaje de bienvenida personalizado
   */
  @ApiPropertyOptional({
    description: 'Mensaje de bienvenida para los nuevos participantes',
    example: 'Bienvenidos al chat de Matemáticas',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  welcomeMessage?: string;
}

/**
 * 🚪 DTO para remover participantes de chat
 */
export class RemoveParticipantsDto {
  /**
   * 👤 IDs de usuarios a remover
   */
  @ApiProperty({
    description: 'Lista de IDs de usuarios a remover del chat',
    example: [
      'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10) // Máximo 10 usuarios por operación
  @IsUUID(4, { each: true })
  userIds: string[];

  /**
   * 📝 Razón de la remoción
   */
  @ApiPropertyOptional({
    description: 'Razón por la cual se remueven los participantes',
    example: 'Comportamiento inapropiado',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  reason?: string;

  /**
   * 📢 Notificar sobre la remoción
   */
  @ApiPropertyOptional({
    description: 'Notificar a otros participantes sobre la remoción',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyOthers?: boolean = false;
}

/**
 * 🚪 DTO para abandonar chat
 */
export class LeaveChatDto {
  /**
   * 📝 Mensaje de despedida
   */
  @ApiPropertyOptional({
    description: 'Mensaje de despedida opcional',
    example: 'Gracias por todo, nos vemos pronto',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  farewellMessage?: string;

  /**
   * 📢 Notificar salida
   */
  @ApiPropertyOptional({
    description: 'Enviar notificación sobre la salida del chat',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyExit?: boolean = true;
}