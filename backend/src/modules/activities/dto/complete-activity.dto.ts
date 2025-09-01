import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsObject,
  IsOptional,
  IsInt,
} from 'class-validator';

/**
 * DTO para completar una actividad
 * Define la estructura para enviar respuestas y datos de completamiento
 */
export class CompleteActivityDto {
  @ApiProperty({
    description: 'Puntuación obtenida en la actividad (0-100)',
    example: 85,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber({}, { message: 'La puntuación debe ser un número' })
  @IsNotEmpty({ message: 'La puntuación es obligatoria' })
  @Min(0, { message: 'La puntuación mínima es 0' })
  @Max(100, { message: 'La puntuación máxima es 100' })
  score: number;

  @ApiProperty({
    description: 'Respuestas del estudiante en formato JSON',
    example: {
      question_1: 'B',
      question_2: 'A',
      question_3: 'D',
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-15T10:12:30Z',
    },
  })
  @IsObject({ message: 'Las respuestas deben ser un objeto JSON válido' })
  @IsNotEmpty({ message: 'Las respuestas son obligatorias' })
  answers: Record<string, any>;

  @ApiProperty({
    description: 'Tiempo gastado en completar la actividad (en segundos)',
    example: 750,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'El tiempo gastado debe ser un número entero' })
  @Min(1, { message: 'El tiempo mínimo es 1 segundo' })
  timeSpent?: number;

  @ApiProperty({
    description: 'Comentarios adicionales del estudiante',
    example: 'La actividad fue desafiante pero muy educativa',
    required: false,
  })
  @IsOptional()
  comments?: string;

  @ApiProperty({
    description: 'Datos adicionales del completamiento (interacciones, errores, etc.)',
    example: {
      incorrectAttempts: 2,
      hintsUsed: 1,
      questionsSkipped: 0,
      difficulty_perception: 'medium',
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Los datos adicionales deben ser un objeto JSON válido' })
  additionalData?: Record<string, any>;
}
