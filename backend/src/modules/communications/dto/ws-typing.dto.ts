/**
 * ⌨️ DTOs PARA TYPING STATUS WEBSOCKET - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Data Transfer Objects para eventos de "escribiendo" (typing):
 * - Validación de indicadores de escritura
 * - Soporte para estados typing/not typing
 * - Documentación clara y ejemplos
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de validar eventos de typing
 * - OCP: Extensible para nuevos campos de typing
 * - LSP: Contratos bien definidos
 * - ISP: Interfaces específicas por evento
 * - DIP: Usa abstracciones de validación
 */

import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para eventos de typing status por WebSocket
 * 
 * @description Valida los datos necesarios para indicar que un usuario
 * está escribiendo o dejó de escribir en una conversación.
 */
export class TypingStatusDto {
  /**
   * ID de la conversación donde se está escribiendo
   */
  @ApiProperty({
    description: 'ID único de la conversación donde el usuario está escribiendo',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsString({ message: 'El ID de la conversación es requerido' })
  @IsUUID('4', { message: 'El ID de la conversación debe ser un UUID válido' })
  conversationId: string;
}