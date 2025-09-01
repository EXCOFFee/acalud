import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsDateString,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { ActivityType, DifficultyLevel } from '../activity.entity';

/**
 * DTO para la actualización de una actividad
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export class UpdateActivityDto {
  @ApiProperty({
    description: 'Título de la actividad',
    example: 'Tabla de multiplicar del 7 - Actualizada',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El título debe ser un texto' })
  @MaxLength(100, { message: 'El título no puede exceder 100 caracteres' })
  title?: string;

  @ApiProperty({
    description: 'Descripción detallada de la actividad',
    example: 'Versión actualizada con más ejercicios interactivos',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description?: string;

  @ApiProperty({
    enum: ActivityType,
    description: 'Tipo de actividad',
    example: ActivityType.INTERACTIVE,
    required: false,
  })
  @IsOptional()
  @IsEnum(ActivityType, {
    message: 'El tipo debe ser: quiz, game, assignment, interactive, drag-drop o memory',
  })
  type?: ActivityType;

  @ApiProperty({
    enum: DifficultyLevel,
    description: 'Nivel de dificultad',
    example: DifficultyLevel.HARD,
    required: false,
  })
  @IsOptional()
  @IsEnum(DifficultyLevel, {
    message: 'La dificultad debe ser: easy, medium, hard o expert',
  })
  difficulty?: DifficultyLevel;

  @ApiProperty({
    description: 'Materia de la actividad',
    example: 'Matemáticas Avanzadas',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La materia debe ser un texto' })
  @MaxLength(50, { message: 'La materia no puede exceder 50 caracteres' })
  subject?: string;

  @ApiProperty({
    description: 'Contenido actualizado de la actividad',
    example: {
      questions: [
        {
          id: 1,
          question: '¿Cuánto es 7 x 9?',
          options: ['61', '63', '65', '67'],
          correctAnswer: 1,
          points: 15,
        },
      ],
      instructions: 'Nueva versión con preguntas más desafiantes',
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'El contenido debe ser un objeto JSON válido' })
  content?: Record<string, any>;

  @ApiProperty({
    description: 'Recompensas actualizadas por completar la actividad',
    example: {
      coins: 75,
      experience: 150,
      achievements: ['math_expert'],
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Las recompensas deben ser un objeto JSON válido' })
  rewards?: {
    coins: number;
    experience: number;
    achievements?: string[];
  };

  @ApiProperty({
    description: 'Etiquetas actualizadas para categorización',
    example: ['multiplicación', 'tabla del 7', 'matemáticas avanzadas'],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Las etiquetas deben ser un array' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser un texto' })
  tags?: string[];

  @ApiProperty({
    description: 'Tiempo estimado en minutos',
    example: 20,
    minimum: 1,
    maximum: 240,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El tiempo estimado debe ser un número' })
  @Min(1, { message: 'El tiempo mínimo es 1 minuto' })
  @Max(240, { message: 'El tiempo máximo es 240 minutos (4 horas)' })
  estimatedTime?: number;

  @ApiProperty({
    description: 'Experiencia base que se otorga por completar la actividad',
    example: 150,
    minimum: 10,
    maximum: 1000,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La experiencia base debe ser un número' })
  @Min(10, { message: 'La experiencia mínima es 10' })
  @Max(1000, { message: 'La experiencia máxima es 1000' })
  baseExperience?: number;

  @ApiProperty({
    description: 'Fecha límite para completar la actividad (formato ISO)',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha límite debe tener formato ISO válido' })
  dueDate?: string;

  @ApiProperty({
    description: 'Número máximo de intentos permitidos',
    example: 5,
    minimum: 1,
    maximum: 10,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'El número de intentos debe ser un entero' })
  @Min(1, { message: 'Debe permitir al menos 1 intento' })
  @Max(10, { message: 'No se pueden permitir más de 10 intentos' })
  maxAttempts?: number;

  @ApiProperty({
    description: 'Indica si la actividad es pública en el repositorio',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isPublic debe ser verdadero o falso' })
  isPublic?: boolean;

  @ApiProperty({
    description: 'Estado activo de la actividad',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive?: boolean;

  @ApiProperty({
    description: 'Configuraciones adicionales de la actividad',
    example: {
      shuffleQuestions: false,
      showCorrectAnswers: true,
      allowSkip: false,
      timeLimit: 600,
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Las configuraciones deben ser un objeto JSON válido' })
  settings?: Record<string, any>;
}
