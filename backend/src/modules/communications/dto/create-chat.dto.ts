/**
 * 📝 DTO PARA CREACIÓN DE CHAT
 * 
 * Define la estructura y validaciones para crear un nuevo chat.
 * Soporta diferentes tipos de chat con configuraciones específicas.
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
  Length,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatType } from '../entities/chat.entity';

/**
 * 📝 DTO para crear un nuevo chat
 */
export class CreateChatDto {
  /**
   * 📝 Nombre del chat
   */
  @ApiPropertyOptional({
    description: 'Nombre del chat (opcional para chats individuales)',
    example: 'Chat de Matemáticas - Grupo A',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  /**
   * 📄 Descripción del chat
   */
  @ApiPropertyOptional({
    description: 'Descripción del chat',
    example: 'Chat para discutir temas relacionados con álgebra y geometría',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  /**
   * 🏷️ Tipo de chat
   */
  @ApiProperty({
    description: 'Tipo de chat',
    enum: ChatType,
    example: ChatType.GROUP,
  })
  @IsEnum(ChatType)
  type: ChatType;

  /**
   * 🏫 ID del aula asociada (para chats de aula)
   */
  @ApiPropertyOptional({
    description: 'ID del aula asociada (requerido para chats de aula)',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  /**
   * 👥 IDs de los participantes iniciales
   */
  @ApiProperty({
    description: 'Lista de IDs de usuarios a agregar como participantes',
    example: [
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      'f47ac10b-58cc-4372-a567-0e02b2c3d480'
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(4, { each: true })
  participantIds: string[];

  /**
   * 🎨 Avatar del chat
   */
  @ApiPropertyOptional({
    description: 'URL del avatar del chat',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  /**
   * 🔒 Chat privado (solo por invitación)
   */
  @ApiPropertyOptional({
    description: 'Si el chat es privado (solo por invitación)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  /**
   * 📌 Chat fijado
   */
  @ApiPropertyOptional({
    description: 'Si el chat debe aparecer fijado',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  /**
   * ⚙️ Configuración inicial del chat
   */
  @ApiPropertyOptional({
    description: 'Configuración inicial del chat',
    type: 'object',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatSettingsDto)
  settings?: ChatSettingsDto;
}

/**
 * ⚙️ DTO para configuración de chat
 */
export class ChatSettingsDto {
  /**
   * 📎 Permitir subida de archivos
   */
  @ApiPropertyOptional({
    description: 'Permitir subida de archivos',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowFileUploads?: boolean;

  /**
   * 📦 Tamaño máximo de archivo (MB)
   */
  @ApiPropertyOptional({
    description: 'Tamaño máximo de archivo en MB',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  maxFileSize?: number;

  /**
   * 📋 Tipos de archivo permitidos
   */
  @ApiPropertyOptional({
    description: 'Tipos MIME de archivos permitidos',
    example: ['image/jpeg', 'image/png', 'application/pdf'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFileTypes?: string[];

  /**
   * 🛡️ Moderación habilitada
   */
  @ApiPropertyOptional({
    description: 'Habilitar moderación automática',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  moderationEnabled?: boolean;

  /**
   * 🗑️ Auto-eliminación de mensajes
   */
  @ApiPropertyOptional({
    description: 'Auto-eliminar mensajes después de X días',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoDeleteMessages?: boolean;

  /**
   * 📅 Días para auto-eliminación
   */
  @ApiPropertyOptional({
    description: 'Número de días antes de auto-eliminar',
    default: 90,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  autoDeleteDays?: number;

  /**
   * 👤 Permitir menciones
   */
  @ApiPropertyOptional({
    description: 'Permitir menciones a otros usuarios',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowMentions?: boolean;

  /**
   * 😀 Permitir emojis
   */
  @ApiPropertyOptional({
    description: 'Permitir reacciones con emojis',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  allowEmojis?: boolean;
}