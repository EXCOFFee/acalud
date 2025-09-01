import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsOptional,
  IsHexColor,
  IsUrl,
  IsObject,
  IsBoolean,
} from 'class-validator';

/**
 * DTO para la actualización de datos de un aula
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export class UpdateClassroomDto {
  @ApiProperty({
    description: 'Nombre del aula',
    example: 'Matemáticas Avanzadas - Actualizado',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name?: string;

  @ApiProperty({
    description: 'Descripción detallada del aula',
    example: 'Curso actualizado de matemáticas con nuevos temas incluidos',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;

  @ApiProperty({
    description: 'Materia o asignatura del aula',
    example: 'Matemáticas Aplicadas',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La materia debe ser un texto' })
  @MaxLength(50, { message: 'La materia no puede exceder 50 caracteres' })
  subject?: string;

  @ApiProperty({
    description: 'Grado o curso del aula',
    example: '11° Grado',
    maxLength: 20,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El grado debe ser un texto' })
  @MaxLength(20, { message: 'El grado no puede exceder 20 caracteres' })
  grade?: string;

  @ApiProperty({
    description: 'Color del aula para identificación visual (formato hexadecimal)',
    example: '#10b981',
    required: false,
  })
  @IsOptional()
  @IsHexColor({ message: 'El color debe ser un código hexadecimal válido (ej: #10b981)' })
  color?: string;

  @ApiProperty({
    description: 'URL de la imagen de portada del aula',
    example: 'https://ejemplo.com/nueva-portada.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  @MaxLength(500, { message: 'La URL de la imagen no puede exceder 500 caracteres' })
  coverImage?: string;

  @ApiProperty({
    description: 'Configuraciones específicas del aula (JSON)',
    example: {
      allowLateSubmissions: false,
      maxAttempts: 5,
      showLeaderboard: true,
      enableNotifications: false,
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Las configuraciones deben ser un objeto JSON válido' })
  settings?: Record<string, any>;

  @ApiProperty({
    description: 'Estado activo del aula',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  isActive?: boolean;
}
