/**
 * 🏠 DTOs PARA ROOMS/CONVERSACIONES WEBSOCKET - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Data Transfer Objects para eventos de unirse/abandonar conversaciones:
 * - Validación específica para WebSocket events
 * - Documentación clara de cada campo
 * - Tipado fuerte para TypeScript
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de validar eventos de rooms
 * - OCP: Extensible para nuevos campos
 * - LSP: Contratos bien definidos
 * - ISP: Interfaces específicas por evento
 * - DIP: Usa abstracciones de validación
 */

import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para unirse a una conversación por WebSocket
 * 
 * @description Valida los datos necesarios para que un usuario
 * se una a una conversación en tiempo real.
 */
export class JoinConversationDto {
  /**
   * ID de la conversación a la que unirse
   */
  @ApiProperty({
    description: 'ID único de la conversación a la que el usuario se quiere unir',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsString({ message: 'El ID de la conversación es requerido' })
  @IsUUID('4', { message: 'El ID de la conversación debe ser un UUID válido' })
  conversationId: string;
}

/**
 * DTO para abandonar una conversación por WebSocket
 * 
 * @description Valida los datos necesarios para que un usuario
 * abandone una conversación en tiempo real.
 */
export class LeaveConversationDto {
  /**
   * ID de la conversación a abandonar
   */
  @ApiProperty({
    description: 'ID único de la conversación que el usuario quiere abandonar',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsString({ message: 'El ID de la conversación es requerido' })
  @IsUUID('4', { message: 'El ID de la conversación debe ser un UUID válido' })
  conversationId: string;
}