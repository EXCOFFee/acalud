/**
 * 📝 DTO PARA CREACIÓN DE MENSAJES
 * 
 * Define la estructura y validaciones para enviar mensajes en chats.
 * Soporta diferentes tipos de contenido y funcionalidades avanzadas.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  IsBoolean,
  IsDateString,
  Length,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../message.enums';

/**
 * 📎 DTO para información de archivo adjunto
 */
export class AttachmentDto {
  /**
   * 📝 Nombre del archivo
   */
  @ApiProperty({
    description: 'Nombre del archivo',
    example: 'documento.pdf',
  })
  @IsString()
  filename: string;

  /**
   * 📝 Nombre original del archivo
   */
  @ApiProperty({
    description: 'Nombre original del archivo',
    example: 'Tarea de Matemáticas.pdf',
  })
  @IsString()
  originalName: string;

  /**
   * 🏷️ Tipo MIME del archivo
   */
  @ApiProperty({
    description: 'Tipo MIME del archivo',
    example: 'application/pdf',
  })
  @IsString()
  mimeType: string;

  /**
   * 📦 Tamaño del archivo en bytes
   */
  @ApiProperty({
    description: 'Tamaño del archivo en bytes',
    example: 1024000,
  })
  size: number;

  /**
   * 🔗 URL del archivo
   */
  @ApiProperty({
    description: 'URL para acceder al archivo',
    example: 'https://storage.acalud.com/files/documento.pdf',
  })
  @IsString()
  url: string;

  /**
   * 🖼️ URL de miniatura (para imágenes)
   */
  @ApiPropertyOptional({
    description: 'URL de miniatura para imágenes',
    example: 'https://storage.acalud.com/thumbs/imagen_thumb.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  /**
   * ⏱️ Duración (para audio/video)
   */
  @ApiPropertyOptional({
    description: 'Duración en segundos para archivos de audio/video',
    example: 120,
  })
  @IsOptional()
  duration?: number;

  /**
   * 📐 Dimensiones (para imágenes)
   */
  @ApiPropertyOptional({
    description: 'Dimensiones de la imagen',
    type: 'object',
    example: { width: 1920, height: 1080 },
  })
  @IsOptional()
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * 👤 DTO para mención de usuario
 */
export class MentionDto {
  /**
   * 👤 ID del usuario mencionado
   */
  @ApiProperty({
    description: 'ID del usuario mencionado',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  userId: string;

  /**
   * 📝 Nombre del usuario mencionado
   */
  @ApiProperty({
    description: 'Nombre del usuario mencionado',
    example: 'Juan Pérez',
  })
  @IsString()
  userName: string;

  /**
   * 📍 Posición inicial de la mención en el texto
   */
  @ApiProperty({
    description: 'Índice de inicio de la mención en el texto',
    example: 5,
  })
  startIndex: number;

  /**
   * 📍 Posición final de la mención en el texto
   */
  @ApiProperty({
    description: 'Índice de fin de la mención en el texto',
    example: 15,
  })
  endIndex: number;
}

/**
 * 📝 DTO para crear un nuevo mensaje
 */
export class CreateMessageDto {
  /**
   * 💬 ID del chat
   */
  @ApiProperty({
    description: 'ID del chat donde se enviará el mensaje',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  chatId: string;

  /**
   * 🏷️ Tipo de mensaje
   */
  @ApiPropertyOptional({
    description: 'Tipo de mensaje',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  /**
   * 📝 Contenido del mensaje
   */
  @ApiProperty({
    description: 'Contenido del mensaje',
    example: 'Hola, ¿cómo están todos?',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @Length(1, 2000)
  content: string;

  /**
   * 📎 Archivos adjuntos
   */
  @ApiPropertyOptional({
    description: 'Lista de archivos adjuntos',
    type: [AttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @ArrayMaxSize(5) // Máximo 5 archivos por mensaje
  attachments?: AttachmentDto[];

  /**
   * 👥 Menciones en el mensaje
   */
  @ApiPropertyOptional({
    description: 'Lista de usuarios mencionados',
    type: [MentionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MentionDto)
  @ArrayMaxSize(10) // Máximo 10 menciones por mensaje
  mentions?: MentionDto[];

  /**
   * 💬 ID del mensaje padre (para respuestas)
   */
  @ApiPropertyOptional({
    description: 'ID del mensaje al que se está respondiendo',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string;

  /**
   * 📅 Programar mensaje para envío futuro
   */
  @ApiPropertyOptional({
    description: 'Fecha y hora para envío programado',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  /**
   * 🔴 Mensaje importante
   */
  @ApiPropertyOptional({
    description: 'Marcar como mensaje importante',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isImportant?: boolean;

  /**
   * 📌 Fijar mensaje
   */
  @ApiPropertyOptional({
    description: 'Fijar mensaje en el chat',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  /**
   * 📍 Información de ubicación
   */
  @ApiPropertyOptional({
    description: 'Información de geolocalización',
    type: 'object',
    example: {
      latitude: -34.6037,
      longitude: -58.3816,
      address: 'Buenos Aires, Argentina'
    },
  })
  @IsOptional()
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  /**
   * 🏷️ Etiquetas del mensaje
   */
  @ApiPropertyOptional({
    description: 'Etiquetas para organizar el mensaje',
    example: ['tarea', 'matemáticas', 'urgente'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5) // Máximo 5 etiquetas por mensaje
  tags?: string[];
}