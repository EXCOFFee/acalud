import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsEnum,
  IsObject,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { AchievementType, AchievementCategory, AchievementRarity } from '../achievement.entity';

/**
 * DTO para la creación de un nuevo logro
 * Define la estructura y validaciones para crear achievements en el sistema
 */
export class CreateAchievementDto {
  @ApiProperty({
    description: 'Título del logro',
    example: 'Primer Quiz Completado',
    maxLength: 100,
  })
  @IsString({ message: 'El título debe ser un texto' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(100, { message: 'El título no puede exceder 100 caracteres' })
  title: string;

  @ApiProperty({
    description: 'Descripción detallada del logro',
    example: 'Completa tu primer quiz con éxito',
    maxLength: 500,
  })
  @IsString({ message: 'La descripción debe ser un texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  description: string;

  @ApiProperty({
    description: 'Identificador único del logro para referencia en código',
    example: 'first_quiz_completed',
    maxLength: 50,
  })
  @IsString({ message: 'El identificador debe ser un texto' })
  @IsNotEmpty({ message: 'El identificador es obligatorio' })
  @MaxLength(50, { message: 'El identificador no puede exceder 50 caracteres' })
  @Matches(/^[a-z0-9_]+$/, {
    message: 'El identificador solo puede contener letras minúsculas, números y guiones bajos',
  })
  identifier: string;

  @ApiProperty({
    description: 'Icono del logro (URL o nombre del icono)',
    example: 'trophy-quiz.svg',
    maxLength: 255,
  })
  @IsString({ message: 'El icono debe ser un texto' })
  @IsNotEmpty({ message: 'El icono es obligatorio' })
  @MaxLength(255, { message: 'El icono no puede exceder 255 caracteres' })
  icon: string;

  @ApiProperty({
    enum: AchievementType,
    description: 'Tipo de logro',
    example: AchievementType.ACTIVITIES_COMPLETED,
  })
  @IsEnum(AchievementType, {
    message: 'El tipo debe ser un valor válido de AchievementType',
  })
  type: AchievementType;

  @ApiProperty({
    enum: AchievementCategory,
    description: 'Categoría del logro',
    example: AchievementCategory.BEGINNER,
  })
  @IsEnum(AchievementCategory, {
    message: 'La categoría debe ser: beginner, intermediate, advanced o master',
  })
  category: AchievementCategory;

  @ApiProperty({
    enum: AchievementRarity,
    description: 'Rareza del logro',
    example: AchievementRarity.COMMON,
  })
  @IsEnum(AchievementRarity, {
    message: 'La rareza debe ser: common, rare, epic o legendary',
  })
  rarity: AchievementRarity;

  @ApiProperty({
    description: 'Criterios específicos para desbloquear el logro',
    example: {
      count: 5,
      subject: 'Mathematics',
      minScore: 80,
    },
  })
  @IsObject({ message: 'Los criterios deben ser un objeto JSON válido' })
  @IsNotEmpty({ message: 'Los criterios son obligatorios' })
  criteria: Record<string, any>;

  @ApiProperty({
    description: 'Puntos otorgados por el logro',
    example: 50,
    minimum: 1,
    maximum: 1000,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Los puntos deben ser un número' })
  @Min(1, { message: 'Los puntos mínimos son 1' })
  points?: number;

  @ApiProperty({
    description: 'Recompensas otorgadas por el logro',
    example: {
      coins: 100,
      experience: 250,
      items: ['special_badge_001'],
    },
  })
  @IsObject({ message: 'Las recompensas deben ser un objeto JSON válido' })
  @IsNotEmpty({ message: 'Las recompensas son obligatorias' })
  rewards: {
    coins: number;
    experience: number;
    items?: string[];
  };

  @ApiProperty({
    description: 'Requisitos para el logro (formato legacy)',
    example: {
      type: 'activities_completed',
      value: 5,
      subject: 'Mathematics',
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Los requisitos deben ser un objeto JSON válido' })
  requirement?: {
    type: 'activities_completed' | 'score_achieved' | 'streak_days' | 'coins_earned';
    value: number;
    subject?: string;
  };

  @ApiProperty({
    description: 'Recompensas del logro (formato legacy)',
    example: {
      coins: 100,
      experience: 250,
    },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Las recompensas legacy deben ser un objeto JSON válido' })
  reward?: {
    coins: number;
    experience: number;
  };

  @ApiProperty({
    description: 'Indica si el logro está activo',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive?: boolean;
}
