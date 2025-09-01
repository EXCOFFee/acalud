import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsUUID,
  IsDateString,
  IsInt,
} from 'class-validator';
import { ActivityType, DifficultyLevel } from '../activity.entity';

/**
 * DTO para la creación de una nueva actividad
 * Define la estructura y validaciones para los datos de entrada
 */
export class CreateActivityDto {
  @ApiProperty({
    description: 'Título de la actividad',
    example: 'Tabla de multiplicar del 7',
    maxLength: 100,
  })
  @IsString({ message: 'El título debe ser un texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(100, { message: 'El título no puede exceder 100 caracteres' })
  title: string;

  @ApiProperty({
    description: 'Descripción detallada de la actividad',
    example: 'Practica la tabla de multiplicar del 7 con ejercicios interactivos',
    maxLength: 500,
  })
  @IsString({ message: 'La descripción debe ser un texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description: string;

  @ApiProperty({
    enum: ActivityType,
    description: 'Tipo de actividad',
    example: ActivityType.QUIZ,
  })
  @IsEnum(ActivityType, {
    message: 'El tipo debe ser: quiz, game, assignment, interactive, drag-drop o memory',
  })
  type: ActivityType;

  @ApiProperty({
    enum: DifficultyLevel,
    description: 'Nivel de dificultad',
    example: DifficultyLevel.MEDIUM,
  })
  @IsEnum(DifficultyLevel, {
    message: 'La dificultad debe ser: easy, medium, hard o expert',
  })
  difficulty: DifficultyLevel;

  @ApiProperty({
    description: 'Materia de la actividad',
    example: 'Matemáticas',
    maxLength: 50,
  })
  @IsString({ message: 'La materia debe ser un texto' })
  @IsNotEmpty({ message: 'La materia es obligatoria' })
  @MaxLength(50, { message: 'La materia no puede exceder 50 caracteres' })
  subject: string;

  @ApiProperty({
    description: 'ID del aula a la que pertenece la actividad',
    example: 'e7f4c8a2-1b2c-4d5e-8f9a-123456789abc',
  })
  @IsUUID('4', { message: 'El ID del aula debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del aula es obligatorio' })
  classroomId: string;

  @ApiProperty({
    description: 'Contenido de la actividad (preguntas, opciones, instrucciones, etc.)',
    example: {
      questions: [
        {
          id: 1,
          question: '¿Cuánto es 7 x 8?',
          options: ['54', '56', '58', '60'],
          correctAnswer: 1,
          points: 10,
        },
      ],
      instructions: 'Selecciona la respuesta correcta para cada pregunta',
    },
  })
  @IsObject({ message: 'El contenido debe ser un objeto JSON válido' })
  @IsNotEmpty({ message: 'El contenido es obligatorio' })
  content: Record<string, any>;

  @ApiProperty({
    description: 'Recompensas por completar la actividad',
    example: {
      coins: 50,
      experience: 100,
      achievements: ['first_quiz_completed'],
    },
  })
  @IsObject({ message: 'Las recompensas deben ser un objeto JSON válido' })
  @IsNotEmpty({ message: 'Las recompensas son obligatorias' })
  rewards: {
    coins: number;
    experience: number;
    achievements?: string[];
  };

  @ApiProperty({
    description: 'Etiquetas para categorización',
    example: ['multiplicación', 'tabla del 7', 'matemáticas básicas'],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Las etiquetas deben ser un array' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser un texto' })
  tags?: string[];

  @ApiProperty({
    description: 'Tiempo estimado en minutos',
    example: 15,
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
    example: 100,
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
    example: 3,
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
    example: false,
    required: false,
  })
  @IsOptional()
  isPublic?: boolean;

  @ApiProperty({
    description: 'Configuraciones adicionales de la actividad',
    example: {
      shuffleQuestions: true,
      showCorrectAnswers: false,
      allowSkip: true,
      timeLimit: 300,
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Las configuraciones deben ser un objeto JSON válido' })
  settings?: Record<string, any>;
}
