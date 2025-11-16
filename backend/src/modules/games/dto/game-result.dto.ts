/**
 * 🏆 DTOs PARA RESULTADOS DE JUEGOS
 * 
 * Data Transfer Objects para la gestión de resultados y estadísticas de juegos.
 * Incluye DTOs para crear, actualizar y consultar resultados de partidas.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Importar enums
import { GameResultStatus, CompletionType } from '../entities/game-result.entity';

// =============================================================================
// DTOs PARA ANÁLISIS DE RESPUESTAS
// =============================================================================

/**
 * 📝 DTO para análisis de respuesta individual
 */
export class AnswerAnalysisDto {
  @ApiProperty({ description: 'ID de la pregunta' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ description: 'Texto de la pregunta' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ description: 'Respuesta del usuario' })
  @IsString()
  userAnswer: string;

  @ApiProperty({ description: 'Respuesta correcta' })
  @IsString()
  correctAnswer: string;

  @ApiProperty({ description: 'Es respuesta correcta' })
  @IsBoolean()
  isCorrect: boolean;

  @ApiProperty({ description: 'Tiempo de respuesta en segundos', minimum: 0 })
  @IsNumber()
  @Min(0)
  responseTime: number;

  @ApiProperty({ description: 'Número de intentos', minimum: 1 })
  @IsInt()
  @Min(1)
  attempts: number;

  @ApiProperty({ description: 'Pistas utilizadas', minimum: 0 })
  @IsInt()
  @Min(0)
  hintsUsed: number;

  @ApiProperty({ description: 'Nivel de confianza (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  confidence: number;

  @ApiProperty({ description: 'Tema de la pregunta' })
  @IsString()
  topic: string;

  @ApiProperty({ description: 'Dificultad de la pregunta' })
  @IsString()
  difficulty: string;
}

/**
 * 🏆 DTO para logro obtenido
 */
export class AchievementEarnedDto {
  @ApiProperty({ description: 'ID del logro' })
  @IsString()
  @IsNotEmpty()
  achievementId: string;

  @ApiProperty({ description: 'Nombre del logro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Descripción del logro' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Puntos otorgados', minimum: 0 })
  @IsInt()
  @Min(0)
  points: number;

  @ApiProperty({ description: 'Rareza del logro', enum: ['common', 'rare', 'epic', 'legendary'] })
  @IsEnum(['common', 'rare', 'epic', 'legendary'])
  rarity: 'common' | 'rare' | 'epic' | 'legendary';

  @ApiProperty({ description: 'Fecha de desbloqueo' })
  @IsDateString()
  unlockedAt: Date;
}

/**
 * 📊 DTO para métricas de sesión de juego
 */
export class GameSessionMetricsDto {
  @ApiProperty({ description: 'Tiempo total en segundos', minimum: 0 })
  @IsNumber()
  @Min(0)
  totalTime: number;

  @ApiProperty({ description: 'Tiempo activo en segundos', minimum: 0 })
  @IsNumber()
  @Min(0)
  activeTime: number;

  @ApiProperty({ description: 'Tiempo en pausa en segundos', minimum: 0 })
  @IsNumber()
  @Min(0)
  pauseTime: number;

  @ApiProperty({ description: 'Tiempo promedio de respuesta en segundos', minimum: 0 })
  @IsNumber()
  @Min(0)
  averageResponseTime: number;

  @ApiProperty({ description: 'Total de clics/toques', minimum: 0 })
  @IsInt()
  @Min(0)
  totalClicks: number;

  @ApiProperty({ description: 'Total de teclas presionadas', minimum: 0 })
  @IsInt()
  @Min(0)
  totalKeystrokes: number;

  @ApiProperty({ description: 'Pistas utilizadas', minimum: 0 })
  @IsInt()
  @Min(0)
  hintsUsed: number;

  @ApiProperty({ description: 'Solicitudes de ayuda', minimum: 0 })
  @IsInt()
  @Min(0)
  helpRequests: number;

  @ApiProperty({ description: 'Preguntas respondidas', minimum: 0 })
  @IsInt()
  @Min(0)
  questionsAnswered: number;

  @ApiProperty({ description: 'Respuestas correctas', minimum: 0 })
  @IsInt()
  @Min(0)
  correctAnswers: number;

  @ApiProperty({ description: 'Respuestas incorrectas', minimum: 0 })
  @IsInt()
  @Min(0)
  incorrectAnswers: number;

  @ApiProperty({ description: 'Preguntas omitidas', minimum: 0 })
  @IsInt()
  @Min(0)
  skippedQuestions: number;

  @ApiProperty({ description: 'Tasa de precisión (%)', minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  accuracyRate: number;

  @ApiProperty({ description: 'Mejor racha de aciertos', minimum: 0 })
  @IsInt()
  @Min(0)
  streakBest: number;

  @ApiProperty({ description: 'Racha actual', minimum: 0 })
  @IsInt()
  @Min(0)
  streakCurrent: number;

  @ApiProperty({ description: 'Progresión de dificultad', type: [String] })
  @IsArray()
  @IsString({ each: true })
  difficultyProgression: string[];
}

// =============================================================================
// DTOs PRINCIPALES DE RESULTADO
// =============================================================================

/**
 * 🎯 DTO para crear resultado de juego
 */
export class CreateGameResultDto {
  @ApiProperty({ description: 'ID del juego' })
  @IsUUID()
  gameId: string;

  @ApiProperty({ description: 'Estado del resultado', enum: GameResultStatus })
  @IsEnum(GameResultStatus)
  status: GameResultStatus;

  @ApiPropertyOptional({ description: 'Tipo de completitud', enum: CompletionType })
  @IsOptional()
  @IsEnum(CompletionType)
  completionType?: CompletionType;

  @ApiProperty({ description: 'Puntuación obtenida', minimum: 0 })
  @IsInt()
  @Min(0)
  score: number;

  @ApiProperty({ description: 'Puntuación máxima posible', minimum: 1 })
  @IsInt()
  @Min(1)
  maxScore: number;

  @ApiProperty({ description: 'Tiempo empleado en segundos', minimum: 0 })
  @IsInt()
  @Min(0)
  timeSpent: number;

  @ApiPropertyOptional({ description: 'Tiempo límite en segundos', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimit?: number;

  @ApiPropertyOptional({ description: 'Número de intento', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  attemptNumber?: number = 1;

  @ApiProperty({ description: 'Juego completado' })
  @IsBoolean()
  completed: boolean;

  @ApiProperty({ description: 'Aprobado (score >= passingScore)' })
  @IsBoolean()
  passed: boolean;

  @ApiPropertyOptional({ description: 'Puntuación perfecta' })
  @IsOptional()
  @IsBoolean()
  perfectScore?: boolean = false;

  @ApiPropertyOptional({ description: 'Mejor racha de aciertos', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bestStreak?: number = 0;

  @ApiPropertyOptional({ description: 'Monedas ganadas', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  coinsEarned?: number = 0;

  @ApiPropertyOptional({ description: 'Experiencia ganada', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  experienceGained?: number = 0;

  @ApiPropertyOptional({ description: 'Nivel antes de jugar', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  levelBefore?: number = 1;

  @ApiPropertyOptional({ description: 'Nivel después de jugar', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  levelAfter?: number = 1;

  @ApiProperty({ description: 'Dificultad jugada' })
  @IsString()
  @IsNotEmpty()
  difficulty: string;

  @ApiProperty({ description: 'Modo de juego utilizado' })
  @IsString()
  @IsNotEmpty()
  gameMode: string;

  @ApiPropertyOptional({ description: 'Plataforma/dispositivo usado' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: 'User Agent del navegador' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Métricas detalladas de la sesión' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GameSessionMetricsDto)
  metrics?: GameSessionMetricsDto;

  @ApiPropertyOptional({ description: 'Análisis detallado de respuestas', type: [AnswerAnalysisDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerAnalysisDto)
  answerAnalysis?: AnswerAnalysisDto[];

  @ApiPropertyOptional({ description: 'Logros desbloqueados', type: [AchievementEarnedDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AchievementEarnedDto)
  achievementsEarned?: AchievementEarnedDto[];

  @ApiPropertyOptional({ description: 'Datos específicos del tipo de juego' })
  @IsOptional()
  @IsObject()
  gameSpecificData?: any;

  @ApiPropertyOptional({ description: 'Comentario del jugador' })
  @IsOptional()
  @IsString()
  playerComment?: string;

  @ApiPropertyOptional({ description: 'Calificación del juego (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  gameRating?: number;

  @ApiPropertyOptional({ description: 'Número de pausas', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  pauseCount?: number = 0;

  @ApiPropertyOptional({ description: 'Pistas utilizadas', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  hintsUsed?: number = 0;

  @ApiPropertyOptional({ description: 'Ayudas solicitadas', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  helpRequests?: number = 0;

  @ApiPropertyOptional({ description: 'ID de sesión multijugador' })
  @IsOptional()
  @IsUUID()
  multiplayerSessionId?: string;

  @ApiPropertyOptional({ description: 'Posición en ranking multijugador', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  rankPosition?: number;

  @ApiProperty({ description: 'Fecha de inicio de la partida' })
  @IsDateString()
  startedAt: Date;

  @ApiPropertyOptional({ description: 'Fecha de finalización' })
  @IsOptional()
  @IsDateString()
  finishedAt?: Date;
}

/**
 * ✏️ DTO para actualizar resultado de juego
 */
export class UpdateGameResultDto {
  @ApiPropertyOptional({ description: 'Estado del resultado', enum: GameResultStatus })
  @IsOptional()
  @IsEnum(GameResultStatus)
  status?: GameResultStatus;

  @ApiPropertyOptional({ description: 'Tipo de completitud', enum: CompletionType })
  @IsOptional()
  @IsEnum(CompletionType)
  completionType?: CompletionType;

  @ApiPropertyOptional({ description: 'Puntuación obtenida', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @ApiPropertyOptional({ description: 'Tiempo empleado en segundos', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSpent?: number;

  @ApiPropertyOptional({ description: 'Juego completado' })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({ description: 'Aprobado' })
  @IsOptional()
  @IsBoolean()
  passed?: boolean;

  @ApiPropertyOptional({ description: 'Puntuación perfecta' })
  @IsOptional()
  @IsBoolean()
  perfectScore?: boolean;

  @ApiPropertyOptional({ description: 'Mejor racha de aciertos', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bestStreak?: number;

  @ApiPropertyOptional({ description: 'Monedas ganadas', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  coinsEarned?: number;

  @ApiPropertyOptional({ description: 'Experiencia ganada', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  experienceGained?: number;

  @ApiPropertyOptional({ description: 'Nivel después de jugar', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  levelAfter?: number;

  @ApiPropertyOptional({ description: 'Métricas actualizadas' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GameSessionMetricsDto)
  metrics?: GameSessionMetricsDto;

  @ApiPropertyOptional({ description: 'Análisis de respuestas actualizado', type: [AnswerAnalysisDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerAnalysisDto)
  answerAnalysis?: AnswerAnalysisDto[];

  @ApiPropertyOptional({ description: 'Logros adicionales desbloqueados', type: [AchievementEarnedDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AchievementEarnedDto)
  achievementsEarned?: AchievementEarnedDto[];

  @ApiPropertyOptional({ description: 'Datos específicos del juego actualizados' })
  @IsOptional()
  @IsObject()
  gameSpecificData?: any;

  @ApiPropertyOptional({ description: 'Comentario del jugador' })
  @IsOptional()
  @IsString()
  playerComment?: string;

  @ApiPropertyOptional({ description: 'Calificación del juego (1-5)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  gameRating?: number;

  @ApiPropertyOptional({ description: 'Fecha de finalización' })
  @IsOptional()
  @IsDateString()
  finishedAt?: Date;
}

// =============================================================================
// DTOs DE CONSULTA Y FILTROS
// =============================================================================

/**
 * 🔍 DTO para filtrar resultados de juegos
 */
export class GameResultFilterDto {
  @ApiPropertyOptional({ description: 'ID del juego' })
  @IsOptional()
  @IsUUID()
  gameId?: string;

  @ApiPropertyOptional({ description: 'ID del usuario' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Estado del resultado', enum: GameResultStatus })
  @IsOptional()
  @IsEnum(GameResultStatus)
  status?: GameResultStatus;

  @ApiPropertyOptional({ description: 'Solo juegos completados' })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({ description: 'Solo juegos aprobados' })
  @IsOptional()
  @IsBoolean()
  passed?: boolean;

  @ApiPropertyOptional({ description: 'Solo puntuaciones perfectas' })
  @IsOptional()
  @IsBoolean()
  perfectScore?: boolean;

  @ApiPropertyOptional({ description: 'Puntuación mínima', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minScore?: number;

  @ApiPropertyOptional({ description: 'Puntuación máxima', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Dificultad jugada' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Modo de juego' })
  @IsOptional()
  @IsString()
  gameMode?: string;

  @ApiPropertyOptional({ description: 'Fecha de inicio desde' })
  @IsOptional()
  @IsDateString()
  startedFrom?: Date;

  @ApiPropertyOptional({ description: 'Fecha de inicio hasta' })
  @IsOptional()
  @IsDateString()
  startedTo?: Date;

  @ApiPropertyOptional({ description: 'Ordenar por campo', enum: ['score', 'timeSpent', 'startedAt', 'createdAt'] })
  @IsOptional()
  @IsString()
  sortBy?: 'score' | 'timeSpent' | 'startedAt' | 'createdAt';

  @ApiPropertyOptional({ description: 'Orden de clasificación', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Página actual', minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Elementos por página', minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}

// =============================================================================
// DTOs DE RESPUESTA
// =============================================================================

/**
 * 🏆 DTO de respuesta para resultado de juego
 */
export class GameResultResponseDto {
  @ApiProperty({ description: 'ID único del resultado' })
  id: string;

  @ApiProperty({ description: 'ID del juego' })
  gameId: string;

  @ApiProperty({ description: 'ID del usuario' })
  userId: string;

  @ApiProperty({ description: 'Estado del resultado', enum: GameResultStatus })
  status: GameResultStatus;

  @ApiProperty({ description: 'Tipo de completitud', enum: CompletionType })
  completionType: CompletionType;

  @ApiProperty({ description: 'Puntuación obtenida' })
  score: number;

  @ApiProperty({ description: 'Puntuación máxima posible' })
  maxScore: number;

  @ApiProperty({ description: 'Porcentaje de acierto' })
  accuracyPercentage: number;

  @ApiProperty({ description: 'Tiempo empleado en segundos' })
  timeSpent: number;

  @ApiProperty({ description: 'Tiempo límite en segundos' })
  timeLimit: number;

  @ApiProperty({ description: 'Número de intento' })
  attemptNumber: number;

  @ApiProperty({ description: 'Juego completado' })
  completed: boolean;

  @ApiProperty({ description: 'Aprobado' })
  passed: boolean;

  @ApiProperty({ description: 'Puntuación perfecta' })
  perfectScore: boolean;

  @ApiProperty({ description: 'Mejor racha de aciertos' })
  bestStreak: number;

  @ApiProperty({ description: 'Monedas ganadas' })
  coinsEarned: number;

  @ApiProperty({ description: 'Experiencia ganada' })
  experienceGained: number;

  @ApiProperty({ description: 'Nivel antes de jugar' })
  levelBefore: number;

  @ApiProperty({ description: 'Nivel después de jugar' })
  levelAfter: number;

  @ApiProperty({ description: 'Dificultad jugada' })
  difficulty: string;

  @ApiProperty({ description: 'Modo de juego' })
  gameMode: string;

  @ApiProperty({ description: 'Plataforma utilizada' })
  platform: string;

  @ApiProperty({ description: 'Métricas de la sesión' })
  metrics: any;

  @ApiProperty({ description: 'Análisis de respuestas' })
  answerAnalysis: any[];

  @ApiProperty({ description: 'Logros desbloqueados' })
  achievementsEarned: any[];

  @ApiProperty({ description: 'Comentario del jugador' })
  playerComment: string;

  @ApiProperty({ description: 'Calificación del juego' })
  gameRating: number;

  @ApiProperty({ description: 'Número de pausas' })
  pauseCount: number;

  @ApiProperty({ description: 'Pistas utilizadas' })
  hintsUsed: number;

  @ApiProperty({ description: 'Ayudas solicitadas' })
  helpRequests: number;

  @ApiProperty({ description: 'Fecha de inicio' })
  startedAt: Date;

  @ApiProperty({ description: 'Fecha de finalización' })
  finishedAt: Date;

  @ApiProperty({ description: 'Nivel de rendimiento' })
  performanceLevel: string;

  @ApiProperty({ description: 'Es resultado excepcional' })
  isExceptional: boolean;

  @ApiProperty({ description: 'Resumen de rendimiento' })
  performanceSummary: any;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt: Date;
}

/**
 * 📃 DTO de respuesta paginada para resultados
 */
export class GameResultPaginatedResponseDto {
  @ApiProperty({ description: 'Lista de resultados', type: [GameResultResponseDto] })
  data: GameResultResponseDto[];

  @ApiProperty({ description: 'Total de elementos' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Elementos por página' })
  limit: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages: number;

  @ApiProperty({ description: 'Hay página siguiente' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Hay página anterior' })
  hasPrevPage: boolean;
}