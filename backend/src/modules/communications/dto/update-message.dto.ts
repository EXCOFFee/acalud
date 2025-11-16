/**
 * 📝 DTO PARA ACTUALIZACIÓN DE MENSAJES
 * 
 * Define la estructura para editar mensajes existentes.
 * Incluye validaciones y limitaciones de tiempo.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  Length,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttachmentDto, MentionDto } from './create-message.dto';

/**
 * 📝 DTO para actualizar mensaje
 */
export class UpdateMessageDto {
  /**
   * 📝 Nuevo contenido del mensaje
   */
  @ApiProperty({
    description: 'Nuevo contenido del mensaje',
    example: 'Hola, ¿cómo están todos? (mensaje editado)',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @Length(1, 2000)
  content: string;

  /**
   * 📎 Nuevos archivos adjuntos
   */
  @ApiPropertyOptional({
    description: 'Nueva lista de archivos adjuntos',
    type: [AttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @ArrayMaxSize(5)
  attachments?: AttachmentDto[];

  /**
   * 👥 Nuevas menciones
   */
  @ApiPropertyOptional({
    description: 'Nueva lista de usuarios mencionados',
    type: [MentionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MentionDto)
  @ArrayMaxSize(10)
  mentions?: MentionDto[];

  /**
   * 🔴 Mensaje importante
   */
  @ApiPropertyOptional({
    description: 'Cambiar importancia del mensaje',
  })
  @IsOptional()
  @IsBoolean()
  isImportant?: boolean;

  /**
   * 📌 Fijar mensaje
   */
  @ApiPropertyOptional({
    description: 'Cambiar estado de fijado del mensaje',
  })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  /**
   * 🏷️ Etiquetas del mensaje
   */
  @ApiPropertyOptional({
    description: 'Nuevas etiquetas del mensaje',
    example: ['tarea', 'matemáticas', 'editado'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  tags?: string[];
}