/**
 * 📎 DTOs PARA ARCHIVOS ADJUNTOS - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Data Transfer Objects para operaciones de archivos:
 * - Validación completa de archivos y metadatos
 * - Documentación Swagger detallada
 * - Tipado fuerte para TypeScript
 * - Soporte para múltiples tipos de archivos
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de validar archivos
 * - OCP: Extensible para nuevos tipos de archivos
 * - LSP: Contratos bien definidos
 * - ISP: Interfaces específicas por tipo de archivo
 * - DIP: Usa abstracciones de validación
 */

import { IsString, IsOptional, IsEnum, IsNumber, IsObject, IsBoolean, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttachmentType } from '../message-attachment.entity';

/**
 * DTO para crear un archivo adjunto
 * 
 * @description Valida los datos necesarios para subir archivos
 * adjuntos a mensajes, incluyendo metadatos específicos
 */
export class CreateAttachmentDto {
  /**
   * Tipo de archivo adjunto
   */
  @ApiProperty({
    description: 'Tipo específico del archivo adjunto',
    enum: AttachmentType,
    example: AttachmentType.IMAGE,
    enumName: 'AttachmentType',
  })
  @IsEnum(AttachmentType, { message: 'Tipo de archivo inválido' })
  type: AttachmentType;

  /**
   * Nombre original del archivo
   */
  @ApiProperty({
    description: 'Nombre original del archivo subido por el usuario',
    example: 'mi_proyecto_matematicas.pdf',
    maxLength: 255,
  })
  @IsString({ message: 'El nombre original debe ser una cadena de texto' })
  @MaxLength(255, { message: 'El nombre original no puede superar los 255 caracteres' })
  originalName: string;

  /**
   * Nombre del archivo en el sistema
   */
  @ApiProperty({
    description: 'Nombre único del archivo en el sistema de almacenamiento',
    example: '2024-12-08_15-30-45_abc123def456.pdf',
    maxLength: 255,
  })
  @IsString({ message: 'El nombre del archivo debe ser una cadena de texto' })
  @MaxLength(255, { message: 'El nombre del archivo no puede superar los 255 caracteres' })
  fileName: string;

  /**
   * Ruta o URL del archivo
   */
  @ApiProperty({
    description: 'Ruta completa o URL donde está almacenado el archivo',
    example: '/uploads/attachments/2024/12/08/abc123def456.pdf',
  })
  @IsString({ message: 'La ruta del archivo debe ser una cadena de texto' })
  filePath: string;

  /**
   * Tipo MIME del archivo
   */
  @ApiProperty({
    description: 'Tipo MIME para determinación de contenido',
    example: 'application/pdf',
    maxLength: 100,
  })
  @IsString({ message: 'El tipo MIME debe ser una cadena de texto' })
  @MaxLength(100, { message: 'El tipo MIME no puede superar los 100 caracteres' })
  mimeType: string;

  /**
   * Tamaño del archivo en bytes
   */
  @ApiProperty({
    description: 'Tamaño del archivo en bytes',
    example: 2048576,
    minimum: 1,
    maximum: 104857600, // 100MB
  })
  @IsNumber({}, { message: 'El tamaño debe ser un número' })
  @Min(1, { message: 'El tamaño debe ser mayor a 0' })
  @Max(104857600, { message: 'El archivo no puede superar los 100MB' })
  size: number;

  /**
   * Hash del archivo (opcional)
   */
  @ApiPropertyOptional({
    description: 'Hash SHA-256 del archivo para detección de duplicados',
    example: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
    maxLength: 64,
  })
  @IsOptional()
  @IsString({ message: 'El hash debe ser una cadena de texto' })
  @MaxLength(64, { message: 'El hash no puede superar los 64 caracteres' })
  fileHash?: string;

  /**
   * URL del thumbnail (opcional)
   */
  @ApiPropertyOptional({
    description: 'URL del thumbnail generado automáticamente',
    example: '/uploads/thumbnails/2024/12/08/abc123def456_thumb.jpg',
  })
  @IsOptional()
  @IsString({ message: 'La URL del thumbnail debe ser una cadena de texto' })
  thumbnailUrl?: string;

  /**
   * Metadatos específicos del archivo
   */
  @ApiPropertyOptional({
    description: 'Metadatos específicos según el tipo de archivo',
    example: {
      image: {
        width: 1920,
        height: 1080,
        format: 'JPEG',
        hasAlpha: false,
        colorSpace: 'sRGB'
      }
    },
  })
  @IsOptional()
  @IsObject({ message: 'Los metadatos deben ser un objeto JSON válido' })
  metadata?: Record<string, unknown>;

  /**
   * Indica si el archivo fue escaneado
   */
  @ApiPropertyOptional({
    description: 'Indica si el archivo fue escaneado por antivirus',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isScanned debe ser un valor booleano' })
  isScanned?: boolean;

  /**
   * Resultado del escaneo
   */
  @ApiPropertyOptional({
    description: 'Resultado del escaneo de seguridad',
    enum: ['clean', 'infected', 'suspicious', 'error'],
    example: 'clean',
  })
  @IsOptional()
  @IsString({ message: 'El resultado del escaneo debe ser una cadena de texto' })
  scanResult?: 'clean' | 'infected' | 'suspicious' | 'error';

  /**
   * Fecha de expiración (opcional)
   */
  @ApiPropertyOptional({
    description: 'Fecha de expiración para archivos temporales',
    example: '2025-01-08T15:30:45Z',
  })
  @IsOptional()
  @IsString({ message: 'La fecha de expiración debe ser una cadena de texto' })
  expiresAt?: string;
}

/**
 * DTO de respuesta para archivo adjunto
 * 
 * @description Estructura de datos para respuestas de API
 * con información completa del archivo adjunto
 */
export class AttachmentResponseDto {
  /**
   * ID único del archivo adjunto
   */
  @ApiProperty({
    description: 'Identificador único del archivo adjunto',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  /**
   * Tipo de archivo
   */
  @ApiProperty({
    description: 'Tipo específico del archivo',
    enum: AttachmentType,
    example: AttachmentType.IMAGE,
  })
  type: AttachmentType;

  /**
   * Nombre original del archivo
   */
  @ApiProperty({
    description: 'Nombre original del archivo',
    example: 'mi_proyecto_matematicas.pdf',
  })
  originalName: string;

  /**
   * Tamaño del archivo
   */
  @ApiProperty({
    description: 'Tamaño del archivo en bytes',
    example: 2048576,
  })
  size: number;

  /**
   * Tamaño formateado
   */
  @ApiProperty({
    description: 'Tamaño del archivo en formato legible',
    example: '2.00 MB',
  })
  formattedSize: string;

  /**
   * Tipo MIME
   */
  @ApiProperty({
    description: 'Tipo MIME del archivo',
    example: 'application/pdf',
  })
  mimeType: string;

  /**
   * URL del thumbnail
   */
  @ApiPropertyOptional({
    description: 'URL del thumbnail si está disponible',
    example: '/uploads/thumbnails/2024/12/08/abc123def456_thumb.jpg',
  })
  thumbnailUrl?: string;

  /**
   * Contador de descargas
   */
  @ApiProperty({
    description: 'Número de veces que se ha descargado el archivo',
    example: 15,
  })
  downloadCount: number;

  /**
   * Indica si es una imagen
   */
  @ApiProperty({
    description: 'Verdadero si el archivo es una imagen',
    example: false,
  })
  isImage: boolean;

  /**
   * Indica si es un video
   */
  @ApiProperty({
    description: 'Verdadero si el archivo es un video',
    example: false,
  })
  isVideo: boolean;

  /**
   * Indica si es seguro para descargar
   */
  @ApiProperty({
    description: 'Verdadero si el archivo es seguro para descargar',
    example: true,
  })
  isSafe: boolean;

  /**
   * Indica si ha expirado
   */
  @ApiProperty({
    description: 'Verdadero si el archivo ha expirado',
    example: false,
  })
  isExpired: boolean;

  /**
   * Icono del archivo
   */
  @ApiProperty({
    description: 'Emoji representativo del tipo de archivo',
    example: '📄',
  })
  icon: string;

  /**
   * Fecha de creación
   */
  @ApiProperty({
    description: 'Timestamp de subida del archivo',
    example: '2024-12-08T15:30:45Z',
  })
  createdAt: Date;

  /**
   * Metadatos del archivo
   */
  @ApiPropertyOptional({
    description: 'Metadatos específicos del archivo',
    example: {
      image: {
        width: 1920,
        height: 1080,
        format: 'JPEG'
      }
    },
  })
  metadata?: Record<string, unknown>;
}