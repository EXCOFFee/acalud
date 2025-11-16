/**
 * 📝 DTO PARA ACTUALIZACIÓN DE CHAT
 * 
 * Define la estructura para actualizar información de chats existentes.
 * Incluye validaciones y campos opcionales.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChatStatus } from '../entities/chat.entity';
import { ChatSettingsDto } from './create-chat.dto';

/**
 * 📝 DTO para actualizar chat
 */
export class UpdateChatDto {
  /**
   * 📝 Nombre del chat
   */
  @ApiPropertyOptional({
    description: 'Nuevo nombre del chat',
    example: 'Chat de Matemáticas - Grupo A Actualizado',
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
    description: 'Nueva descripción del chat',
    example: 'Chat actualizado para discutir temas avanzados de matemáticas',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  description?: string;

  /**
   * 📊 Estado del chat
   */
  @ApiPropertyOptional({
    description: 'Nuevo estado del chat',
    enum: ChatStatus,
  })
  @IsOptional()
  @IsEnum(ChatStatus)
  status?: ChatStatus;

  /**
   * 🎨 Avatar del chat
   */
  @ApiPropertyOptional({
    description: 'Nueva URL del avatar del chat',
    example: 'https://example.com/new-avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  /**
   * 📌 Chat fijado
   */
  @ApiPropertyOptional({
    description: 'Cambiar estado de fijado del chat',
  })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  /**
   * 🔇 Chat silenciado
   */
  @ApiPropertyOptional({
    description: 'Cambiar estado de silenciado del chat',
  })
  @IsOptional()
  @IsBoolean()
  isMuted?: boolean;

  /**
   * 🔒 Chat privado
   */
  @ApiPropertyOptional({
    description: 'Cambiar privacidad del chat',
  })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  /**
   * ⚙️ Configuración del chat
   */
  @ApiPropertyOptional({
    description: 'Nueva configuración del chat',
    type: ChatSettingsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChatSettingsDto)
  settings?: ChatSettingsDto;
}