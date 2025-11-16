/**
 * 💌 DTOs PARA MENSAJES WEBSOCKET - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Data Transfer Objects para eventos de mensajes en tiempo real:
 * - Validación específica para WebSocket message events
 * - Soporte para diferentes tipos de contenido
 * - Documentación clara y ejemplos
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de validar mensajes WebSocket
 * - OCP: Extensible para nuevos tipos de mensajes
 * - LSP: Contratos bien definidos
 * - ISP: Interfaces específicas por evento
 * - DIP: Usa abstracciones de validación
 */

import { IsString, IsOptional, IsEnum, IsUUID, IsObject, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../message.enums';

/**
 * DTO para enviar mensajes por WebSocket
 * 
 * @description Valida los datos necesarios para enviar un mensaje
 * en tiempo real a través de WebSocket.
 */
export class SendMessageDto {
  /**
   * ID de la conversación donde enviar el mensaje
   */
  @ApiProperty({
    description: 'ID único de la conversación donde se enviará el mensaje',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsString({ message: 'El ID de la conversación es requerido' })
  @IsUUID('4', { message: 'El ID de la conversación debe ser un UUID válido' })
  conversationId: string;

  /**
   * Contenido del mensaje
   */
  @ApiProperty({
    description: 'Contenido principal del mensaje',
    example: 'Hola a todos, ¿cómo están?',
    maxLength: 4000,
  })
  @IsString({ message: 'El contenido del mensaje es requerido' })
  @MaxLength(4000, { message: 'El contenido no puede superar los 4000 caracteres' })
  content: string;

  /**
   * Tipo de mensaje (opcional, por defecto TEXT)
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
   * ID del mensaje padre para respuestas/hilos (opcional)
   */
  @ApiPropertyOptional({
    description: 'ID del mensaje al que se está respondiendo',
    example: '550e8400-e29b-41d4-a716-446655440001',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID del mensaje padre debe ser un UUID válido' })
  parentMessageId?: string;

  /**
   * Metadatos adicionales del mensaje (opcional)
   */
  @ApiPropertyOptional({
    description: 'Datos adicionales del mensaje como menciones, hashtags, etc.',
    example: {
      mentions: ['@usuario1', '@usuario2'],
      hashtags: ['#importante', '#proyecto'],
      priority: 'normal'
    },
  })
  @IsOptional()
  @IsObject({ message: 'Los metadatos deben ser un objeto JSON válido' })
  metadata?: Record<string, unknown>;
}