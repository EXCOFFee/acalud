import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsOptional,
  IsHexColor,
  IsUrl,
  IsObject,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsEnum,
  Matches,
  IsEmail,
} from 'class-validator';
import { Transform } from 'class-transformer';

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
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres' })
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
  settings?: Record<string, unknown>;

  @ApiProperty({
    description: 'Estado activo del aula',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  isActive?: boolean;

  @ApiProperty({
    description: 'Listado de etiquetas para clasificar el aula (máximo 10)',
    example: ['programación', 'algoritmos'],
    required: false,
  })
  @IsOptional() // Indica que este campo no es obligatorio al actualizar
  @IsArray({ message: 'Las etiquetas deben recibirse como una lista' }) // Obliga a que la entrada sea un arreglo
  @IsString({ each: true, message: 'Cada etiqueta debe escribirse como texto' }) // Valida cada elemento del arreglo individualmente
  @ArrayMaxSize(10, { message: 'No se pueden registrar más de 10 etiquetas' }) // Restringe la cantidad máxima de etiquetas
  @ArrayUnique({ message: 'No se permiten etiquetas repetidas' }) // Evita valores duplicados en la lista
  @Transform(({ value }) => value
    ? Array.from(new Set(value.slice(0, 10).map((tag: string) => tag.trim().toLowerCase()))) // Normalizamos datos y removemos duplicados
    : value)
  tags?: string[];

  @ApiProperty({
    description: 'Nivel de dificultad del aula',
    enum: ['básico', 'intermedio', 'avanzado'],
    required: false,
  })
  @IsOptional() // Permite omitir la actualización del nivel
  @IsEnum(['básico', 'intermedio', 'avanzado'], { message: 'El nivel debe ser básico, intermedio o avanzado' }) // Valida contra la lista permitida
  level?: 'básico' | 'intermedio' | 'avanzado';

  @ApiProperty({
    description: 'Zona horaria principal del aula',
    example: 'America/Argentina/Buenos_Aires',
    required: false,
  })
  @IsOptional() // Permite que la zona horaria no se actualice si no se envía
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+$/, { message: 'La zona horaria debe tener el formato Región/Ciudad' }) // Aplica una validación básica de formato TZ
  timezone?: string;

  @ApiProperty({
    description: 'Idioma en el que se dicta el aula',
    enum: ['es', 'en', 'fr', 'pt'],
    required: false,
  })
  @IsOptional() // Permite omitir el idioma en la actualización
  @IsEnum(['es', 'en', 'fr', 'pt'], { message: 'El idioma debe ser es, en, fr o pt' }) // Limita el valor a los idiomas soportados
  language?: 'es' | 'en' | 'fr' | 'pt';

  @ApiProperty({
    description: 'Correos de estudiantes para invitar desde la edición (máximo 20)',
    example: ['nuevo.estudiante@colegio.edu'],
    required: false,
  })
  @IsOptional() // Permite que no se envíen correos en la actualización
  @IsArray({ message: 'Las invitaciones deben enviarse como lista de correos' }) // Exige que sea un arreglo
  @IsEmail({}, { each: true, message: 'Cada invitación debe contener un correo válido' }) // Valida que cada elemento sea un correo real
  @ArrayMaxSize(20, { message: 'No se pueden enviar más de 20 invitaciones por actualización' }) // Controla el límite de envíos
  @ArrayUnique({ message: 'Las invitaciones no deben repetirse' }) // Evita correos duplicados
  @Transform(({ value }) => value
    ? Array.from(new Set(value.slice(0, 20).map((email: string) => email.trim().toLowerCase()))) // Sanitiza correos y evita duplicados
    : value)
  invitedStudentEmails?: string[];
}
